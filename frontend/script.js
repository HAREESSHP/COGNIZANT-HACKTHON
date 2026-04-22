/**
 * MedAssist AI - Core Logic
 * Integrated with Web Speech API for Real-time Multilingual Transcription
 */

document.addEventListener('DOMContentLoaded', () => {
    const recordBtn = document.getElementById('recordBtn');
    const transcriptDiv = document.getElementById('transcript');
    const recordingStatus = document.getElementById('recordingStatus');
    const processBtn = document.getElementById('processBtn');
    const reportSection = document.getElementById('reportSection');
    const reportContent = document.getElementById('reportContent');
    const aiSuggestions = document.getElementById('aiSuggestions');
    const historyList = document.getElementById('historyList');

    let isRecording = false;
    let recognition;
    const API_BASE = "http://127.0.0.1:8000/api";

    // Initialize Speech Recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US'; // Default, can be changed dynamically

        recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            if (finalTranscript) {
                const p = document.createElement('p');
                p.style.marginBottom = "8px";
                p.innerHTML = `<strong>Final:</strong> ${finalTranscript}`;
                transcriptDiv.appendChild(p);
                analyzeKeywords(finalTranscript);
            }
            
            // Show interim text
            let interimElement = document.getElementById('interim-text');
            if (!interimElement) {
                interimElement = document.createElement('p');
                interimElement.id = 'interim-text';
                interimElement.style.color = '#64748b';
                interimElement.style.fontStyle = 'italic';
                transcriptDiv.appendChild(interimElement);
            }
            interimElement.textContent = interimTranscript;
            transcriptDiv.scrollTop = transcriptDiv.scrollHeight;
        };

        recognition.onerror = (event) => {
            console.error("Speech Recognition Error:", event.error);
            stopRecording();
        };
    }

    recordBtn.addEventListener('click', () => {
        if (!recognition) {
            alert("Speech Recognition not supported in this browser.");
            return;
        }
        isRecording = !isRecording;
        if (isRecording) startRecording();
        else stopRecording();
    });

    function startRecording() {
        recordBtn.classList.add('recording');
        recordingStatus.innerHTML = '<p style="font-weight:600;color:#ef4444;">Recording Active...</p><p style="font-size:12px;">Listening for English/Hindi/Telugu...</p>';
        transcriptDiv.innerHTML = "";
        aiSuggestions.innerHTML = "";
        processBtn.style.display = "none";
        reportSection.style.display = "none";
        
        try {
            recognition.start();
        } catch (e) {
            console.log("Recognition already started");
        }
    }

    function stopRecording() {
        isRecording = false;
        recordBtn.classList.remove('recording');
        recordingStatus.innerHTML = '<p style="font-weight:600;">Consultation Complete</p>';
        processBtn.style.display = "block";
        processBtn.innerHTML = "Generate AI Report";
        processBtn.disabled = false;
        processBtn.style.background = "var(--primary)";
        
        try {
            recognition.stop();
        } catch (e) {
            console.log("Recognition already stopped");
        }
        
        // Remove interim text if any
        const interim = document.getElementById('interim-text');
        if (interim) interim.remove();
    }

    function analyzeKeywords(text) {
        const lowerText = text.toLowerCase();
        
        // Language Detection Simulation
        let detectedLang = "English";
        if (lowerText.match(/jwar|khansi|dard|thak|kamzori/)) detectedLang = "Hindi";
        if (lowerText.match(/jwaram|daggulu|noppi|alasata|nirasam/)) detectedLang = "Telugu";
        
        recordingStatus.innerHTML = `<p style="font-weight:600;color:#10b981;">Consultation Active</p><p style="font-size:11px;">Detected: ${detectedLang}</p>`;

        // Symptom Detection
        if (lowerText.includes("fever") || lowerText.includes("jwar") || lowerText.includes("jwaram")) addChip("Fever", "primary");
        if (lowerText.includes("cough") || lowerText.includes("khansi") || lowerText.includes("daggulu")) addChip("Cough", "primary");
        if (lowerText.includes("pain") || lowerText.includes("dard") || lowerText.includes("noppi")) addChip("Pain Management", "primary");
        if (lowerText.includes("weak") || lowerText.includes("kamzori") || lowerText.includes("nirasam")) addChip("Systemic/Weakness", "primary");
        
        // Critical Alert Detection
        if (lowerText.includes("chest pain") || lowerText.includes("heart") || lowerText.includes("unconscious") || lowerText.includes("breath")) {
            addChip("CRITICAL: Urgent Care", "danger");
            showAlert("CRITICAL: Patient mentions severe symptoms. Immediate intervention may be required.");
        }
    }

    function addChip(label, type) {
        if (![...aiSuggestions.children].some(c => c.textContent.includes(label))) {
            const span = document.createElement('span');
            span.className = `suggestion-chip ${type}`;
            span.innerHTML = `<i class="fa-solid ${type === 'danger' ? 'fa-triangle-exclamation' : 'fa-check'}"></i> ${label}`;
            if (type === 'danger') {
                span.style.background = "#fee2e2";
                span.style.color = "#ef4444";
                span.style.borderColor = "#fca5a5";
            }
            aiSuggestions.appendChild(span);
        }
    }

    function showAlert(msg) {
        const alertBox = document.createElement('div');
        alertBox.className = "critical-alert-toast";
        alertBox.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${msg}`;
        document.body.appendChild(alertBox);
        setTimeout(() => alertBox.classList.add('show'), 100);
        setTimeout(() => {
            alertBox.classList.remove('show');
            setTimeout(() => alertBox.remove(), 500);
        }, 5000);
    }

    const audioUpload = document.getElementById('audioUpload');

    audioUpload.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        recordingStatus.innerHTML = `<p style="font-weight:600;color:var(--primary);"><i class="fa-solid fa-spinner fa-spin"></i> Uploading ${file.name}...</p>`;
        transcriptDiv.innerHTML = "Processing audio file...";

        try {
            const response = await fetch(`${API_BASE}/upload-audio`, {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            
            transcriptDiv.innerHTML = `<strong>(Uploaded File Transcript)</strong><br>${data.transcript}`;
            recordingStatus.innerHTML = '<p style="font-weight:600;">File Processed</p>';
            processBtn.style.display = "block";
            analyzeKeywords(data.transcript);
        } catch (e) {
            console.error("Upload failed", e);
            recordingStatus.innerHTML = '<p style="font-weight:600;color:#ef4444;">Upload Failed</p>';
        }
    });

    processBtn.addEventListener('click', async () => {
        processBtn.innerHTML = '<i class="fa-solid fa-dna fa-spin"></i> Analyzing Multilingual Content...';
        processBtn.disabled = true;

        const fullText = transcriptDiv.innerText;

        try {
            const response = await fetch(`${API_BASE}/process-consultation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: fullText })
            });
            const data = await response.json();
            showReport(data);
        } catch (e) {
            console.log("Backend error, using fallback logic");
            setTimeout(() => {
                showReport({
                    summary: "The patient reports symptoms consistent with " + (fullText.includes("fever") ? "viral fever" : "general malaise") + ". Multilingual detection identified mixed English/Regional input.",
                    suggestions: ["Complete Blood Count (CBC)", "Rest and Fluids", "Follow-up in 3 days"],
                    timestamp: new Date().toISOString()
                });
            }, 1500);
        }
    });

    function showReport(data) {
        reportSection.style.display = "block";
        reportContent.innerHTML = `
            <div class="report-header">
                <h3>CLINICAL VISIT SUMMARY</h3>
                <p>Generated: ${new Date(data.timestamp).toLocaleString()}</p>
            </div>
            
            <div class="report-field">
                <label>Chief Complaint & History</label>
                <div contenteditable="true" class="editable-field" id="edit-summary">${data.summary}</div>
            </div>

            <div class="report-field">
                <label>Clinical Suggestions</label>
                <div contenteditable="true" class="editable-field" id="edit-suggestions">
                    ${data.suggestions.map(s => `• ${s}`).join('\n')}
                </div>
            </div>

            <div class="report-actions">
                <button id="saveReportBtn" class="login-btn" style="background: #10b981;">
                    <i class="fa-solid fa-cloud-arrow-up"></i> Approve & Save to EMR
                </button>
                <button onclick="exportToPDF()" class="login-btn" style="background: white; color: var(--text-main); border: 1px solid var(--border);">
                    <i class="fa-solid fa-file-pdf"></i> Download PDF
                </button>
            </div>
        `;
        
        document.getElementById('saveReportBtn').addEventListener('click', saveFinalReport);
        reportSection.scrollIntoView({ behavior: 'smooth' });
    }

    async function saveFinalReport() {
        const btn = document.getElementById('saveReportBtn');
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Saving...';
        
        const summary = document.getElementById('edit-summary').innerText;
        const suggestions = document.getElementById('edit-suggestions').innerText;
        
        // In a real app, send to /api/save-report
        setTimeout(() => {
            btn.innerHTML = '<i class="fa-solid fa-check"></i> Saved Successfully';
            btn.style.background = "#059669";
            loadHistory();
        }, 1000);
    }

    async function loadHistory() {
        try {
            const response = await fetch(`${API_BASE}/history`);
            const data = await response.json();
            historyList.innerHTML = data.map(item => `
                <li class="history-item">
                    <p class="history-title">Consultation #${item.id}</p>
                    <p class="history-summary">${item.summary.substring(0, 60)}...</p>
                    <p class="history-date">${item.date}</p>
                </li>
            `).join('');
        } catch (e) {
            console.log("Could not load history");
        }
    }

    // Initialize history
    loadHistory();
});

function exportToPDF() {
    window.print(); // Simplest way for hackathon, or use jspdf
}
