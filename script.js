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

/* NEW: Filename input */
const fileNameInput = document.getElementById('fileNameInput');

// Initialize
function init() {
    setupEventListeners();
}

// Setup Event Listeners
function setupEventListeners() {
    // Upload box click
    uploadBox.addEventListener('click', () => {
        fileInput.click();
    });

    // File input change
    fileInput.addEventListener('change', handleFileSelect);

    // Drag and drop
    uploadBox.addEventListener('dragover', handleDragOver);
    uploadBox.addEventListener('dragleave', handleDragLeave);
    uploadBox.addEventListener('drop', handleDrop);

    // Generate button
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

// Generate timestamp in yyyyMMdd-HHmmss format
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

    /* NEW: Read filename from textbox */
    const filename = fileNameInput ? fileNameInput.value.trim() : '';

    // Show loading
    showLoading(true);
    generateBtn.disabled = true;

    try {
        // Generate unified timestamp
        const timestamp = generateTimestamp();
        const inputFilename = `in_${timestamp}.jpg`;
        const outputFilename = `out_${timestamp}.jpg`;

        // Convert file to base64
        const imageBase64 = await fileToBase64(uploadedFile);
        
        // Remove data:image prefix to get pure base64
        const base64Data = imageBase64.split(',')[1];

        // Send to n8n webhook
        const result = await sendToN8N(
            base64Data,
            prompt,
            timestamp,
            inputFilename,
            outputFilename,
            filename
        );

        // Display result
        if (result && result.outputImageUrl) {
            displayPreviewImage(result.outputImageUrl);
            alert('Concept generated successfully!');
        } else {
            throw new Error('No generated image received');
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
                imageBase64: imageBase64,
                prompt: prompt,
                timestamp: timestamp,
                inputFilename: inputFilename,
                outputFilename: outputFilename,
                filename: filename
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
