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

@app.post("/api/process-consultation")
async def process(data: TranscriptData):
    # Simulate AI Processing delay
    time.sleep(1.5)
    
    # Mock AI Extraction Logic
    summary = f"Structured clinical summary for: {data.text[:50]}..."
    suggestions = ["Fever Management", "Blood Test (CBC)", "Rest Recommendation"]
    
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
    cursor.execute("SELECT * FROM reports ORDER BY id DESC LIMIT 10")
    rows = cursor.fetchall()
    conn.close()
    
    return [{"id": r[0], "transcript": r[1], "summary": r[2], "suggestions": r[3], "date": r[4]} for r in rows]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
