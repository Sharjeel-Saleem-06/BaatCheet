/**
 * Services Index
 * Central export point for all services
 * 
 * @module Services
 */

// Core Services
export { providerManager, ProviderType, TaskType } from './ProviderManager.js';
export { aiRouter, Message, ChatRequest, ChatResponse, StreamChunk, MODELS } from './AIRouter.js';
export { chatService, ChatMessage, ChatOptions, ChatResult } from './ChatService.js';
export { contextManager } from './ContextManager.js';

// Vision & OCR Services
export { visionService, VisionResult, VisionOptions } from './VisionService.js';
export { ocrService, OCRResult, OCROptions } from './OCRService.js';
