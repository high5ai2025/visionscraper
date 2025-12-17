# DirtLogic AI - Yard Reimagination Tool

A Gemini-powered yard design visualization tool that transforms photos of yards into professionally designed concepts.

## Overview

DirtLogic AI allows users to upload photos of their yards and receive AI-generated design concepts based on custom prompts. The application integrates with HighLevel for form management, n8n for workflow automation, and Google's Gemini for AI-powered image generation.

## Features

- 📸 Photo upload with drag & drop support
- 🎨 Custom design prompt input
- 🤖 Gemini AI-powered concept generation
- 💾 Automatic saving to HighLevel media repository
- 📱 Fully responsive design
- ⚡ Real-time preview and loading states

## Architecture

### Workflow

1. User uploads yard photo via embedded HighLevel form
2. Image is stored in HighLevel
3. Application retrieves image via GET webhook
4. User enters design prompt
5. Image + prompt sent to n8n webhook
6. n8n processes image with Gemini AI
7. Generated concept returned to frontend
8. Result saved to HighLevel media repository

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/dirtlogic-ai.git
cd dirtlogic-ai
```

2. No build process required - this is a static HTML/CSS/JS application

## Configuration

### Required Webhook URLs

Update the `CONFIG` object in `script.js` with your webhook endpoints:

```javascript
const CONFIG = {
    GHL_WEBHOOK_GET: '',      // HighLevel GET webhook URL
    N8N_WEBHOOK: '',           // n8n webhook URL for image processing
    GHL_MEDIA_REPO: ''        // HighLevel media repository endpoint
};
```

### HighLevel Form Integration

1. Generate your HighLevel form embed code
2. Replace the placeholder content in `index.html` within the `#ghl-form-container` div
3. Ensure your form includes a file upload field
4. Configure form to trigger webhook on successful submission

### n8n Workflow Setup

Your n8n workflow should:
- Accept POST requests with JSON payload containing:
  - `image`: Base64 encoded image or image URL
  - `prompt`: Design description text
  - `timestamp`: ISO timestamp
- Process image with Gemini AI
- Return JSON with:
  - `generatedImageUrl`: URL of the generated concept image

Example expected response:
```json
{
  "generatedImageUrl": "https://example.com/generated-image.jpg",
  "success": true
}
```

## File Structure

```
dirtlogic-ai/
├── index.html          # Main HTML structure
├── styles.css          # Styling and layout
├── script.js           # Application logic and API integration
└── README.md          # This file
```

## Usage

### Development

Simply open `index.html` in a web browser or use a local server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve
```

### Production Deployment

Deploy to any static hosting service:
- GitHub Pages
- Netlify
- Vercel
- AWS S3 + CloudFront
- Any web server

## API Endpoints

### GET: HighLevel Image Retrieval

**Endpoint:** `CONFIG.GHL_WEBHOOK_GET`

Query Parameters:
- `contactId`: HighLevel contact ID
- `fileId`: Uploaded file ID

### POST: n8n Image Processing

**Endpoint:** `CONFIG.N8N_WEBHOOK`

Request Body:
```json
{
  "image": "base64_string_or_url",
  "prompt": "Design description",
  "timestamp": "ISO_timestamp"
}
```

### POST: HighLevel Media Repository

**Endpoint:** `CONFIG.GHL_MEDIA_REPO`

Request Body:
```json
{
  "imageUrl": "generated_image_url",
  "prompt": "Design description",
  "timestamp": "ISO_timestamp",
  "type": "generated_concept"
}
```

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Customization

### Styling

Modify `styles.css` to customize:
- Color scheme
- Typography
- Layout dimensions
- Responsive breakpoints

### Functionality

Modify `script.js` to customize:
- Webhook payload structure
- Error handling
- Loading states
- File validation

## Troubleshooting

### Image Upload Not Working
- Verify HighLevel form is properly embedded
- Check form submission webhook is configured
- Ensure file upload field is included in form

### Generation Fails
- Verify n8n webhook URL is correct
- Check n8n workflow is active
- Ensure Gemini API credentials are configured in n8n

### Preview Not Displaying
- Check browser console for errors
- Verify image URLs are accessible
- Ensure CORS is properly configured on image hosts

## Security Considerations

- Never commit webhook URLs to public repositories
- Use environment variables or configuration files (gitignored)
- Implement rate limiting on webhook endpoints
- Validate file types and sizes server-side
- Sanitize user inputs before processing

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

[Your License Here]

## Support

For issues and questions, please open an issue on GitHub or contact support.

## Acknowledgments

- Powered by Google Gemini AI
- Integrated with HighLevel CRM
- Workflow automation via n8n
