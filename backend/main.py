from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3
import hashlib
import asyncio
import os
from datetime import datetime

app = FastAPI(title="MedAssist AI API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = "medassist.db"


def hash_password(pw: str) -> str:
    """Simple SHA-256 hash – replace with bcrypt in production."""
    return hashlib.sha256(pw.encode()).hexdigest()


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id       INTEGER PRIMARY KEY AUTOINCREMENT,
            name     TEXT    NOT NULL,
            email    TEXT    UNIQUE NOT NULL,
            password TEXT    NOT NULL
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS reports (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            doctor_id   INTEGER,
            transcript  TEXT,
            summary     TEXT,
            suggestions TEXT,
            created_at  TEXT
        )
    """)

    # Seed demo user (hashed password)
    demo_hash = hash_password("password123")
    try:
        cur.execute(
            "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
            ("Dr. HAREESH", "doctor@clinic.com", demo_hash)
        )
    except sqlite3.IntegrityError:
        pass  # Already exists

    conn.commit()
    conn.close()


init_db()


# ── Pydantic Models ──────────────────────────────────────
class LoginData(BaseModel):
    email: str
    password: str


class TranscriptData(BaseModel):
    text: str


# ── Routes ───────────────────────────────────────────────
@app.get("/api/health")
async def health():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}


@app.post("/api/login")
async def login(data: LoginData):
    conn = get_db()
    cur  = conn.cursor()
    cur.execute("SELECT id, name, email FROM users WHERE email=? AND password=?",
                (data.email.strip().lower(), hash_password(data.password)))
    user = cur.fetchone()
    conn.close()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    return {
        "status": "success",
        "user": {"id": user["id"], "name": user["name"], "email": user["email"]}
    }


@app.post("/api/upload-audio")
async def upload_audio(file: UploadFile = File(...)):
    """
    Simulates Whisper/Google STT processing.
    In production: send file bytes to STT service and return real transcript.
    """
    await asyncio.sleep(2)  # Non-blocking simulated delay

    return {
        "status": "success",
        "filename": file.filename,
        "transcript": (
            "Doctor: Please describe your symptoms. "
            "Patient: I have been feeling very weak and have a persistent dry cough "
            "for the last four days. My chest feels slightly heavy. "
            "I also have a mild fever since yesterday."
        )
    }


@app.post("/api/process-consultation")
async def process_consultation(data: TranscriptData):
    """
    AI-powered symptom extraction and report generation.
    In production: replace rule logic with an LLM call (Gemini / GPT-4).
    """
    await asyncio.sleep(1)  # Non-blocking

    text = data.text.lower()

    # --- Symptom → Report mapping ---
    if "chest pain" in text or "heart" in text:
        summary = (
            "CRITICAL: Patient reported chest pain and/or cardiac symptoms. "
            "Immediate ECG and troponin panel required. Do not delay assessment."
        )
        suggestions = [
            "Stat 12-lead ECG",
            "Troponin I / T panel",
            "Refer urgently to Cardiology",
            "Oxygen saturation monitoring",
            "IV access and BP monitoring"
        ]
    elif "fever" in text or "jwar" in text or "jwaram" in text or "bukhar" in text:
        summary = (
            "Patient presents with history of fever. Suspected viral or bacterial origin. "
            "Recommend CBC and peripheral smear to rule out malaria/dengue in endemic regions."
        )
        suggestions = [
            "Paracetamol 500mg SOS",
            "Complete Blood Count (CBC)",
            "Peripheral Blood Smear",
            "Adequate hydration",
            "Monitor temperature every 4 hours"
        ]
    elif "cough" in text or "khansi" in text or "daggulu" in text:
        summary = (
            "Patient presents with a persistent cough. Suspected upper respiratory tract infection. "
            "Chest X-ray recommended if symptoms persist beyond 7 days."
        )
        suggestions = [
            "Cough suppressant (Dextromethorphan)",
            "Steam inhalation TID",
            "Chest X-Ray if no improvement in 7 days",
            "Throat swab culture if exudative"
        ]
    elif "diabetes" in text or "sugar" in text or "madhumeham" in text:
        summary = (
            "Patient reports concerns related to diabetes / blood glucose levels. "
            "Fasting and post-prandial glucose, HbA1c assessment recommended."
        )
        suggestions = [
            "Fasting Blood Sugar (FBS)",
            "HbA1c",
            "Dietary counselling",
            "Metformin review if applicable"
        ]
    elif "weak" in text or "kamzori" in text or "nirasam" in text or "thak" in text:
        summary = (
            "Patient reports generalized weakness and fatigue. "
            "Systemic causes including anaemia, thyroid dysfunction, and vitamin deficiency should be excluded."
        )
        suggestions = [
            "CBC with differential",
            "Thyroid Function Test (TFT)",
            "Vitamin B12 and Vitamin D levels",
            "Adequate rest and nutrition"
        ]
    else:
        summary = (
            "General consultation for non-specific symptoms. "
            "Patient reports: " + data.text[:200] + ". "
            "Further history and physical examination recommended."
        )
        suggestions = [
            "Complete clinical examination",
            "Adequate hydration and rest",
            "Follow-up if symptoms worsen or persist > 3 days"
        ]

    # --- Save to DB ---
    conn = get_db()
    cur  = conn.cursor()
    cur.execute(
        "INSERT INTO reports (transcript, summary, suggestions, created_at) VALUES (?, ?, ?, ?)",
        (data.text, summary, " | ".join(suggestions), datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    )
    conn.commit()
    conn.close()

    return {
        "summary":     summary,
        "suggestions": suggestions,
        "timestamp":   datetime.now().isoformat()
    }


@app.get("/api/history")
async def get_history():
    conn = get_db()
    cur  = conn.cursor()
    cur.execute("""
        SELECT id, transcript, summary, suggestions, created_at
        FROM reports ORDER BY id DESC LIMIT 20
    """)
    rows = cur.fetchall()
    conn.close()

    return [
        {
            "id":         r["id"],
            "transcript": r["transcript"],
            "summary":    r["summary"],
            "suggestions": r["suggestions"],
            "date":       r["created_at"]
        }
        for r in rows
    ]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
