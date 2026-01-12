# CURSOR PROMPT: BaatCheet - Critical Chat & Image Fixes

You are fixing critical issues in the BaatCheet application to make it work exactly like ChatGPT with proper image handling, context management, and conversation flow.

---

## 🚨 CRITICAL ISSUES TO FIX

### Issue 1: POST /api/v1/chat/completions returns 401 Unauthorized
**Problem:** Chat API not working due to authentication error
**Root Cause:** Clerk token not being sent or invalid backend URL

### Issue 2: Image Upload Not Showing in Chat
**Problem:** When user uploads image, it should appear in chat immediately like ChatGPT
**Required:** Show image preview in chat, process OCR in background, don't show OCR text unless user asks

### Issue 3: Context Management Not Like ChatGPT
**Problem:** Each conversation should maintain its own context independently
**Required:** Separate contexts per conversation, proper message history, switching between conversations preserves context

---

## FIX 1: AUTHENTICATION & API CONNECTION

### Problem Analysis:
```
POST http://localhost:3000/api/v1/chat/completions 401 (Unauthorized)
```

**Issue:** Frontend calling localhost:3000 but backend is on localhost:5001

### Solution:

**Step 1: Fix API Base URL in Frontend**

File: `frontend/src/services/api.service.ts`

```typescript
import axios from 'axios';
import { useAuth } from '@clerk/clerk-react';

// CORRECT base URL - backend runs on port 5001
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds for streaming
});

// Request interceptor to add Clerk token
api.interceptors.request.use(
  async (config) => {
    // Get Clerk token
    const token = await window.Clerk?.session?.getToken();
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('Authentication failed. Please sign in again.');
      // Optionally redirect to sign-in
      // window.location.href = '/sign-in';
    }
    return Promise.reject(error);
  }
);

export default api;
```

**Step 2: Create .env file in frontend**

File: `frontend/.env`

```env
VITE_API_URL=http://localhost:5001
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
```

**Step 3: Fix Chat API Call**

File: `frontend/src/services/chat.service.ts`

```typescript
import api from './api.service';

export const chatService = {
  // Send message with proper authentication
  async sendMessage(conversationId: string | null, message: string, imageId?: string) {
    try {
      const response = await api.post('/api/v1/chat/completions', {
        conversationId,
        message,
        imageId, // Include if image uploaded
        stream: false
      });
      
      return response.data;
    } catch (error) {
      console.error('Chat API error:', error);
      throw error;
    }
  },

  // Streaming version
  async sendMessageStream(
    conversationId: string | null, 
    message: string, 
    imageId: string | null,
    onChunk: (chunk: string) => void,
    onComplete: (fullMessage: string) => void,
    onError: (error: Error) => void
  ) {
    try {
      // Get auth token
      const token = await window.Clerk?.session?.getToken();
      
      // Use EventSource for SSE
      const url = new URL(`${import.meta.env.VITE_API_URL}/api/v1/chat/completions`);
      
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          conversationId,
          message,
          imageId,
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullMessage = '';

      while (true) {
        const { done, value } = await reader!.read();
        
        if (done) {
          onComplete(fullMessage);
          break;
        }

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              onComplete(fullMessage);
              return;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullMessage += parsed.content;
                onChunk(parsed.content);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('Streaming error:', error);
      onError(error as Error);
    }
  }
};
```

---

## FIX 2: IMAGE UPLOAD WITH PREVIEW (LIKE CHATGPT)

### Required Behavior:
1. User clicks upload/paste image
2. Image appears immediately in chat (user message)
3. OCR processing happens in background (backend only)
4. User can type question about image
5. AI responds considering both image and text

### Implementation:

**Step 1: Image Upload Component**

File: `frontend/src/components/Chat/ImageUpload.tsx`

```typescript
import React, { useState } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import api from '../../services/api.service';

interface ImageUploadProps {
  onImageUploaded: (imageId: string, imageUrl: string) => void;
  conversationId: string | null;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ 
  onImageUploaded, 
  conversationId 
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be less than 10MB');
      return;
    }

    // Show preview immediately
    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);

    // Upload to backend
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('conversationId', conversationId || '');

      const response = await api.post('/api/v1/images/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      // Notify parent with image ID and URL
      onImageUploaded(response.data.imageId, response.data.url);
      
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
      setPreview(null);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          // Trigger file upload
          const input = document.createElement('input');
          input.type = 'file';
          input.files = new DataTransfer().files;
          const dt = new DataTransfer();
          dt.items.add(file);
          input.files = dt.files;
          
          handleFileSelect({ target: input } as any);
        }
      }
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        id="image-upload-input"
      />
      
      <label 
        htmlFor="image-upload-input"
        className="cursor-pointer p-2 hover:bg-gray-100 rounded-lg"
      >
        {uploading ? (
          <div className="animate-spin">⏳</div>
        ) : (
          <ImageIcon className="w-5 h-5 text-gray-600" />
        )}
      </label>

      {preview && (
        <div className="absolute bottom-20 left-4 bg-white border rounded-lg p-2 shadow-lg">
          <img src={preview} alt="Preview" className="w-32 h-32 object-cover" />
          <span className="text-xs text-gray-500">Uploading...</span>
        </div>
      )}
    </div>
  );
};
```

