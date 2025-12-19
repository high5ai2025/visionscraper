// Configuration
const CONFIG = {
    N8N_WEBHOOK: '' // n8n webhook URL
};

// State management
let uploadedFile = null;

// DOM Elements
const uploadBox = document.getElementById('uploadBox');
const fileInput = document.getElementById('fileInput');
const generateBtn = document.getElementById('generateBtn');
const designPrompt = document.getElementById('designPrompt');
const previewPlaceholder = document.getElementById('previewPlaceholder');
const previewImage = document.getElementById('previewImage');
const loadingOverlay = document.getElementById('loadingOverlay');

/* Filename input */
const fileNameInput = document.getElementById('fileNameInput');

// Initialize
function init() {
    setupEventListeners();
}

// Setup Event Listeners
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

// Handle file selection
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        uploadedFile = file;
        displayPreviewFromFile(file);
    }
}

// Display preview from file
function displayPreviewFromFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        displayPreviewImage(e.target.result);
    };
    reader.readAsDataURL(file);
}

// Display preview image
function displayPreviewImage(imageUrl) {
    previewPlaceholder.style.display = 'none';
    previewImage.src = imageUrl;
    previewImage.style.display = 'block';
    generateBtn.disabled = false;
}

// Handle drag over
function handleDragOver(event) {
    event.preventDefault();
    uploadBox.classList.add('dragover');
}

// Handle drag leave
function handleDragLeave(event) {
    event.preventDefault();
    uploadBox.classList.remove('dragover');
}

// Handle drop
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

// Generate timestamp
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

// Handle Generate
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
        const inputFilename = `in_${timestamp}.jpg`;
        const outputFilename = `out_${timestamp}.jpg`;

        const imageBase64 = await fileToBase64(uploadedFile);
        const base64Data = imageBase64.split(',')[1];

        const result = await sendToN8N(
            base64Data,
            prompt,
            timestamp,
            inputFilename,
            outputFilename,
            filename
        );

        /* ================================
           NEW: DISPLAY IMAGE FROM WEBHOOK
           EXPECTS A GHL HOSTED IMAGE URL
        ================================= */

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

// Send to n8n webhook
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
                filename
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

// Convert file to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Show/hide loading
function showLoading(show) {
    loadingOverlay.style.display = show ? 'flex' : 'none';
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);
