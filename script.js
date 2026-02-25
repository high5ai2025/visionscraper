// Configuration
const CONFIG = {
    N8N_WEBHOOK:   'https://high5ai.app.n8n.cloud/webhook/dirtlogic-ai',
    N8N_SIGNUP:    'https://high5ai.app.n8n.cloud/webhook/signup',
    N8N_SIGNIN:    'https://high5ai.app.n8n.cloud/webhook/signin',
    N8N_FORGOT:    'https://high5ai.app.n8n.cloud/webhook/forgot-password',
    APPS_SCRIPT:   'https://script.google.com/macros/s/AKfycbzD2niEzWYdsUR0bXc7pykd1Pqx5OtaK97iZc5_5IzO2ImegcqxEVJw27Nbu3ySaTUlCw/exec',
    IDLE_TIMEOUT_MS: 3 * 60 * 1000 // 3 minutes
};

// State management
let uploadedFile = null;
let currentUser  = null; // { email, name, token, plan, uses, limit }
let idleTimer    = null;

// DOM Elements
const uploadBox          = document.getElementById('uploadBox');
const fileInput          = document.getElementById('fileInput');
const generateBtn        = document.getElementById('generateBtn');
const designPrompt       = document.getElementById('designPrompt');
const previewPlaceholder = document.getElementById('previewPlaceholder');
const previewImage       = document.getElementById('previewImage');
const loadingOverlay     = document.getElementById('loadingOverlay');
const fileNameInput      = document.getElementById('fileNameInput');

// Auth DOM
const authBanner     = document.getElementById('authBanner');
const userBar        = document.getElementById('userBar');
const userEmailLabel = document.getElementById('userEmailLabel');
const appContent     = document.getElementById('appContent');
const authMessage    = document.getElementById('authMessage');
const tabSlider      = document.getElementById('tabSlider');

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

// Extract the most meaningful error reason from any webhook JSON response
function extractErrorReason(data, fallback) {
    return data.message
        || data.error
        || data.msg
        || data.reason
        || data.error_description
        || data.errorMessage
        || fallback;
}

// ========================
// SIGN UP
// ========================

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

        // Wait for webhook response — success if ok and no error signals
        if (res.ok && data.status !== 'error' && !data.error) {
            showAuthMessage(data.message || 'Account created! Please check your email to confirm.', 'success');
            // Clear fields
            document.getElementById('signupName').value     = '';
            document.getElementById('signupEmail').value    = '';
            document.getElementById('signupPassword').value = '';
        } else {
            // Map and display reason from webhook JSON body
            showAuthMessage(extractErrorReason(data, 'Sign up failed. Please try again.'), 'error');
        }
    } catch (err) {
        showAuthMessage('Network error. Please try again.', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Create Account';
    }
}

// ========================
// SIGN IN
// ========================

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

        // Wait for webhook response — success if ok and no error signals
        if (res.ok && data.status !== 'error' && !data.error) {
            currentUser = {
                email: data.email || email,
                name:  data.name  || '',
                token: data.token || '',
                plan:  '',
                uses:  '',
                limit: ''
            };
            // Fetch plan/uses/limit from Apps Script before showing user bar
            await fetchUserStats(currentUser.email);
            onLoginSuccess();
        } else {
            // Map and display reason from webhook JSON body
            showAuthMessage(extractErrorReason(data, 'Invalid email or password.'), 'error');
        }
    } catch (err) {
        showAuthMessage('Network error. Please try again.', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Sign In';
    }
}

// ========================
// FORGOT PASSWORD
// ========================

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

        // Wait for webhook response — success if ok and no error signals
        if (res.ok && data.status !== 'error' && !data.error) {
            showAuthMessage(data.message || 'Reset link verified. Enter your new password below.', 'success');
            // Open new password modal on success
            openResetModal(email);
        } else {
            // Map and display reason from webhook JSON body
            showAuthMessage(extractErrorReason(data, 'Could not send reset link. Please try again.'), 'error');
        }
    } catch (err) {
        showAuthMessage('Network error. Please try again.', 'error');
    }
}

// ========================
// RESET PASSWORD MODAL
// ========================

