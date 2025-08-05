# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This repository contains documentation and examples for OpenAI's image generation capabilities, specifically focused on the GPT Image model and related APIs. The repository consists of three main documentation files that serve as comprehensive guides for developers working with OpenAI's image generation tools.

## Architecture and Structure

### Documentation Files

The repository contains three key documentation files:

1. **image-generation-cookbook.md** - A practical cookbook/tutorial in Jupyter notebook format demonstrating:
   - Image generation from text prompts using GPT Image
   - Image editing and manipulation with reference images and masks
   - Multi-turn image generation workflows
   - Code examples in Python using the OpenAI client library
   - Practical examples like character creation, pixel art, and image masking

2. **image-generation-guide.md** - A comprehensive API guide covering:
   - Complete overview of OpenAI's Image API and Responses API
   - Detailed documentation of image generation, editing, and variations
   - Model comparison (GPT Image vs DALL·E 2/3)
   - Advanced features like streaming, multi-turn editing, and input fidelity
   - Customization options (size, quality, format, transparency)
   - Cost and token usage information

3. **image-generation-quick-start-documentation.md** - A focused quick-start guide for:
   - Basic image generation tool usage in the Responses API
   - Multi-turn editing workflows
   - Streaming capabilities
   - Supported models and prompting best practices

### Key Technologies and APIs

- **OpenAI GPT Image Model** (`gpt-image-1`) - Primary image generation model
- **OpenAI Responses API** - For conversational image generation workflows
- **OpenAI Image API** - Direct image generation and editing endpoints
- **Python OpenAI Client Library** - Primary development SDK
- **Base64 Image Encoding/Decoding** - Image data handling
- **PIL (Python Imaging Library)** - Image processing and manipulation

## Development Context

This is a documentation-only repository focused on:
- Providing comprehensive examples and tutorials for OpenAI image generation
- Demonstrating best practices for different image generation workflows
- Covering both beginner and advanced use cases
- Showing integration patterns with the OpenAI API

Since this repository contains only documentation files, there are no build processes, test suites, or development environment setup required. The content is primarily educational and reference material for developers implementing OpenAI's image generation capabilities in their own projects.

## Usage Notes

When working with this repository:
- The cookbook file contains executable Python examples that can be run in Jupyter notebooks
- Examples assume access to OpenAI API keys and appropriate billing setup
- Code examples use the latest OpenAI Python client library patterns
- All image generation examples use the `gpt-image-1` model unless specifically noted