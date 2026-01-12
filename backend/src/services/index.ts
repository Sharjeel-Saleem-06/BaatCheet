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

// Audio Service
export { audioService, audioUpload, TranscriptionResult, AudioUploadResult } from './AudioService.js';

// Whisper Service (Advanced Transcription)
export { whisperService, TranscriptionOptions } from './WhisperService.js';

// Language Handler (Roman Urdu Support)
export { languageHandler, LanguageDetectionResult, TranslationResult } from './LanguageHandler.js';

// Prompt Analyzer (Intent & Format Detection)
export { promptAnalyzer, PromptAnalysis } from './PromptAnalyzer.js';

// Response Formatter (Post-Processing)
export { responseFormatter, FormattingOptions, FormattedResponse } from './ResponseFormatter.js';

// Export Service
export { exportService, ExportResult } from './ExportService.js';

// Share Service
export { shareService, ShareLink, SharedConversation } from './ShareService.js';

// Template Service
export { templateService, Template } from './TemplateService.js';

// Analytics Service
export { analyticsService, DashboardStats, UsageOverTime, TokenBreakdown } from './AnalyticsService.js';

// Webhook Service
export { webhookService, WebhookEvent, WebhookPayload, WebhookConfig } from './WebhookService.js';

// API Key Service
export { apiKeyService, ApiKeyInfo, ApiKeyValidation } from './ApiKeyService.js';

// Queue Service (Background Jobs)
export { 
  queueService, 
  ocrQueue, 
  audioQueue, 
  exportQueue, 
  webhookQueue, 
  analyticsQueue,
  triggerWebhooks 
} from './QueueService.js';

// Cache Service (Redis)
export { 
  cacheService, 
  CACHE_PREFIXES, 
  CACHE_TTL 
} from './CacheService.js';

// Profile Learning Service (Memory System)
export { 
  profileLearning, 
  ExtractedFact, 
  UserProfileContext,
  ConversationSummaryData 
} from './ProfileLearningService.js';

// Web Search Service (Real-time Search)
export { 
  webSearch, 
  SearchResult, 
  WebSearchResponse, 
  SearchOptions 
} from './WebSearchService.js';

// Text-to-Speech Service
export { 
  ttsService, 
  TTSOptions, 
  TTSResult, 
  VoiceInfo 
} from './TTSService.js';

// PDF Parser Service
export { 
  pdfParser, 
  PDFContent, 
  PDFMetadata, 
  PDFAnalysisResult 
} from './PDFParserService.js';

// Data Analysis Service
export { 
  dataAnalysis, 
  DataSummary, 
  ChartData, 
  AnalysisResult 
} from './DataAnalysisService.js';

// Image Generation Service
export {
  imageGeneration,
  ImageGenerationOptions,
  ImageGenerationResult,
  UserGenerationStatus,
} from './ImageGenerationService.js';

// Chat Tags Service
export {
  chatTags,
  ChatTagType,
  DetectedTag,
  TagProcessingResult,
} from './ChatTagsService.js';

// Mode Detector Service
export {
  modeDetector,
  AIMode,
  ModeConfig,
  DetectedModeResult,
  MODE_CONFIGS,
} from './ModeDetectorService.js';
