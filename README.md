# ImageGen Pro - AI Image Generation Web App

A user-friendly web application for generating and editing images using OpenAI's GPT Image model. Designed for non-technical users with intuitive interfaces for both basic image generation and multi-turn editing workflows.

## Features

### 🎨 Image Generation
- **Simple Interface**: Easy-to-use text prompt input for describing desired images
- **Quick Settings**: Size and quality options with auto-recommendations
- **Streaming Support**: Watch images generate in real-time with partial image previews
- **Multiple Formats**: Support for PNG, JPEG, and WebP output formats

### ✏️ Image Editing
- **Drag & Drop Upload**: Intuitive file upload with preview
- **Multi-turn Editing**: Continue editing the same image across multiple prompts
- **Reference-based Generation**: Use uploaded images as references for new generations

### ⚙️ Advanced Settings
- **Output Customization**: Control format, compression, and transparency
- **Streaming Options**: Configurable partial image count (0-3)
- **API Configuration**: Secure API key storage in browser

### 📊 Management Features
- **History Tracking**: Automatic saving of generated images and prompts
- **Download & Share**: Easy download and clipboard copy functionality
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Quick Start

### Server Setup (Required)
This application requires a server to handle API requests securely. The OpenAI API key is configured server-side only.

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure API Key**:
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit .env and add your OpenAI API key
   OPENAI_API_KEY=sk-your-actual-openai-api-key-here
   ```

3. **Start the Server**:
   ```bash
   # Production
   npm start
   
   # Development (with auto-restart)
   npm run dev
   ```

4. **Open the App**:
   Open `http://localhost:3000` in your browser and start generating images!

### Production Deployment
1. **Set environment variables**:
   ```bash
   export OPENAI_API_KEY=sk-your-actual-key
   export NODE_ENV=production
   export PORT=3000
   ```

2. **Use a process manager** (PM2 recommended):
   ```bash
   npm install -g pm2
   pm2 start server.js --name imagegen-pro
   ```

3. **Set up reverse proxy** (nginx example):
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       location / {
           proxy_pass http://localhost:3000;
       }
   }
   ```

## Configuration

### OpenAI API Key (Server-Side Only)
1. Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Add it to your `.env` file:
   ```
   OPENAI_API_KEY=sk-your-actual-openai-api-key-here
   ```
3. Restart the server

**Security**: The API key is never exposed to the client. All API requests are proxied through the server.

### Advanced Settings
- **Output Format**: Choose between PNG (best quality), JPEG (smaller files), or WebP (modern format)
- **Compression Level**: Adjust compression for JPEG/WebP (0-100%)
- **Transparent Background**: Enable for PNG/WebP formats
- **Streaming Options**: Control number of partial images during generation

## Usage Guide

### Basic Image Generation
1. Select "Generate New Image" mode
2. Enter a detailed description of your desired image
3. Optionally adjust size and quality settings
4. Click "Generate Image"
5. Wait for the image to generate (with streaming enabled, you'll see partial previews)

### Image Editing
1. Select "Edit Existing Image" mode
2. Upload an image by clicking or dragging into the upload area
3. Describe how you want to edit the image
4. Click "Edit Image"

### Multi-turn Editing
1. After generating or editing an image, a "Continue editing" panel appears
2. Enter additional modifications you want to make
3. Click "Continue Editing" to refine the image further
4. Repeat as needed for iterative improvements

### Keyboard Shortcuts
- `Ctrl/Cmd + Enter`: Generate/Edit image
- `Escape`: Close modals

## Technical Details

### Technology Stack
- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+)
- **Styling**: CSS Grid, Flexbox, CSS Custom Properties
- **Icons**: Font Awesome 6
- **Fonts**: Inter (Google Fonts)
- **API**: OpenAI Responses API and Image API

### Browser Requirements
- Modern browsers with ES6+ support
- Chrome 60+, Firefox 55+, Safari 12+, Edge 79+
- JavaScript enabled
- LocalStorage support for settings and history

### API Integration
The app uses OpenAI's Responses API for:
- Basic image generation with `gpt-image-1` model
- Multi-turn editing workflows
- Streaming image generation
- Image editing with reference images

### File Structure
```
imagen/
├── index.html          # Main application HTML
├── styles.css          # Complete CSS styling
├── script.js           # Application JavaScript logic
├── README.md           # This documentation
└── CLAUDE.md          # Claude Code guidance
```

## Features in Detail

### Streaming Capabilities
- Real-time partial image previews during generation
- Configurable number of partial images (1-3)
- Visual indicators for streaming status
- Automatic replacement of partial images with final result

### Multi-turn Editing Workflow
- Maintains conversation context between edits
- Uses OpenAI's `previous_response_id` parameter
- Allows iterative refinement of images
- Preserves editing history

### User Experience Features
- **Loading States**: Clear visual feedback during API calls
- **Error Handling**: User-friendly error messages
- **Responsive Design**: Works on all device sizes
- **Keyboard Shortcuts**: Power user functionality
- **Auto-save**: Settings and history preserved locally

## Troubleshooting

### Common Issues
1. **CORS Errors**: Run the app through a local server, not file:// protocol
2. **API Key Issues**: Ensure your OpenAI API key is valid and has sufficient credits
3. **Large File Uploads**: Keep uploaded images under 50MB
4. **Slow Generation**: Complex prompts may take up to 2 minutes

### Browser Storage
- Settings are stored in localStorage
- History is limited to 50 most recent images
- Clear browser data to reset the app

## Security Features

✅ **Server-Side API Key Management**: API keys are stored securely on the server and never exposed to clients

✅ **No Client-Side Secrets**: All sensitive information is handled server-side

✅ **Proxy Architecture**: All OpenAI API calls are proxied through your server

### Additional Security Recommendations
- Use HTTPS in production
- Implement rate limiting per user/IP
- Add user authentication if needed
- Monitor API usage and costs
- Set up logging for security auditing

## Contributing

This is a complete, self-contained web application. To extend functionality:

1. **Add New Models**: Modify the API calls to support DALL-E 2/3
2. **Enhance UI**: Add new themes or layout options
3. **Add Features**: Implement batch generation, image variations, etc.
4. **Improve UX**: Add tutorials, tooltips, or guided workflows

## License

This project is provided as-is for organizational use. Modify and distribute according to your organization's policies.

## Support

For technical support:
1. Check browser console for error messages
2. Verify OpenAI API key and account status
3. Ensure stable internet connection
4. Try refreshing the application