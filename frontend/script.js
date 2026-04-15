// script.js - MedAssist AI


// --- Login/Signup/Forgot Password UI Logic ---
document.addEventListener('DOMContentLoaded', function() {
    // Tab switching
    const signInTab = document.getElementById('signInTab');
    const signUpTab = document.getElementById('signUpTab');
    const signInFormContainer = document.getElementById('signInFormContainer');
    const signUpFormContainer = document.getElementById('signUpFormContainer');
    if (signInTab && signUpTab) {
        signInTab.addEventListener('click', function() {
            signInTab.classList.add('active');
            signUpTab.classList.remove('active');
            signInFormContainer.style.display = '';
            signUpFormContainer.style.display = 'none';
        });
        signUpTab.addEventListener('click', function() {
            signUpTab.classList.add('active');
            signInTab.classList.remove('active');
            signUpFormContainer.style.display = '';
            signInFormContainer.style.display = 'none';
        });
    }

    // Login logic
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            // TODO: Add loading state
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('token', data.token);
                window.location.href = 'index.html';
            } else {
                document.getElementById('loginError').innerText = data.detail || 'Login failed';
            }
        });
    }

    // Sign Up logic (basic UI, backend integration needed)
    const signUpForm = document.getElementById('signUpForm');
    if (signUpForm) {
        signUpForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const email = document.getElementById('signUpEmail').value;
            const password = document.getElementById('signUpPassword').value;
            const confirmPassword = document.getElementById('signUpConfirmPassword').value;
            const errorDiv = document.getElementById('signUpError');
            errorDiv.innerText = '';
            if (password !== confirmPassword) {
                errorDiv.innerText = 'Passwords do not match.';
                return;
            }
            // TODO: Add backend integration for signup
            errorDiv.innerText = 'Sign up functionality coming soon.';
        });
    }

    // Forgot Password modal logic
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    const forgotPasswordModal = document.getElementById('forgotPasswordModal');
    const closeModal = document.getElementById('closeModal');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const sendOtpBtn = document.getElementById('sendOtpBtn');
    const otpSection = document.getElementById('otpSection');
    const forgotError = document.getElementById('forgotError');
    if (forgotPasswordLink && forgotPasswordModal && closeModal) {
        forgotPasswordLink.addEventListener('click', function(e) {
            e.preventDefault();
            forgotPasswordModal.style.display = 'flex';
            forgotError.innerText = '';
            otpSection.style.display = 'none';
            forgotPasswordForm.reset();
        });
        closeModal.addEventListener('click', function() {
            forgotPasswordModal.style.display = 'none';
        });
        window.onclick = function(event) {
            if (event.target === forgotPasswordModal) {
                forgotPasswordModal.style.display = 'none';
            }
        };
    }
    if (sendOtpBtn && otpSection) {
        sendOtpBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            const email = document.getElementById('forgotEmail').value;
            if (!email) {
                forgotError.innerText = 'Please enter your email.';
                return;
            }
            // TODO: Integrate backend to send OTP
            otpSection.style.display = '';
            sendOtpBtn.disabled = true;
            forgotError.innerText = 'OTP sent to your email (mock).';
        });
    }
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            // TODO: Integrate backend to verify OTP and reset password
            forgotError.innerText = 'Password reset functionality coming soon.';
        });
    }

    // --- Dashboard Logic ---
    const recordBtn = document.getElementById('recordBtn');
    const stopBtn = document.getElementById('stopBtn');
    const audioUpload = document.getElementById('audioUpload');
    let mediaRecorder, audioChunks = [];

    if (recordBtn && stopBtn) {
        recordBtn.addEventListener('click', async function() {
            audioChunks = [];
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.start();
            recordBtn.disabled = true;
            stopBtn.disabled = false;
            mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
        });
        stopBtn.addEventListener('click', function() {
            mediaRecorder.stop();
            recordBtn.disabled = false;
            stopBtn.disabled = true;
            mediaRecorder.onstop = async function() {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                uploadAudio(audioBlob);
            };
        });
    }
    if (audioUpload) {
        audioUpload.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) uploadAudio(file);
        });
    }

    async function uploadAudio(audioBlob) {
        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append('audio', audioBlob);
        const res = await fetch('/api/upload-audio', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        const data = await res.json();
        if (res.ok) {
            document.getElementById('transcriptText').innerText = data.transcript;
            getAISuggestions(data.transcript);
        } else {
            document.getElementById('transcriptText').innerText = 'Audio processing failed.';
        }
    }

    async function getAISuggestions(transcript) {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/process-text', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ transcript })
        });
        const data = await res.json();
        if (res.ok) {
            document.getElementById('aiSymptoms').innerText = 'Symptoms: ' + (data.symptoms || '--');
            document.getElementById('aiDiagnosis').innerText = 'Possible Conditions: ' + (data.diagnosis || '--');
            generateReport(transcript, data);
        } else {
            document.getElementById('aiSymptoms').innerText = 'Symptoms: --';
            document.getElementById('aiDiagnosis').innerText = 'Possible Conditions: --';
        }
    }

    async function generateReport(transcript, aiData) {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/generate-report', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ transcript, aiData })
        });
        const data = await res.json();
        if (res.ok) {
            document.getElementById('reportText').innerText = data.report;
            saveReport(transcript, data.report, aiData);
        } else {
            document.getElementById('reportText').innerText = 'Report generation failed.';
        }
    }

    async function saveReport(transcript, report, aiData) {
        const token = localStorage.getItem('token');
        await fetch('/api/save-report', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ transcript, report, aiData })
        });
        loadHistory();
    }

    async function loadHistory() {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/get-reports', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        const historyList = document.getElementById('historyList');
        if (historyList) {
            historyList.innerHTML = '';
            (data.reports || []).forEach(r => {
                const li = document.createElement('li');
                li.innerText = `${r.created_at}: ${r.summary || r.transcript.substring(0, 30) + '...'}`;
                historyList.appendChild(li);
            });
        }
    }

    if (document.getElementById('historyList')) loadHistory();

    // Download report
    const downloadBtn = document.getElementById('downloadReportBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', function() {
            const report = document.getElementById('reportText').innerText;
            const blob = new Blob([report], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'medical_report.txt';
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
        });
    }
});