function openResetModal(email) {
    // Remove any existing modal
    const existing = document.getElementById('resetModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'resetModal';
    modal.className = 'reset-modal-overlay';
    modal.innerHTML = `
        <div class="reset-modal-box">
            <h3 class="reset-modal-title">Set New Password</h3>
            <p class="reset-modal-subtitle">Updating password for <strong>${email}</strong></p>
            <div class="reset-fields">
                <input type="password" id="resetNewPassword"     class="auth-input" placeholder="New password" />
                <input type="password" id="resetConfirmPassword" class="auth-input" placeholder="Confirm new password" />
                <button class="auth-submit-btn" id="resetSubmitBtn" onclick="handleResetSubmit('${email}')">Update Password</button>
            </div>
            <div class="auth-message" id="resetMessage"></div>
            <button class="reset-modal-close" onclick="closeResetModal()">Cancel</button>
        </div>
    `;

    document.body.appendChild(modal);
    // Animate in on next frame
    requestAnimationFrame(() => modal.classList.add('reset-modal-visible'));
}

function closeResetModal() {
    const modal = document.getElementById('resetModal');
    if (!modal) return;
    modal.classList.remove('reset-modal-visible');
    setTimeout(() => modal.remove(), 300);
}

async function handleResetSubmit(email) {
    const newPassword     = document.getElementById('resetNewPassword').value;
    const confirmPassword = document.getElementById('resetConfirmPassword').value;
    const btn             = document.getElementById('resetSubmitBtn');
    const msgEl           = document.getElementById('resetMessage');

    const showResetMsg = (text, type) => {
        msgEl.textContent = text;
        msgEl.className = 'auth-message ' + type;
    };

    if (!newPassword || !confirmPassword) {
        showResetMsg('Please fill in both fields.', 'error');
        return;
    }
    if (newPassword !== confirmPassword) {
        showResetMsg('Passwords do not match.', 'error');
        return;
    }
    if (newPassword.length < 6) {
        showResetMsg('Password must be at least 6 characters.', 'error');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Updating...';
    showResetMsg('', '');

    try {
        const res = await fetch(CONFIG.N8N_FORGOT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, newPassword, action: 'reset' })
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok && data.status !== 'error' && !data.error) {
            showResetMsg(data.message || 'Password updated successfully!', 'success');
            // Close modal and redirect to sign in
            setTimeout(() => {
                closeResetModal();
                switchTab('signin');
                showAuthMessage('Password updated. Please sign in.', 'success');
            }, 1800);
        } else {
            showResetMsg(extractErrorReason(data, 'Failed to update password. Please try again.'), 'error');
        }
    } catch (err) {
        showResetMsg('Network error. Please try again.', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Update Password';
    }
}

// ========================
// APPS SCRIPT — FETCH USER STATS (login trigger)
// Called after successful sign in. Sends email, receives plan/uses/limit.
// ========================

async function fetchUserStats(email) {
    try {
        const url = CONFIG.APPS_SCRIPT
            + '?action=getStats&email=' + encodeURIComponent(email);
        const res  = await fetch(url);
        const data = await res.json().catch(() => ({}));

        if (data && data.plan) {
            currentUser.plan  = (data.plan  || '').toUpperCase();
            currentUser.uses  = data.uses  !== undefined ? data.uses  : '';
            currentUser.limit = data.limit !== undefined ? data.limit : '';
        }
    } catch (err) {
        // Non-fatal — user bar will show blanks for plan/uses/limit
        console.warn('fetchUserStats failed:', err);
    }
}

// Update the user bar display (call after stats change)
function updateUserBar() {
    const plan  = currentUser.plan  || '—';
    const uses  = currentUser.uses  !== '' ? currentUser.uses  : '—';
    const limit = currentUser.limit !== '' ? currentUser.limit : '—';
    const limitDisplay = plan === 'PRO' ? 'Unlimited' : `${uses} / ${limit}`;

    userEmailLabel.innerHTML =
        `user: <span>${currentUser.email}</span>` +
        `&nbsp;&nbsp;PLAN: <span>${plan}</span>` +
        `&nbsp;&nbsp;USES: <span class="stat-uses">${limitDisplay}</span>`;
}

// ========================
// LOGIN / LOGOUT
// ========================

function onLoginSuccess() {
    // Hide auth banner with slide-up animation
    authBanner.classList.add('auth-hidden');

    // Show user bar with plan/uses/limit
    userBar.style.display = 'flex';
    updateUserBar();

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

// ========================
// GENERATE — rerouted through Apps Script usage check first
// ========================

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
        const timestamp      = generateTimestamp();
        const inputFilename  = `in_${timestamp}.jpg`;
        const outputFilename = `out_${timestamp}.jpg`;

        const imageBase64 = await fileToBase64(uploadedFile);
        const base64Data  = imageBase64.split(',')[1];

        // Step 1 — Ask Apps Script to check uses vs limit
        // PRO plan skips the check entirely
        if (currentUser.plan === 'PRO') {
            // Go straight to N8N
            await executeGenerate(base64Data, prompt, timestamp, inputFilename, outputFilename, filename);
        } else {
            await checkUsageAndGenerate(base64Data, prompt, timestamp, inputFilename, outputFilename, filename);
        }

    } catch (error) {
        console.error('Error generating concept:', error);
        alert('Error generating concept. Please try again.');
    } finally {
        showLoading(false);
        generateBtn.disabled = false;
    }
}

// Check usage via Apps Script then either proceed or show limit message
async function checkUsageAndGenerate(base64Data, prompt, timestamp, inputFilename, outputFilename, filename) {
    const url = CONFIG.APPS_SCRIPT
        + '?action=checkAndIncrement&email=' + encodeURIComponent(currentUser.email);

    const res  = await fetch(url);
    const data = await res.json().catch(() => ({}));

    if (data.status === 'ok') {
        // Apps Script confirmed usage is within limit and has incremented — proceed to N8N
        // Update local uses display
        currentUser.uses = data.uses !== undefined ? data.uses : currentUser.uses;
        updateUserBar();
        await executeGenerate(base64Data, prompt, timestamp, inputFilename, outputFilename, filename);

    } else if (data.status === 'limit_reached') {
        // Show limit reached message with next refresh date
        const nextRefresh = data.nextRefresh || 'the 1st of next month';
        showLoading(false);
        generateBtn.disabled = false;
        alert(`LIMIT REACHED. Next refresh will be on ${nextRefresh}.`);

    } else {
        throw new Error(data.message || 'Usage check failed.');
    }
}

// Execute the actual N8N call — payload 100% unchanged
async function executeGenerate(base64Data, prompt, timestamp, inputFilename, outputFilename, filename) {
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
        result?.imageUrl       ||
        result?.ghlImageUrl    ||
        result?.url;

    if (ghlImageUrl) {
        displayPreviewImage(ghlImageUrl);
        alert('Concept generated successfully!');
    } else {
        throw new Error('No image URL returned from webhook');
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

