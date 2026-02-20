// Configuration
const CONFIG = {
    N8N_WEBHOOK: 'https://high5ai.app.n8n.cloud/webhook/dirtlogic-ai',
    N8N_SIGNUP:  'https://high5ai.app.n8n.cloud/webhook/signup',
    N8N_SIGNIN:  'https://high5ai.app.n8n.cloud/webhook/signin',
    N8N_FORGOT:  'https://high5ai.app.n8n.cloud/webhook/forgot-password',
    IDLE_TIMEOUT_MS: 3 * 60 * 1000 // 3 minutes
};

// State management
let uploadedFile = null;
let currentUser = null; // { email, name, token, ... }
let idleTimer = null;

// DOM Elements
const uploadBox       = document.getElementById('uploadBox');
const fileInput       = document.getElementById('fileInput');
const generateBtn     = document.getElementById('generateBtn');
const designPrompt    = document.getElementById('designPrompt');
const previewPlaceholder = document.getElementById('previewPlaceholder');
const previewImage    = document.getElementById('previewImage');
const loadingOverlay  = document.getElementById('loadingOverlay');
const fileNameInput   = document.getElementById('fileNameInput');

// Auth DOM
const authBanner      = document.getElementById('authBanner');
const userBar         = document.getElementById('userBar');
const userEmailLabel  = document.getElementById('userEmailLabel');
const appContent      = document.getElementById('appContent');
const authMessage     = document.getElementById('authMessage');
const tabSlider       = document.getElementById('tabSlider');

// ========================
// AUTH LOGIC
// ========================

function switchTab(tab) {
    const signupForm = document.getElementById('signupForm');
    const signinForm = document.getElementById('signinForm');
    const tabSignup  = document.getElementById('tabSignup');
    const tabSignin  = document.getElementById('tabSignin');

    clearAuthMessage();

    if (tab === 'signup') {
        signupForm.style.display = 'block';
        signinForm.style.display = 'none';
        tabSignup.classList.add('active');
        tabSignin.classList.remove('active');
        tabSlider.classList.remove('slide-right');
    } else {
        signupForm.style.display = 'none';
        signinForm.style.display = 'block';
        tabSignup.classList.remove('active');
        tabSignin.classList.add('active');
        tabSlider.classList.add('slide-right');
    }
}

function showAuthMessage(msg, type = 'info') {
    authMessage.textContent = msg;
    authMessage.className = 'auth-message ' + type;
}

function clearAuthMessage() {
    authMessage.textContent = '';
    authMessage.className = 'auth-message';
}

