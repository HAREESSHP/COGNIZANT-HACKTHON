from fastapi import FastAPI, File, UploadFile, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3
import os
from datetime import datetime
import time

app = FastAPI(title="MedAssist AI API")

# Enable CORS for frontend interaction
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = "medassist.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    # Users table
    cursor.execute('''CREATE TABLE IF NOT EXISTS users 
                     (id INTEGER PRIMARY KEY, name TEXT, email TEXT UNIQUE, password TEXT)''')
    # Reports table
    cursor.execute('''CREATE TABLE IF NOT EXISTS reports 
                     (id INTEGER PRIMARY KEY, transcript TEXT, summary TEXT, suggestions TEXT, created_at TEXT)''')
    
    # Seed a demo user if not exists
    try:
        cursor.execute("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", 
                      ("Dr. HAREESH", "doctor@clinic.com", "password123"))
    except sqlite3.IntegrityError:
        pass
        
    conn.commit()
    conn.close()

init_db()

# Models
class LoginData(BaseModel):
    email: str
    password: str

class TranscriptData(BaseModel):
    text: str

@app.post("/api/login")
async def login(data: LoginData):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email=? AND password=?", (data.email, data.password))
    user = cursor.fetchone()
    conn.close()
    
    if user:
        return {"status": "success", "user": {"id": user[0], "name": user[1], "email": user[2]}}
    raise HTTPException(status_code=401, detail="Invalid credentials")

@app.post("/api/upload-audio")
async def upload_audio(file: UploadFile = File(...)):
    # In a real app, you would send this to Whisper/Google STT
    # For the hackathon demo, we'll simulate processing and return a transcript
    time.sleep(3)
    return {
        "status": "success",
        "filename": file.filename,
        "transcript": "Doctor: Please describe your symptoms. Patient: I have been feeling very weak and have a persistent dry cough for the last four days. My chest feels slightly heavy."
    }

@app.post("/api/process-consultation")
async def process(data: TranscriptData):
    # Simulate AI Processing delay
    time.sleep(2)
    
    text = data.text.lower()
    
    # "AI" Logic: Detect intent and symptoms
    if "fever" in text or "jwar" in text:
        summary = "Patient reports a history of persistent fever. Physical examination recommended to rule out underlying infection."
        suggestions = ["Paracetamol 500mg", "Complete Blood Count", "Monitor temperature every 4 hours"]
    elif "cough" in text or "khansi" in text:
        summary = "Patient presents with a productive cough. Suspected upper respiratory tract infection."
        suggestions = ["Cough Suppressant", "Chest X-Ray if persistent", "Steam inhalation"]
    elif "chest pain" in text:
        summary = "CRITICAL: Patient reported chest pain. Immediate ECG and cardiac enzyme panel required."
        suggestions = ["Stat ECG", "Refer to Cardiology", "Oxygen saturation monitoring"]
    else:
        summary = "General consultation for non-specific malaise. Observation recommended."
        suggestions = ["Vitamin Supplements", "Adequate Hydration", "Follow-up if symptoms worsen"]
    
    # Save to DB
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("INSERT INTO reports (transcript, summary, suggestions, created_at) VALUES (?, ?, ?, ?)",
                  (data.text, summary, ", ".join(suggestions), datetime.now().strftime("%Y-%m-%d %H:%M:%S")))
    conn.commit()
    conn.close()
    
    return {
        "summary": summary,
        "suggestions": suggestions,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/history")
async def get_history():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, transcript, summary, suggestions, created_at FROM reports ORDER BY id DESC LIMIT 10")
    rows = cursor.fetchall()
    conn.close()
    
    return [{"id": r[0], "transcript": r[1], "summary": r[2], "suggestions": r[3], "date": r[4]} for r in rows]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