**Step 2: Update Chat Component to Show Images**

File: `frontend/src/components/Chat/ChatMessage.tsx`

```typescript
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string; // NEW: Image URL if message has image
  timestamp: Date;
}

export const ChatMessage: React.FC<{ message: Message }> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-4 p-4 ${isUser ? 'bg-transparent' : 'bg-gray-50'}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
        isUser ? 'bg-blue-500' : 'bg-green-500'
      }`}>
        <span className="text-white text-sm font-bold">
          {isUser ? 'U' : 'AI'}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-2">
        {/* Image (if present) - Show FIRST, like ChatGPT */}
        {message.imageUrl && (
          <div className="mb-3">
            <img 
              src={message.imageUrl} 
              alt="Uploaded" 
              className="max-w-sm rounded-lg border shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => window.open(message.imageUrl, '_blank')}
            />
          </div>
        )}

        {/* Text content */}
        <div className="prose prose-sm max-w-none">
          {isUser ? (
            // User messages: plain text
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            // AI messages: markdown with code highlighting
            <ReactMarkdown
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={vscDarkPlus}
                      language={match[1]}
                      PreTag="div"
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                }
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>

        {/* Timestamp */}
        <span className="text-xs text-gray-400">
          {message.timestamp.toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
};
```

**Step 3: Update Chat Page to Handle Images**

File: `frontend/src/pages/Chat.tsx`

```typescript
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { ChatMessage } from '../components/Chat/ChatMessage';
import { ImageUpload } from '../components/Chat/ImageUpload';
import { chatService } from '../services/chat.service';
import { Send } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  timestamp: Date;
}

