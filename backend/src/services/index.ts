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

// Image Service
export { imageService, upload, UploadedImage, ImageAnalysisResult } from './ImageService.js';

// Export Service
export { exportService, ExportResult } from './ExportService.js';

// Share Service
export { shareService, ShareLink, SharedConversation } from './ShareService.js';

// Template Service
export { templateService, Template } from './TemplateService.js';