async function handleSignup() {
    const name     = document.getElementById('signupName').value.trim();
    const email    = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const btn      = document.getElementById('signupBtn');

    if (!name || !email || !password) {
        showAuthMessage('Please fill in all fields.', 'error');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Creating account...';
    clearAuthMessage();

    try {
        const res = await fetch(CONFIG.N8N_SIGNUP, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok && !data.error) {
            showAuthMessage(data.message || 'Account created! You can now sign in.', 'success');
            // Auto-switch to sign in
            setTimeout(() => switchTab('signin'), 1500);
        } else {
            showAuthMessage(data.message || data.error || 'Sign up failed. Please try again.', 'error');
        }
    } catch (err) {
        showAuthMessage('Network error. Please try again.', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Create Account';
    }
}

async function handleSignin() {
    const email    = document.getElementById('signinEmail').value.trim();
    const password = document.getElementById('signinPassword').value;
    const btn      = document.getElementById('signinBtn');

    if (!email || !password) {
        showAuthMessage('Please enter email and password.', 'error');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Signing in...';
    clearAuthMessage();

    try {
        const res = await fetch(CONFIG.N8N_SIGNIN, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok && !data.error) {
            currentUser = {
                email: data.email || email,
                name:  data.name  || '',
                token: data.token || ''
            };
            onLoginSuccess();
        } else {
            showAuthMessage(data.message || data.error || 'Invalid credentials.', 'error');
        }
    } catch (err) {
        showAuthMessage('Network error. Please try again.', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Sign In';
    }
}

async function handleForgotPassword() {
    const email = document.getElementById('signinEmail').value.trim();

    if (!email) {
        showAuthMessage('Enter your email above first.', 'error');
        return;
    }

    clearAuthMessage();
    showAuthMessage('Sending reset link...', 'info');

    try {
        const res = await fetch(CONFIG.N8N_FORGOT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await res.json().catch(() => ({}));
        showAuthMessage(data.message || 'If that email exists, a reset link has been sent.', 'success');
    } catch (err) {
        showAuthMessage('Network error. Please try again.', 'error');
    }
}

function onLoginSuccess() {
    // Hide auth banner with slide-up animation
    authBanner.classList.add('auth-hidden');

    // Show user bar
    userBar.style.display = 'flex';
    userEmailLabel.innerHTML = `user: <span>${currentUser.email}</span>`;

    // Unlock app
    appContent.classList.remove('app-locked');
    appContent.classList.add('app-unlocked');

    // Start idle timer
    resetIdleTimer();
    document.addEventListener('mousemove', resetIdleTimer);
    document.addEventListener('keydown', resetIdleTimer);
    document.addEventListener('click', resetIdleTimer);
    document.addEventListener('touchstart', resetIdleTimer);
}

function handleLogout() {
    currentUser = null;
    clearIdleTimer();

    // Remove activity listeners
    document.removeEventListener('mousemove', resetIdleTimer);
    document.removeEventListener('keydown', resetIdleTimer);
    document.removeEventListener('click', resetIdleTimer);
    document.removeEventListener('touchstart', resetIdleTimer);

    // Hide user bar
    userBar.style.display = 'none';

    // Lock app
    appContent.classList.add('app-locked');
    appContent.classList.remove('app-unlocked');

    // Show auth banner
    authBanner.classList.remove('auth-hidden');
    switchTab('signup');
    showAuthMessage('You have been signed out.', 'info');

    // Reset app state
    uploadedFile = null;
    if (previewImage) {
        previewImage.style.display = 'none';
        previewImage.src = '';
    }
    if (previewPlaceholder) previewPlaceholder.style.display = 'block';
    if (generateBtn) generateBtn.disabled = true;
    if (fileInput) fileInput.value = '';
}

function resetIdleTimer() {
    clearIdleTimer();
    idleTimer = setTimeout(() => {
        handleLogout();
        // Show timeout message after logout re-shows banner
        setTimeout(() => showAuthMessage('Session expired due to inactivity.', 'info'), 100);
    }, CONFIG.IDLE_TIMEOUT_MS);
}

function clearIdleTimer() {
    if (idleTimer) {
        clearTimeout(idleTimer);
        idleTimer = null;
    }
}

// ========================
// ORIGINAL APP LOGIC (100% unchanged)
// ========================

function init() {
    setupEventListeners();
    // App starts locked
    appContent.classList.add('app-locked');
    generateBtn.disabled = true;
}

function setupEventListeners() {
    uploadBox.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', handleFileSelect);

    uploadBox.addEventListener('dragover', handleDragOver);
    uploadBox.addEventListener('dragleave', handleDragLeave);
    uploadBox.addEventListener('drop', handleDrop);

    generateBtn.addEventListener('click', handleGenerate);
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        uploadedFile = file;
        displayPreviewFromFile(file);
    }
}

function displayPreviewFromFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        displayPreviewImage(e.target.result);
    };
    reader.readAsDataURL(file);
}

function displayPreviewImage(imageUrl) {
    previewPlaceholder.style.display = 'none';
    previewImage.src = imageUrl;
    previewImage.style.display = 'block';
    generateBtn.disabled = false;
}

function handleDragOver(event) {
    event.preventDefault();
    uploadBox.classList.add('dragover');
}

function handleDragLeave(event) {
    event.preventDefault();
    uploadBox.classList.remove('dragover');
}

function handleDrop(event) {
    event.preventDefault();
    uploadBox.classList.remove('dragover');
    
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        uploadedFile = file;
        fileInput.files = event.dataTransfer.files;
        displayPreviewFromFile(file);
    }
}

function generateTimestamp() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const MM = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const HH = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return `${yyyy}${MM}${dd}-${HH}${mm}${ss}`;
}

async function handleGenerate() {
    if (!uploadedFile) {
        alert('Please upload an image first');
        return;
    }

    const prompt = designPrompt.value.trim();
    if (!prompt) {
        alert('Please enter a design prompt');
        return;
    }

    const filename = fileNameInput ? fileNameInput.value.trim() : '';

    showLoading(true);
    generateBtn.disabled = true;

    try {
        const timestamp = generateTimestamp();
        const inputFilename  = `in_${timestamp}.jpg`;
        const outputFilename = `out_${timestamp}.jpg`;

        const imageBase64 = await fileToBase64(uploadedFile);
        const base64Data  = imageBase64.split(',')[1];

        const result = await sendToN8N(
            base64Data,
            prompt,
            timestamp,
            inputFilename,
            outputFilename,
            filename
        );

        const ghlImageUrl =
            result?.outputImageUrl ||
            result?.imageUrl ||
            result?.ghlImageUrl ||
            result?.url;

        if (ghlImageUrl) {
            displayPreviewImage(ghlImageUrl);
            alert('Concept generated successfully!');
        } else {
            throw new Error('No image URL returned from webhook');
        }

    } catch (error) {
        console.error('Error generating concept:', error);
        alert('Error generating concept. Please try again.');
    } finally {
        showLoading(false);
        generateBtn.disabled = false;
    }
}

async function sendToN8N(imageBase64, prompt, timestamp, inputFilename, outputFilename, filename) {
    try {
        const response = await fetch(CONFIG.N8N_WEBHOOK, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                imageBase64,
                prompt,
                timestamp,
                inputFilename,
                outputFilename,
                filename,
                // NEW: user email included in every payload
                userEmail: currentUser ? currentUser.email : ''
            })
        });

        if (!response.ok) {
            throw new Error('n8n webhook request failed');
        }

        return await response.json();
    } catch (error) {
        console.error('Error sending to n8n:', error);
        throw error;
    }
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function showLoading(show) {
    loadingOverlay.style.display = show ? 'flex' : 'none';
}

document.addEventListener('DOMContentLoaded', init);
