/**
 * Swagger/OpenAPI Configuration
 * API documentation setup
 * 
 * @module Swagger
 */

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Application } from 'express';
import { config } from './index.js';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'BaatCheet API',
      version: '1.0.0',
      description: `
# BaatCheet API Documentation

Advanced AI Chat Application with Multi-Provider Support

## Features
- 🤖 Multi-provider AI (Groq, OpenRouter, DeepSeek, Gemini)
- 📸 Image upload, OCR, and vision analysis
- 💬 Real-time streaming chat
- 📁 Project organization
- 🔗 Conversation sharing
- 📤 Export to PDF, TXT, JSON, Markdown
- 📝 Conversation templates

## Authentication
BaatCheet uses **Clerk** for authentication. Most endpoints require a valid Clerk session token.

Include the token in the Authorization header:
\`\`\`
Authorization: Bearer <your-clerk-session-token>
\`\`\`

## Rate Limiting
- Global: 1000 requests per hour per IP
- Auth endpoints: 5 requests per 15 minutes
- Chat endpoints: 100-10000 requests per hour (tier-based)
- Image uploads: 50 per hour
- Audio transcription: 20 per hour
- Search: 100 per hour

## Tiers
- **Free**: 100 chat requests/hour
- **Pro**: 1000 chat requests/hour
- **Enterprise**: 10000 chat requests/hour
      `,
      contact: {
        name: 'Sharjeel Saleem',
        url: 'https://github.com/Sharjeel-Saleem-06',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.server.port}/api/v1`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            avatar: { type: 'string', nullable: true },
            preferences: {
              type: 'object',
              properties: {
                theme: { type: 'string', enum: ['light', 'dark'] },
                defaultModel: { type: 'string' },
                language: { type: 'string', enum: ['en', 'ur'] },
              },
            },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Conversation: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            model: { type: 'string' },
            systemPrompt: { type: 'string', nullable: true },
            tags: { type: 'array', items: { type: 'string' } },
            isPinned: { type: 'boolean' },
            isArchived: { type: 'boolean' },
            totalTokens: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Message: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            role: { type: 'string', enum: ['user', 'assistant', 'system'] },
            content: { type: 'string' },
            model: { type: 'string', nullable: true },
            tokens: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Project: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string', nullable: true },
            color: { type: 'string' },
            icon: { type: 'string' },
            conversationCount: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Template: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string', nullable: true },
            systemPrompt: { type: 'string' },
            category: { type: 'string' },
            icon: { type: 'string' },
            isDefault: { type: 'boolean' },
            usageCount: { type: 'integer' },
          },
        },
        ProviderHealth: {
          type: 'object',
          properties: {
            available: { type: 'boolean' },
            totalKeys: { type: 'integer' },
            availableKeys: { type: 'integer' },
            totalCapacity: { type: 'integer' },
            usedToday: { type: 'integer' },
            remainingCapacity: { type: 'integer' },
            percentUsed: { type: 'number' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string' },
            code: { type: 'string' },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication & user profile' },
      { name: 'Chat', description: 'Chat and AI endpoints' },
      { name: 'Conversations', description: 'Conversation management' },
      { name: 'Projects', description: 'Project management' },
      { name: 'Images', description: 'Image upload and processing' },
      { name: 'Audio', description: 'Voice input and transcription' },
      { name: 'Export', description: 'Conversation export' },
      { name: 'Share', description: 'Conversation sharing' },
      { name: 'Templates', description: 'Conversation templates' },
      { name: 'Analytics', description: 'Usage analytics and statistics' },
      { name: 'Webhooks', description: 'Webhook management' },
      { name: 'API Keys', description: 'API key management' },
      { name: 'Health', description: 'Health checks and monitoring' },
    ],
    paths: {
      // Auth
      '/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Register a new user',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password', 'name'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 6 },
                    name: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'User registered successfully' },
            400: { description: 'Validation error' },
            409: { description: 'Email already exists' },
          },
        },
      },
      '/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login user',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Login successful' },
            401: { description: 'Invalid credentials' },
          },
        },
      },
      '/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Get current user',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'User data' },
            401: { description: 'Unauthorized' },
          },
        },
      },
      // Chat
      '/chat/completions': {
        post: {
          tags: ['Chat'],
          summary: 'Send chat message',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['message'],
                  properties: {
                    message: { type: 'string' },
                    conversationId: { type: 'string', format: 'uuid' },
                    model: { type: 'string' },
                    systemPrompt: { type: 'string' },
                    stream: { type: 'boolean', default: true },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Chat response (streaming SSE)' },
            401: { description: 'Unauthorized' },
            429: { description: 'Rate limited' },
          },
        },
      },
      '/chat/providers/health': {
        get: {
          tags: ['Chat'],
          summary: 'Get provider health status',
          responses: {
            200: { description: 'Provider health status' },
          },
        },
      },
      '/chat/models': {
        get: {
          tags: ['Chat'],
          summary: 'List available AI models',
          responses: {
            200: { description: 'List of models' },
          },
        },
      },
      // Images
      '/images/upload': {
        post: {
          tags: ['Images'],
          summary: 'Upload images',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    images: {
                      type: 'array',
                      items: { type: 'string', format: 'binary' },
                    },
                    messageId: { type: 'string', format: 'uuid' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Images uploaded' },
            400: { description: 'No files uploaded' },
          },
        },
      },
      '/images/ocr': {
        post: {
          tags: ['Images'],
          summary: 'Extract text from image (OCR)',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    image: { type: 'string', format: 'binary' },
                    language: { type: 'string', default: 'eng' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'OCR result' },
          },
        },
      },
      '/images/analyze': {
        post: {
          tags: ['Images'],
          summary: 'Analyze image with AI',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    image: { type: 'string', format: 'binary' },
                    prompt: { type: 'string' },
                    language: { type: 'string', enum: ['en', 'ur'] },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Analysis result' },
          },
        },
      },
      // Export
      '/export/{conversationId}': {
        get: {
          tags: ['Export'],
          summary: 'Export conversation',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'conversationId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
            {
              name: 'format',
              in: 'query',
              schema: { type: 'string', enum: ['json', 'txt', 'md', 'pdf'] },
            },
          ],
          responses: {
            200: { description: 'Export file' },
            404: { description: 'Conversation not found' },
          },
        },
      },
      // Templates
      '/templates': {
        get: {
          tags: ['Templates'],
          summary: 'List templates',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'List of templates' },
          },
        },
        post: {
          tags: ['Templates'],
          summary: 'Create custom template',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'systemPrompt'],
                  properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    systemPrompt: { type: 'string' },
                    category: { type: 'string' },
                    icon: { type: 'string' },
                    isPublic: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Template created' },
          },
        },
      },
    },
  },
  apis: [], // We define paths inline above
};

const swaggerSpec = swaggerJsdoc(options);

export const setupSwagger = (app: Application): void => {
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info .title { color: #1e293b }
      `,
      customSiteTitle: 'BaatCheet API Documentation',
    })
  );

  // JSON endpoint for the spec
  app.get('/api/docs.json', (_req, res) => {
    res.json(swaggerSpec);
  });
};

export default swaggerSpec;
