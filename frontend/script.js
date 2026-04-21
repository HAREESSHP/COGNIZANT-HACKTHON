/**
 * MedAssist AI - Full Stack Prototype Logic
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
    let timer;
    const API_BASE = "http://127.0.0.1:8000/api";

    const mockDialog = [
        "Doctor: Hello, how can I help you today?",
        "Patient (Telugu): నమస్కారం డాక్టర్, గత మూడు రోజులుగా నాకు జ్వరం మరియు దగ్గుగా ఉంది. (Fever and cough for 3 days)",
        "Doctor: Are you experiencing any body aches?",
        "Patient (Hindi): जी डॉक्टर, बहुत कमजोरी महसूस हो रही है। (Yes doctor, feeling very weak)",
        "Doctor: Any history of allergies?",
        "Patient: No."
    ];

    let dialogIndex = 0;

    recordBtn.addEventListener('click', () => {
        isRecording = !isRecording;
        if (isRecording) startRecording();
        else stopRecording();
    });

    function startRecording() {
        recordBtn.classList.add('recording');
        recordingStatus.innerHTML = '<p style="font-weight:600;color:#ef4444;">Recording Active...</p>';
        transcriptDiv.innerHTML = "";
        aiSuggestions.innerHTML = "";
        dialogIndex = 0;
        
        timer = setInterval(() => {
            if (dialogIndex < mockDialog.length) {
                const p = document.createElement('p');
                p.textContent = mockDialog[dialogIndex];
                p.style.marginBottom = "8px";
                p.style.opacity = "0";
                p.style.transition = "opacity 0.5s";
                transcriptDiv.appendChild(p);
                setTimeout(() => p.style.opacity = "1", 50);
                
                // Update suggestions based on keywords
                if (p.textContent.includes("fever") || p.textContent.includes("జ్వరం")) addChip("Fever");
                if (p.textContent.includes("cough") || p.textContent.includes("దగ్గు")) addChip("Respiratory");
                if (p.textContent.includes("weak") || p.textContent.includes("कमजोरी")) addChip("Systemic");

                transcriptDiv.scrollTop = transcriptDiv.scrollHeight;
                dialogIndex++;
            } else {
                stopRecording();
            }
        }, 2000);
    }

    function stopRecording() {
        isRecording = false;
        recordBtn.classList.remove('recording');
        clearInterval(timer);
        recordingStatus.innerHTML = '<p style="font-weight:600;">Consultation Complete</p>';
        processBtn.style.display = "block";
    }

    function addChip(label) {
        if (![...aiSuggestions.children].some(c => c.textContent.includes(label))) {
            const span = document.createElement('span');
            span.className = "suggestion-chip";
            span.innerHTML = `<i class="fa-solid fa-check"></i> ${label}`;
            aiSuggestions.appendChild(span);
        }
    }

    processBtn.addEventListener('click', async () => {
        processBtn.innerHTML = '<i class="fa-solid fa-dna fa-spin"></i> Analyzing Multilingual Content...';
        processBtn.disabled = true;

        try {
            // Real API Call to Backend
            const response = await fetch(`${API_BASE}/process-consultation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: transcriptDiv.innerText })
            });
            const data = await response.json();
            showReport(data);
        } catch (e) {
            // Fallback for demo if backend is not running
            console.log("Backend not reachable, showing simulated report");
            setTimeout(() => showReport({
                summary: "Patient presents with viral symptoms. Multilingual translation confirms 3-day history of fever and cough.",
                suggestions: ["CBC Test", "Hydration", "Paracetamol"],
                timestamp: new Date().toISOString()
            }), 1500);
        }
    });

    function showReport(data) {
        reportSection.style.display = "block";
        reportContent.innerHTML = `
            <div style="border-bottom: 2px solid #f1f5f9; padding-bottom: 15px; margin-bottom: 20px;">
                <h3 style="color: var(--primary); letter-spacing: 1px;">CLINICAL VISIT SUMMARY</h3>
                <p style="font-size: 12px; color: var(--text-muted);">Timestamp: ${new Date(data.timestamp).toLocaleString()}</p>
            </div>
            <p><strong>Diagnosis:</strong> Possible Viral Pharyngitis</p>
            <p style="margin-top:10px;"><strong>Key Findings:</strong> ${data.summary}</p>
            <p style="margin-top:10px;"><strong>Suggested Actions:</strong></p>
            <ul style="margin-left: 20px; margin-top: 5px;">
                ${data.suggestions.map(s => `<li>${s}</li>`).join('')}
            </ul>
        `;
        processBtn.innerHTML = 'Report Generated';
        processBtn.style.background = "#10b981";
        reportSection.scrollIntoView({ behavior: 'smooth' });
    }
});