export const Chat: React.FC = () => {
  const { conversationId } = useParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedImageId, setUploadedImageId] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load conversation messages
  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId);
    }
  }, [conversationId]);

  const loadConversation = async (convId: string) => {
    try {
      const response = await chatService.getConversation(convId);
      setMessages(response.messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      })));
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const handleImageUploaded = (imageId: string, imageUrl: string) => {
    setUploadedImageId(imageId);
    setUploadedImageUrl(imageUrl);
    
    // Show image preview in input area (optional)
    console.log('Image uploaded:', imageId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() && !uploadedImageId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim() || '(Image)',
      imageUrl: uploadedImageUrl || undefined,
      timestamp: new Date()
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Prepare AI message placeholder
    const aiMessageId = (Date.now() + 1).toString();
    const aiMessage: Message = {
      id: aiMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, aiMessage]);

    try {
      // Send to API with streaming
      await chatService.sendMessageStream(
        conversationId || null,
        input.trim(),
        uploadedImageId,
        // On chunk received
        (chunk) => {
          setMessages(prev => 
            prev.map(msg => 
              msg.id === aiMessageId 
                ? { ...msg, content: msg.content + chunk }
                : msg
            )
          );
        },
        // On complete
        (fullMessage) => {
          setMessages(prev => 
            prev.map(msg => 
              msg.id === aiMessageId 
                ? { ...msg, content: fullMessage }
                : msg
            )
          );
          setIsLoading(false);
          
          // Clear uploaded image after successful send
          setUploadedImageId(null);
          setUploadedImageUrl(null);
        },
        // On error
        (error) => {
          console.error('Streaming error:', error);
          setMessages(prev => 
            prev.map(msg => 
              msg.id === aiMessageId 
                ? { ...msg, content: 'Error: Failed to get response' }
                : msg
            )
          );
          setIsLoading(false);
        }
      );
    } catch (error) {
      console.error('Send message error:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.map(message => (
          <ChatMessage key={message.id} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Image Preview (if uploaded but not sent) */}
      {uploadedImageUrl && (
        <div className="p-4 bg-gray-50 border-t">
          <div className="relative inline-block">
            <img 
              src={uploadedImageUrl} 
              alt="To send" 
              className="max-h-32 rounded-lg border"
            />
            <button
              onClick={() => {
                setUploadedImageId(null);
                setUploadedImageUrl(null);
              }}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2 items-end">
          <ImageUpload 
            onImageUploaded={handleImageUploaded}
            conversationId={conversationId || null}
          />
          
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder={uploadedImageId ? "Ask about this image..." : "Type a message..."}
            className="flex-1 p-3 border rounded-lg resize-none"
            rows={1}
            disabled={isLoading}
          />
          
          <button
            type="submit"
            disabled={isLoading || (!input.trim() && !uploadedImageId)}
            className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
};
```

---

## FIX 3: BACKEND - OCR IN BACKGROUND, NOT IN RESPONSE

### Current Issue:
Backend might be returning OCR text immediately, exposing it to user

### Required Behavior:
1. Image uploaded → Save to DB with status "processing"
2. Queue OCR job in background
3. Return image ID and URL immediately
4. OCR runs async, saves extracted text to DB
5. When user asks about image, include OCR text in AI prompt (hidden from user)

### Implementation:

**Update Image Upload Controller**

File: `backend/src/controllers/image.controller.ts`

```typescript
export async function uploadImage(req, res) {
  try {
    const file = req.file; // From multer
    const { conversationId } = req.body;
    const userId = req.userId;

    // Save to database immediately with "processing" status
    const attachment = await prisma.attachment.create({
      data: {
        userId,
        conversationId: conversationId || null,
        type: 'image',
        originalFilename: file.originalname,
        storedFilename: file.filename,
        fileSize: file.size,
        mimeType: file.mimetype,
        storageUrl: file.path, // Cloudinary URL or local path
        status: 'processing', // NEW field
        extractedText: null // Will be filled by OCR job
      }
    });

    // Queue OCR job (async, don't wait)
    await queueOCR(attachment.id, userId);

    // Return immediately - DON'T wait for OCR
    res.json({
      imageId: attachment.id,
      url: attachment.storageUrl,
      status: 'uploaded' // User sees this
      // NO extracted text here!
    });

  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
}
```

**Update Chat Completion to Include OCR Secretly**

File: `backend/src/controllers/chat.controller.ts`

```typescript
export async function sendMessage(req, res) {
  const { conversationId, message, imageId, stream = true } = req.body;
  const userId = req.userId;

  try {
    // If image attached, get OCR text (hidden from user)
    let imageContext = '';
    if (imageId) {
      const attachment = await prisma.attachment.findUnique({
        where: { id: imageId }
      });

      if (attachment?.extractedText) {
        // Add OCR text to AI prompt (user never sees this)
        imageContext = `\n\n[Image contains the following text: "${attachment.extractedText}"]`;
      }
    }

    // Build AI prompt with hidden OCR text
    const enhancedMessage = message + imageContext;

    // Get conversation context
    const context = await contextManager.getContext(conversationId);

    // Add user message to context (WITHOUT imageContext)
    context.push({
      role: 'user',
      content: message // Original message only
    });

    // Call AI with enhanced message (WITH imageContext)
    const aiResponse = await aiRouter.chat({
      messages: [
        ...context.slice(0, -1),
        { role: 'user', content: enhancedMessage } // Enhanced for AI only
      ],
      stream
    });

    if (stream) {
      // Setup SSE streaming
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let fullResponse = '';

      for await (const chunk of aiResponse) {
        const content = chunk.choices[0]?.delta?.content || '';
        fullResponse += content;
        
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }

      res.write(`data: [DONE]\n\n`);
      res.end();

      // Save messages to DB after streaming
      await saveMessages(conversationId, userId, message, fullResponse, imageId);

    } else {
      // Non-streaming response
      const fullResponse = aiResponse.choices[0].message.content;

      await saveMessages(conversationId, userId, message, fullResponse, imageId);

      res.json({
        message: fullResponse,
        conversationId: conversationId || 'new'
      });
    }

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
}

async function saveMessages(
  conversationId: string | null,
  userId: string,
  userMessage: string,
  aiMessage: string,
  imageId: string | null
) {
  // Create conversation if doesn't exist
  let convId = conversationId;
  if (!convId) {
    const conversation = await prisma.conversation.create({
      data: {
        userId,
        title: userMessage.substring(0, 50) + '...'
      }
    });
    convId = conversation.id;
  }

  // Save user message
  await prisma.message.create({
    data: {
      conversationId: convId,
      role: 'user',
      content: userMessage,
      attachmentId: imageId // Link to image
    }
  });

  // Save AI message
  await prisma.message.create({
    data: {
      conversationId: convId,
      role: 'assistant',
      content: aiMessage
    }
  });
}
```

---

## FIX 4: CONTEXT MANAGEMENT (EXACTLY LIKE CHATGPT)

### Requirements:
- Each conversation has independent context
- Switching conversations preserves each context
- Context includes last N messages
- Images are part of context

### Implementation:

**Context Manager Service**

File: `backend/src/services/context-manager.service.ts`

```typescript
import { redis } from '../config/redis.config';
import { countTokens } from '../utils/token-counter';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  imageUrl?: string;
}

class ContextManager {
  private readonly MAX_TOKENS = 8000;
  private readonly MAX_MESSAGES = 50;

  async getContext(conversationId: string | null): Promise<Message[]> {
    if (!conversationId) {
      // New conversation - return only system prompt
      return [{
        role: 'system',
        content: 'You are a helpful AI assistant.'
      }];
    }

    // Try to get from cache first
    const cacheKey = `context:${conversationId}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    // Load from database
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            attachment: true // Include images
          }
        }
      }
    });

    if (!conversation) {
      return [{
        role: 'system',
        content: 'You are a helpful AI assistant.'
      }];
    }

    // Build context
    const context: Message[] = [{
      role: 'system',
      content: conversation.systemPrompt || 'You are a helpful AI assistant.'
    }];

    // Add messages (newest first for token counting)
    const messages = conversation.messages;
    let totalTokens = countTokens(context[0].content);

    // Start from most recent and go backwards
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      const tokens = countTokens(msg.content);

      if (totalTokens + tokens > this.MAX_TOKENS) {
        break; // Stop if exceeds limit
      }

      if (messages.length - i > this.MAX_MESSAGES) {
        break; // Stop if too many messages
      }

      context.splice(1, 0, {
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        imageUrl: msg.attachment?.storageUrl
      });

      totalTokens += tokens;
    }

    // Cache for 1 hour
    await redis.setex(cacheKey, 3600, JSON.stringify(context));

    return context;
  }

  async clearContext(conversationId: string) {
    const cacheKey = `context:${conversationId}`;
    await redis.del(cacheKey);
  }

  async updateContext(conversationId: string, newMessages: Message[]) {
    const cacheKey = `context:${conversationId}`;
    
    // Get current context
    const current = await this.getContext(conversationId);
    
    // Append new messages
    const updated = [...current, ...newMessages];
    
    // Trim if needed
    const trimmed = this.trimContext(updated);
    
    // Cache
    await redis.setex(cacheKey, 3600, JSON.stringify(trimmed));
  }

  private trimContext(messages: Message[]): Message[] {
    const systemPrompt = messages[0];
    const rest = messages.slice(1);

    let totalTokens = countTokens(systemPrompt.content);
    const kept: Message[] = [systemPrompt];

    // Keep newest messages within token limit
    for (let i = rest.length - 1; i >= 0; i--) {
      const msg = rest[i];
      const tokens = countTokens(msg.content);

      if (totalTokens + tokens > this.MAX_TOKENS) break;
      if (kept.length >= this.MAX_MESSAGES) break;

      kept.splice(1, 0, msg);
      totalTokens += tokens;
    }

    return kept;
  }
}

export const contextManager = new ContextManager();
```

---

## FIX 5: SIDEBAR - CONVERSATION LIST (LIKE CHATGPT)

**File: `frontend/src/components/Sidebar/ConversationList.tsx`**

```typescript
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MessageSquare, Trash2, Edit2 } from 'lucide-react';
import api from '../../services/api.service';

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
}

export const ConversationList: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { conversationId } = useParams();

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const response = await api.get('/api/v1/conversations');
      setConversations(response.data.conversations);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    navigate('/chat');
  };

  return (
    <div className="w-64 bg-gray-900 text-white h-screen flex flex-col">
      {/* New Chat Button */}
      <button
        onClick={handleNewChat}
        className="m-4 p-3 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center gap-2"
      >
        <MessageSquare className="w-5 h-5" />
        <span>New Chat</span>
      </button>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-400">Loading...</div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-400">No conversations yet</div>
        ) : (
          conversations.map(conv => (
            <div
              key={conv.id}
              onClick={() => navigate(`/chat/${conv.id}`)}
              className={`p-3 mx-2 mb-2 rounded-lg cursor-pointer group hover:bg-gray-800 ${
                conversationId === conv.id ? 'bg-gray-800' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{conv.title}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {conv.messageCount} messages
                  </p>
                </div>
                
                <button
                  onClick={(e) => handleDelete(conv.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
```

---

## FIX 6: PRISMA SCHEMA UPDATES

Add missing fields to support image context:

```prisma
model Message {
  id              String       @id @default(cuid())
  conversationId  String
  conversation    Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  role            String       // user, assistant, system
  content         String       @db.Text
  attachmentId    String?      // NEW: Link to image
  attachment      Attachment?  @relation(fields: [attachmentId], references: [id])
  tokens          Int?
  createdAt       DateTime     @default(now())
  
  @@index([conversationId])
  @@index([createdAt])
}

model Attachment {
  id              String    @id @default(cuid())
  userId          String
  conversationId  String?
  type            String    // image, audio
  originalFilename String
  storedFilename  String
  fileSize        Int
  mimeType        String
  storageUrl      String
  status          String    @default("processing") // NEW: processing, completed, failed
  extractedText   String?   @db.Text // OCR result (hidden from user)
  analysisResult  String?   @db.Text // Vision analysis
  createdAt       DateTime  @default(now())
  messages        Message[] // NEW: Reverse relation
  
  @@index([userId])
  @@index([conversationId])
  @@index([status])
}
```

Run migration:
```bash
cd backend
npx prisma migrate dev --name add_image_support
```

---

## FIX 7: ENVIRONMENT VARIABLES

**Frontend `.env`:**
```env
VITE_API_URL=http://localhost:5001
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxx
```

**Backend `.env`:**
```env
# Ensure correct port
PORT=5001

# Clerk
CLERK_SECRET_KEY=sk_test_xxx

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/baatcheet

# Redis
REDIS_URL=redis://localhost:6379

# File Storage (Cloudinary)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# AI Providers (all keys as before)
GROQ_API_KEY_1=gsk_xxx
# ... etc
```

---

## TESTING CHECKLIST

After implementing fixes, test:

### 1. Authentication
- [ ] Backend runs on port 5001
- [ ] Frontend calls correct API URL
- [ ] Clerk token is sent in Authorization header
- [ ] Chat API returns 200, not 401

### 2. Image Upload
- [ ] Click upload button → select image
- [ ] Image appears in chat immediately
- [ ] Image URL is correct (Cloudinary or local)
- [ ] OCR runs in background (check logs)
- [ ] OCR text saved to database
- [ ] User doesn't see OCR text directly

### 3. Image + Text Question
- [ ] Upload image
- [ ] Type question: "What's in this image?"
- [ ] AI responds considering image (uses OCR secretly)
- [ ] Response is relevant to image content

### 4. Context Management
- [ ] Start conversation 1, send 5 messages
- [ ] Start conversation 2, send 3 messages
- [ ] Switch back to conversation 1
- [ ] Conversation 1 context preserved
- [ ] Send new message, AI remembers previous messages
- [ ] Switch to conversation 2
- [ ] Conversation 2 context preserved

### 5. Multiple Images
- [ ] Upload image 1, ask question, get answer
- [ ] Upload image 2 in same conversation
- [ ] Ask about image 2
- [ ] AI can reference both images

### 6. Streaming
- [ ] Send message
- [ ] Response appears word-by-word (streaming)
- [ ] Complete message saved to database
- [ ] Context includes full message

---

## QUICK FIXES FOR COMMON ISSUES

### Issue: CORS Error
**Solution:** Add to backend `server.ts`:
```typescript
app.use(cors({
  origin: 'http://localhost:5173', // Vite dev server
  credentials: true
}));
```

### Issue: Image Not Showing
**Solution:** Check image URL format:
- Cloudinary: `https://res.cloudinary.com/...`
- Local: `http://localhost:5001/uploads/...`

Serve static files in backend:
```typescript
app.use('/uploads', express.static('uploads'));
```

### Issue: Streaming Not Working
**Solution:** Ensure SSE headers:
```typescript
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache');
res.setHeader('Connection', 'keep-alive');
res.setHeader('X-Accel-Buffering', 'no'); // Nginx
```

### Issue: Context Not Preserved
**Solution:** Check Redis connection:
```bash
redis-cli ping
# Should return PONG
```

---

## DELIVERABLES

After completing all fixes:

✅ Chat POST API works (returns 200, not 401)
✅ Image upload shows in chat immediately
✅ OCR processes in background (hidden from user)
✅ AI responds considering image content
✅ Context maintained per conversation
✅ Switching conversations preserves context
✅ Streaming responses work
✅ Multiple images in one conversation work
✅ **EXACTLY LIKE CHATGPT BEHAVIOR**

---

**Start by implementing these fixes in order. Test each fix before moving to the next. This will make BaatCheet work exactly like ChatGPT with proper image handling and context management.**