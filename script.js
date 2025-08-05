class ImageGenApp {
    constructor() {
        this.currentMode = 'generate';
        this.settings = this.loadSettings();
        this.history = this.loadHistory();
        this.currentResponseId = null;
        this.streamingEnabled = false;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.applySettings();
        this.updateHistoryDisplay();
        this.updateRateLimitDisplay();
        
        // Update rate limit display every 30 seconds
        setInterval(() => {
            this.updateRateLimitDisplay();
        }, 30000);
    }

    bindEvents() {
        // Mode switching
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchMode(e.target.dataset.mode);
            });
        });

        // Generate image
        document.getElementById('generateBtn').addEventListener('click', () => {
            this.generateImage();
        });

        // Edit image
        document.getElementById('editBtn').addEventListener('click', () => {
            this.editImage();
        });

        // Continue editing (multi-turn) - right side (legacy)
        document.getElementById('continueEditBtn').addEventListener('click', () => {
            this.continueEditing();
        });

        // Continue editing (multi-turn) - left side (new)
        document.getElementById('continueEditBtnLeft').addEventListener('click', () => {
            this.continueEditingLeft();
        });

        // File upload
        const fileUpload = document.getElementById('fileUpload');
        const imageInput = document.getElementById('imageInput');
        
        fileUpload.addEventListener('click', () => imageInput.click());
        fileUpload.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileUpload.style.borderColor = '#667eea';
        });
        fileUpload.addEventListener('dragleave', () => {
            fileUpload.style.borderColor = '#ddd';
        });
        fileUpload.addEventListener('drop', (e) => {
            e.preventDefault();
            fileUpload.style.borderColor = '#ddd';
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileUpload(files[0]);
            }
        });
        
        imageInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileUpload(e.target.files[0]);
            }
        });

        // Settings modal
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.openModal('settingsModal');
        });
        document.getElementById('closeSettings').addEventListener('click', () => {
            this.closeModal('settingsModal');
        });
        document.getElementById('saveSettings').addEventListener('click', () => {
            this.saveSettings();
        });
        document.getElementById('resetSettings').addEventListener('click', () => {
            this.resetSettings();
        });

        // History modal
        document.getElementById('historyBtn').addEventListener('click', () => {
            this.openModal('historyModal');
        });
        document.getElementById('closeHistory').addEventListener('click', () => {
            this.closeModal('historyModal');
        });

        // Streaming toggle
        document.getElementById('streamToggle').addEventListener('click', () => {
            this.toggleStreaming();
        });

        // Settings sliders
        document.getElementById('compressionSlider').addEventListener('input', (e) => {
            document.querySelector('#compressionSlider + .slider-value').textContent = e.target.value + '%';
        });
        
        document.getElementById('partialImagesSlider').addEventListener('input', (e) => {
            document.querySelector('#partialImagesSlider + .slider-value').textContent = e.target.value;
        });

        // Close modals on backdrop click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                if (this.currentMode === 'generate') {
                    this.generateImage();
                } else {
                    this.editImage();
                }
            }
        });
    }

    switchMode(mode) {
        this.currentMode = mode;
        
        // Update mode buttons
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        // Update mode content
        document.querySelectorAll('.mode-content').forEach(content => {
            content.classList.toggle('active', content.id === mode + 'Mode');
        });

        // Reset multi-turn panel
        this.hideMultiturnPanel();
    }

    async generateImage() {
        const prompt = document.getElementById('promptInput').value.trim();
        
        if (!prompt) {
            this.showError('Please enter a description for your image');
            return;
        }


        this.showLoading('Generating your image...');

        try {
            const size = document.getElementById('sizeSelect').value;
            const quality = document.getElementById('qualitySelect').value;

            const requestBody = {
                model: "gpt-4o-mini",
                input: prompt,
                tools: [{
                    type: "image_generation",
                    ...(size !== 'auto' && { size }),
                    ...(quality !== 'auto' && { quality }),
                    ...(this.settings.transparentBackground && { background: "transparent" }),
                    ...(this.settings.outputFormat !== 'png' && { output_format: this.settings.outputFormat }),
                    ...(this.settings.compressionLevel !== 80 && { output_compression: this.settings.compressionLevel }),
                    ...(this.streamingEnabled && { partial_images: this.settings.partialImages })
                }]
            };

            if (this.streamingEnabled) {
                await this.generateWithStreaming(requestBody, prompt);
            } else {
                await this.generateWithoutStreaming(requestBody, prompt);
            }

        } catch (error) {
            console.error('Generation error:', error);
            this.showError('Failed to generate image: ' + error.message);
            // Update rate limit display after any error
            this.updateRateLimitDisplay();
        } finally {
            this.hideLoading();
        }
    }

    async generateWithoutStreaming(requestBody, prompt) {
        const response = await fetch('/api/openai/responses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const error = await response.json();
            
            // Check for rate limit error first
            if (this.handleApiError(error)) {
                return; // Rate limit handled, don't throw
            }
            
            throw new Error(error.error?.message || 'API request failed');
        }

        const data = await response.json();
        this.currentResponseId = data.id;

        const imageGenerationCall = data.output.find(output => output.type === 'image_generation_call');
        
        if (imageGenerationCall && imageGenerationCall.result) {
            const imageData = {
                id: Date.now().toString(),
                prompt: prompt,
                imageBase64: imageGenerationCall.result,
                timestamp: new Date().toISOString(),
                revisedPrompt: imageGenerationCall.revised_prompt,
                settings: {
                    size: document.getElementById('sizeSelect').value,
                    quality: document.getElementById('qualitySelect').value
                }
            };

            this.displayImage(imageData);
            this.addToHistory(imageData);
            this.showMultiturnPanel();
            // Update rate limit display after successful generation
            this.updateRateLimitDisplay();
        } else {
            throw new Error('No image generated in response');
        }
    }

    async generateWithStreaming(requestBody, prompt) {
        requestBody.stream = true;
        
        const response = await fetch('/api/openai/responses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'API request failed');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let partialImages = [];
        let finalImage = null;
        let responseId = null;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim());

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const eventData = JSON.parse(line.slice(6));
                        
                        if (eventData.type === 'response.image_generation_call.partial_image') {
                            const partialImageData = {
                                id: `partial-${eventData.partial_image_index}`,
                                prompt: prompt,
                                imageBase64: eventData.partial_image_b64,
                                timestamp: new Date().toISOString(),
                                isPartial: true,
                                partialIndex: eventData.partial_image_index
                            };
                            
                            this.displayPartialImage(partialImageData);
                            partialImages.push(partialImageData);
                        }
                        
                        if (eventData.type === 'response.done') {
                            responseId = eventData.response.id;
                            const imageCall = eventData.response.output.find(o => o.type === 'image_generation_call');
                            if (imageCall && imageCall.result) {
                                finalImage = {
                                    id: Date.now().toString(),
                                    prompt: prompt,
                                    imageBase64: imageCall.result,
                                    timestamp: new Date().toISOString(),
                                    revisedPrompt: imageCall.revised_prompt,
                                    settings: {
                                        size: document.getElementById('sizeSelect').value,
                                        quality: document.getElementById('qualitySelect').value
                                    }
                                };
                            }
                        }
                    } catch (e) {
                        console.warn('Failed to parse SSE data:', e);
                    }
                }
            }
        }

        if (finalImage) {
            this.currentResponseId = responseId;
            this.displayImage(finalImage, true); // Replace partial images
            this.addToHistory(finalImage);
            this.showMultiturnPanel();
            // Update rate limit display after successful generation
            this.updateRateLimitDisplay();
        }
    }

    async editImage() {
        const prompt = document.getElementById('editPromptInput').value.trim();
        const imageInput = document.getElementById('imageInput');
        
        if (!prompt) {
            this.showError('Please describe how you want to edit the image');
            return;
        }

        if (!imageInput.files[0]) {
            this.showError('Please upload an image to edit');
            return;
        }


        this.showLoading('Editing your image...');

        try {
            // Convert image to base64
            const imageBase64 = await this.fileToBase64(imageInput.files[0]);
            
            const requestBody = {
                model: "gpt-4o-mini",
                input: [
                    {
                        role: "user",
                        content: [
                            { type: "input_text", text: prompt },
                            { type: "input_image", image_url: `data:image/jpeg;base64,${imageBase64}` }
                        ]
                    }
                ],
                tools: [{
                    type: "image_generation",
                    ...(this.settings.outputFormat !== 'png' && { output_format: this.settings.outputFormat }),
                    ...(this.settings.compressionLevel !== 80 && { output_compression: this.settings.compressionLevel }),
                    ...(this.settings.transparentBackground && { background: "transparent" })
                }]
            };

            const response = await fetch('/api/openai/responses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'API request failed');
            }

            const data = await response.json();
            this.currentResponseId = data.id;

            const imageGenerationCall = data.output.find(output => output.type === 'image_generation_call');
            
            if (imageGenerationCall && imageGenerationCall.result) {
                const imageData = {
                    id: Date.now().toString(),
                    prompt: prompt,
                    imageBase64: imageGenerationCall.result,
                    timestamp: new Date().toISOString(),
                    revisedPrompt: imageGenerationCall.revised_prompt,
                    type: 'edit'
                };

                this.displayImage(imageData);
                this.addToHistory(imageData);
                this.showMultiturnPanel();
            }

        } catch (error) {
            console.error('Edit error:', error);
            this.showError('Failed to edit image: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    async continueEditing() {
        const prompt = document.getElementById('multiturnPrompt').value.trim();
        
        if (!prompt) {
            this.showError('Please describe the changes you want to make');
            return;
        }

        if (!this.currentResponseId) {
            this.showError('No previous response to continue from');
            return;
        }

        this.showLoading('Continuing to edit your image...');

        try {
            const requestBody = {
                model: "gpt-4o-mini",
                previous_response_id: this.currentResponseId,
                input: prompt,
                tools: [{
                    type: "image_generation",
                    ...(this.settings.outputFormat !== 'png' && { output_format: this.settings.outputFormat }),
                    ...(this.settings.compressionLevel !== 80 && { output_compression: this.settings.compressionLevel }),
                    ...(this.settings.transparentBackground && { background: "transparent" })
                }]
            };

            const response = await fetch('/api/openai/responses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'API request failed');
            }

            const data = await response.json();
            this.currentResponseId = data.id;

            const imageGenerationCall = data.output.find(output => output.type === 'image_generation_call');
            
            if (imageGenerationCall && imageGenerationCall.result) {
                const imageData = {
                    id: Date.now().toString(),
                    prompt: prompt,
                    imageBase64: imageGenerationCall.result,
                    timestamp: new Date().toISOString(),
                    revisedPrompt: imageGenerationCall.revised_prompt,
                    type: 'multiturn'
                };

                this.displayImage(imageData);
                this.addToHistory(imageData);
                
                // Clear the multiturn input
                document.getElementById('multiturnPrompt').value = '';
            }

        } catch (error) {
            console.error('Continue editing error:', error);
            this.showError('Failed to continue editing: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    async continueEditingLeft() {
        const prompt = document.getElementById('multiturnPromptLeft').value.trim();
        
        if (!prompt) {
            this.showError('Please describe the changes you want to make');
            return;
        }

        if (!this.currentResponseId) {
            this.showError('No previous response to continue from');
            return;
        }

        this.showLoading('Continuing to edit your image...');

        try {
            const requestBody = {
                model: "gpt-4o-mini",
                previous_response_id: this.currentResponseId,
                input: prompt,
                tools: [{
                    type: "image_generation",
                    ...(this.settings.outputFormat !== 'png' && { output_format: this.settings.outputFormat }),
                    ...(this.settings.compressionLevel !== 80 && { output_compression: this.settings.compressionLevel }),
                    ...(this.settings.transparentBackground && { background: "transparent" })
                }]
            };

            const response = await fetch('/api/openai/responses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'API request failed');
            }

            const data = await response.json();
            this.currentResponseId = data.id;

            const imageGenerationCall = data.output.find(output => output.type === 'image_generation_call');
            
            if (imageGenerationCall && imageGenerationCall.result) {
                const imageData = {
                    id: Date.now().toString(),
                    prompt: prompt,
                    imageBase64: imageGenerationCall.result,
                    timestamp: new Date().toISOString(),
                    revisedPrompt: imageGenerationCall.revised_prompt,
                    type: 'multiturn'
                };

                this.displayImage(imageData);
                this.addToHistory(imageData);
                
                // Clear the multiturn input
                document.getElementById('multiturnPromptLeft').value = '';
            }

        } catch (error) {
            console.error('Continue editing error:', error);
            this.showError('Failed to continue editing: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    displayImage(imageData, replaceFinal = false) {
        const outputContent = document.getElementById('outputContent');
        
        if (replaceFinal) {
            // Remove partial images and replace with final
            outputContent.querySelectorAll('.partial-image').forEach(img => img.remove());
        }
        
        // Remove empty state
        const emptyState = outputContent.querySelector('.empty-state');
        if (emptyState) {
            emptyState.remove();
        }

        const imageElement = this.createImageElement(imageData);
        outputContent.insertBefore(imageElement, outputContent.firstChild);
        
        // Fade in animation
        setTimeout(() => imageElement.classList.add('fade-in'), 10);
    }

    displayPartialImage(imageData) {
        const outputContent = document.getElementById('outputContent');
        
        // Remove empty state
        const emptyState = outputContent.querySelector('.empty-state');
        if (emptyState) {
            emptyState.remove();
        }

        // Check if this partial image index already exists
        const existingPartial = outputContent.querySelector(`[data-partial-index="${imageData.partialIndex}"]`);
        if (existingPartial) {
            // Update existing partial image
            const img = existingPartial.querySelector('.result-image');
            img.src = `data:image/png;base64,${imageData.imageBase64}`;
        } else {
            // Create new partial image
            const imageElement = this.createImageElement(imageData);
            imageElement.classList.add('partial-image');
            imageElement.dataset.partialIndex = imageData.partialIndex;
            
            outputContent.insertBefore(imageElement, outputContent.firstChild);
            setTimeout(() => imageElement.classList.add('fade-in'), 10);
        }
    }

    createImageElement(imageData) {
        const imageResult = document.createElement('div');
        imageResult.className = 'image-result';
        
        imageResult.innerHTML = `
            <div class="image-container">
                <img src="data:image/png;base64,${imageData.imageBase64}" alt="Generated image" class="result-image">
                ${imageData.isPartial ? '<div class="streaming-indicator">Generating...</div>' : ''}
                <div class="image-overlay">
                    <div class="image-actions">
                        <button class="btn btn-primary btn-sm" onclick="imageGenApp.downloadImage('${imageData.id}', '${imageData.imageBase64}')">
                            <i class="fas fa-download"></i>
                            Download
                        </button>
                    </div>
                </div>
            </div>
            <div class="image-info">
                <div class="image-prompt">${this.escapeHtml(imageData.prompt)}</div>
                <div class="image-details">
                    <span>${new Date(imageData.timestamp).toLocaleString()}</span>
                    ${imageData.settings ? `<span>${imageData.settings.size || 'auto'} • ${imageData.settings.quality || 'auto'}</span>` : ''}
                    ${imageData.type ? `<span>${imageData.type}</span>` : ''}
                </div>
            </div>
        `;

        return imageResult;
    }

    handleFileUpload(file) {
        if (!file.type.startsWith('image/')) {
            this.showError('Please upload a valid image file');
            return;
        }

        if (file.size > 50 * 1024 * 1024) { // 50MB limit
            this.showError('File size must be less than 50MB');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('uploadPreview');
            preview.src = e.target.result;
            preview.style.display = 'block';
            
            document.getElementById('editBtn').disabled = false;
        };
        reader.readAsDataURL(file);
    }

    showMultiturnPanel() {
        // Show left panel for generate mode, right panel for edit mode
        const leftPanel = document.getElementById('multiturnPanelLeft');
        const rightPanel = document.getElementById('multiturnPanel');
        
        if (!leftPanel || !rightPanel) {
            console.error('Multi-turn panels not found in DOM');
            return;
        }
        
        if (this.currentMode === 'generate') {
            leftPanel.classList.remove('hidden');
            rightPanel.classList.add('hidden');
        } else {
            rightPanel.classList.remove('hidden');
            leftPanel.classList.add('hidden');
        }
    }

    hideMultiturnPanel() {
        const leftPanel = document.getElementById('multiturnPanelLeft');
        const rightPanel = document.getElementById('multiturnPanel');
        
        if (leftPanel) leftPanel.classList.add('hidden');
        if (rightPanel) rightPanel.classList.add('hidden');
        this.currentResponseId = null;
    }

    toggleStreaming() {
        this.streamingEnabled = !this.streamingEnabled;
        const toggleBtn = document.getElementById('streamToggle');
        
        if (this.streamingEnabled) {
            toggleBtn.classList.add('active');
            toggleBtn.title = 'Disable streaming';
            toggleBtn.innerHTML = '<i class="fas fa-stream"></i>';
        } else {
            toggleBtn.classList.remove('active');
            toggleBtn.title = 'Enable streaming';
            toggleBtn.innerHTML = '<i class="far fa-stream"></i>';
        }
    }

    // Settings Management
    loadSettings() {
        const defaultSettings = {
            outputFormat: 'png',
            compressionLevel: 80,
            transparentBackground: false,
            partialImages: 2
        };

        try {
            const saved = localStorage.getItem('imageGenSettings');
            return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
        } catch {
            return defaultSettings;
        }
    }

    applySettings() {
        document.getElementById('formatSelect').value = this.settings.outputFormat;
        document.getElementById('compressionSlider').value = this.settings.compressionLevel;
        document.getElementById('backgroundToggle').checked = this.settings.transparentBackground;
        document.getElementById('partialImagesSlider').value = this.settings.partialImages;
        
        // Update slider displays
        document.querySelector('#compressionSlider + .slider-value').textContent = this.settings.compressionLevel + '%';
        document.querySelector('#partialImagesSlider + .slider-value').textContent = this.settings.partialImages;
    }

    saveSettings() {
        this.settings = {
            outputFormat: document.getElementById('formatSelect').value,
            compressionLevel: parseInt(document.getElementById('compressionSlider').value),
            transparentBackground: document.getElementById('backgroundToggle').checked,
            partialImages: parseInt(document.getElementById('partialImagesSlider').value)
        };

        localStorage.setItem('imageGenSettings', JSON.stringify(this.settings));
        this.closeModal('settingsModal');
        this.showSuccess('Settings saved successfully');
    }

    resetSettings() {
        if (confirm('Are you sure you want to reset all settings to defaults?')) {
            localStorage.removeItem('imageGenSettings');
            this.settings = this.loadSettings();
            this.applySettings();
            this.showSuccess('Settings reset to defaults');
        }
    }

    // History Management
    loadHistory() {
        try {
            const saved = localStorage.getItem('imageGenHistory');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    }

    addToHistory(imageData) {
        this.history.unshift(imageData);
        
        // Keep only last 5 images to prevent localStorage quota issues
        if (this.history.length > 5) {
            this.history = this.history.slice(0, 5);
        }
        
        try {
            localStorage.setItem('imageGenHistory', JSON.stringify(this.history));
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                console.warn('localStorage quota exceeded, clearing old history');
                // Clear history and try again with just the new item
                this.history = [imageData];
                try {
                    localStorage.setItem('imageGenHistory', JSON.stringify(this.history));
                } catch (secondError) {
                    console.error('Still cannot save to localStorage, disabling history:', secondError);
                    this.history = [];
                }
            } else {
                console.error('Error saving to localStorage:', error);
            }
        }
        this.updateHistoryDisplay();
    }

    updateHistoryDisplay() {
        const historyContent = document.getElementById('historyContent');
        
        if (this.history.length === 0) {
            historyContent.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <h4>No history yet</h4>
                    <p>Your generated images will be saved here</p>
                </div>
            `;
            return;
        }

        const historyGrid = document.createElement('div');
        historyGrid.className = 'history-grid';
        
        this.history.forEach(item => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.innerHTML = `
                <img src="data:image/png;base64,${item.imageBase64}" alt="History image" class="history-image">
                <div class="history-info">
                    <div class="history-prompt">${this.escapeHtml(item.prompt)}</div>
                    <div class="history-date">${new Date(item.timestamp).toLocaleDateString()}</div>
                </div>
            `;
            
            historyItem.addEventListener('click', () => {
                this.downloadImage(item.id, item.imageBase64);
            });
            
            historyGrid.appendChild(historyItem);
        });

        historyContent.innerHTML = '';
        historyContent.appendChild(historyGrid);
    }

    // Utility Functions
    downloadImage(id, base64Data) {
        const link = document.createElement('a');
        link.href = `data:image/png;base64,${base64Data}`;
        link.download = `generated-image-${id}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }


    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // UI Helper Functions
    openModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    }

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }

    showLoading(message = 'Processing...') {
        document.getElementById('loadingText').textContent = message;
        document.getElementById('loadingOverlay').classList.add('active');
    }

    hideLoading() {
        document.getElementById('loadingOverlay').classList.remove('active');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i>
            ${message}
        `;

        // Add to document
        document.body.appendChild(notification);

        // Add styles if not already present
        if (!document.querySelector('#notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 1rem 1.5rem;
                    border-radius: 8px;
                    color: white;
                    font-weight: 500;
                    z-index: 1002;
                    animation: slideIn 0.3s ease-out;
                    max-width: 400px;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .notification-error { background: #f56565; }
                .notification-success { background: #48bb78; }
                .notification-info { background: #4299e1; }
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(styles);
        }

        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }

    async updateRateLimitDisplay() {
        try {
            const response = await fetch('/api/rate-limit');
            if (!response.ok) {
                throw new Error(`Rate limit API failed: ${response.status}`);
            }
            const data = await response.json();
            const rateLimit = data.rateLimit;
            
            const display = document.getElementById('rateLimitDisplay');
            const text = document.getElementById('rateLimitText');
            
            if (!display || !text) return;
            
            // Update text
            text.textContent = `${rateLimit.remaining}/${rateLimit.limit} images left`;
            
            // Update styling based on usage
            display.classList.remove('warning', 'danger');
            
            if (rateLimit.percentage >= 90) {
                display.classList.add('danger');
            } else if (rateLimit.percentage >= 75) {
                display.classList.add('warning');
            }
            
            // Update tooltip with reset time
            const resetTime = new Date(rateLimit.resetTime);
            display.title = `Limit resets at ${resetTime.toLocaleTimeString()}`;
            
        } catch (error) {
            console.error('Failed to fetch rate limit status:', error);
            const text = document.getElementById('rateLimitText');
            if (text) text.textContent = 'Rate limit: Unknown';
        }
    }

    // Enhanced error handling for rate limits
    handleApiError(error) {
        if (error.error && error.error.type === 'rate_limit_exceeded') {
            this.showError(`Rate limit exceeded! ${error.error.message}`);
            this.updateRateLimitDisplay(); // Refresh the display
            return true;
        }
        return false;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the app
const imageGenApp = new ImageGenApp();