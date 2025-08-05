/**
 * Simple Express.js proxy server for ImageGen
 * Handles CORS issues and provides secure API key management
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Rate limiting for image generation
class ImageRateLimiter {
    constructor(maxImages = 40, windowHours = 1) {
        this.maxImages = maxImages;
        this.windowMs = windowHours * 60 * 60 * 1000; // Convert hours to milliseconds
        this.requests = [];
    }

    // Clean up old requests outside the time window
    cleanupOldRequests() {
        const now = Date.now();
        this.requests = this.requests.filter(timestamp => 
            (now - timestamp) < this.windowMs
        );
    }

    // Check if we can make a new request
    canMakeRequest() {
        this.cleanupOldRequests();
        return this.requests.length < this.maxImages;
    }

    // Record a new request
    recordRequest() {
        this.cleanupOldRequests();
        if (this.canMakeRequest()) {
            this.requests.push(Date.now());
            return true;
        }
        return false;
    }

    // Get current usage stats
    getUsageStats() {
        this.cleanupOldRequests();
        const remaining = Math.max(0, this.maxImages - this.requests.length);
        const resetTime = this.requests.length > 0 ? 
            new Date(Math.min(...this.requests) + this.windowMs) : 
            new Date();
        
        return {
            used: this.requests.length,
            remaining: remaining,
            limit: this.maxImages,
            resetTime: resetTime,
            windowHours: this.windowMs / (60 * 60 * 1000)
        };
    }
}

// Initialize rate limiter
const imageLimiter = new ImageRateLimiter(40, 1); // 40 images per hour

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files
app.use(express.static(path.join(__dirname)));

// OpenAI API proxy endpoint
app.post('/api/openai/*', async (req, res) => {
    try {
        const openaiPath = req.path.replace('/api/openai', '');
        const openaiUrl = `https://api.openai.com/v1${openaiPath}`;
        
        // Check if this is an image generation request
        const isImageGeneration = req.body && req.body.tools && 
            req.body.tools.some(tool => tool.type === 'image_generation');
        
        // Apply rate limiting for image generation requests
        if (isImageGeneration) {
            if (!imageLimiter.canMakeRequest()) {
                const stats = imageLimiter.getUsageStats();
                return res.status(429).json({
                    error: {
                        message: `Rate limit exceeded. You've used ${stats.used}/${stats.limit} images this hour. Limit resets at ${stats.resetTime.toLocaleTimeString()}.`,
                        type: 'rate_limit_exceeded',
                        code: 'rate_limit_exceeded',
                        param: null
                    },
                    rateLimit: {
                        used: stats.used,
                        remaining: stats.remaining,
                        limit: stats.limit,
                        resetTime: stats.resetTime.toISOString(),
                        windowHours: stats.windowHours
                    }
                });
            }
            
            // Record the request (optimistic - we'll record it before the actual API call)
            if (!imageLimiter.recordRequest()) {
                const stats = imageLimiter.getUsageStats();
                return res.status(429).json({
                    error: {
                        message: `Rate limit exceeded. Limit resets at ${stats.resetTime.toLocaleTimeString()}.`,
                        type: 'rate_limit_exceeded',
                        code: 'rate_limit_exceeded'
                    }
                });
            }
        }
        
        // Get API key from environment or request headers
        const apiKey = process.env.OPENAI_API_KEY || req.headers['x-api-key'];
        
        if (!apiKey) {
            return res.status(401).json({
                error: {
                    message: 'OpenAI API key is required. Set OPENAI_API_KEY environment variable or include x-api-key header.'
                }
            });
        }

        const fetch = (await import('node-fetch')).default;
        
        // Handle streaming requests
        if (req.body.stream) {
            const response = await fetch(openaiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(req.body)
            });

            if (!response.ok) {
                const error = await response.json();
                return res.status(response.status).json(error);
            }

            // Set headers for Server-Sent Events
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('Access-Control-Allow-Origin', '*');

            // Pipe the streaming response
            response.body.pipe(res);
        } else {
            // Handle regular requests
            const response = await fetch(openaiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(req.body)
            });

            const data = await response.json();
            
            if (!response.ok) {
                return res.status(response.status).json(data);
            }

            res.json(data);
        }
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({
            error: {
                message: 'Internal server error: ' + error.message
            }
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Rate limit status endpoint
app.get('/api/rate-limit', (req, res) => {
    const stats = imageLimiter.getUsageStats();
    res.json({
        rateLimit: {
            used: stats.used,
            remaining: stats.remaining,
            limit: stats.limit,
            resetTime: stats.resetTime.toISOString(),
            windowHours: stats.windowHours,
            percentage: Math.round((stats.used / stats.limit) * 100)
        }
    });
});

// Serve the main app
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 ImageGen server running on http://localhost:${PORT}`);
    console.log(`📱 Open your browser to http://localhost:${PORT} to use the app`);
    
    if (process.env.OPENAI_API_KEY) {
        console.log('✅ OpenAI API key configured via environment variable');
    } else {
        console.log('⚠️  No OpenAI API key found in environment. Users will need to provide their own API key.');
    }
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});