from fastapi import FastAPI, File, UploadFile, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
 # ...existing code...
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import uvicorn
import sqlite3
import secrets
import os

app = FastAPI()

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = os.path.join(os.path.dirname(__file__), 'database.db')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def create_tables():
    conn = get_db()
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT UNIQUE,
        password TEXT
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        transcript TEXT,
        summary TEXT,
        suggestions TEXT,
        created_at TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )''')
    conn.commit()
    conn.close()

create_tables()

# Simple token-based auth (for demo only)
tokens = {}

def authenticate(email, password):
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM users WHERE email=? AND password=?', (email, password))
    user = c.fetchone()
    conn.close()
    return user

def get_user_by_token(token):
    return tokens.get(token)

# Models
class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    token: str

class TranscriptRequest(BaseModel):
    transcript: str

class AIData(BaseModel):
    symptoms: Optional[str] = None
    diagnosis: Optional[str] = None

class ReportRequest(BaseModel):
    transcript: str
    aiData: dict

class SaveReportRequest(BaseModel):
    transcript: str
    report: str
    aiData: dict

@app.post('/api/login')
def login(req: LoginRequest):
    user = authenticate(req.email, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = secrets.token_hex(16)
    tokens[token] = dict(user)
    return {"token": token}

@app.post('/api/upload-audio')
def upload_audio(audio: UploadFile = File(...), token: str = Depends(lambda: None)):
    # For demo: fake transcript
    transcript = "This is a sample transcript from audio."
    return {"transcript": transcript}

@app.post('/api/process-text')
def process_text(req: TranscriptRequest, token: str = Depends(lambda: None)):
    # For demo: fake AI output
    return {"symptoms": "Fever, cough", "diagnosis": "Common cold"}

@app.post('/api/generate-report')
def generate_report(req: ReportRequest, token: str = Depends(lambda: None)):
    # For demo: simple report
    report = f"Visit Summary:\nSymptoms: {req.aiData.get('symptoms')}\nDiagnosis: {req.aiData.get('diagnosis')}\nTranscript: {req.transcript}"
    return {"report": report}

@app.post('/api/save-report')
def save_report(req: SaveReportRequest, token: str = Depends(lambda: None)):
    user = get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    conn = get_db()
    c = conn.cursor()
    c.execute('INSERT INTO reports (user_id, transcript, summary, suggestions, created_at) VALUES (?, ?, ?, ?, ?)',
        (user['id'], req.transcript, req.report, str(req.aiData), datetime.now().isoformat()))
    conn.commit()
    conn.close()
    return {"status": "ok"}

@app.get('/api/get-reports')
def get_reports(token: str = Depends(lambda: None)):
    user = get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM reports WHERE user_id=? ORDER BY created_at DESC', (user['id'],))
    reports = [dict(r) for r in c.fetchall()]
    conn.close()
    return {"reports": reports}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
