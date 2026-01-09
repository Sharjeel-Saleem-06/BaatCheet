import mongoose, { Schema, Document } from 'mongoose';
import { IConversation, IMessage, IAttachment } from '../types/index.js';

export interface IConversationDocument extends Omit<IConversation, '_id'>, Document {}

const attachmentSchema = new Schema<IAttachment>(
  {
    attachmentId: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['image', 'document'],
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    extractedText: {
      type: String,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: false }
);

const messageSchema = new Schema<IMessage>(
  {
    messageId: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['system', 'user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
    },
    model: {
      type: String,
      default: null,
    },
    tokens: {
      type: Number,
      default: 0,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const conversationSchema = new Schema<IConversationDocument>(
  {
    conversationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    projectId: {
      type: String,
      default: null,
      index: true,
    },
    title: {
      type: String,
      required: true,
      default: 'New Conversation',
      maxlength: 200,
    },
    messages: {
      type: [messageSchema],
      default: [],
    },
    systemPrompt: {
      type: String,
      default: null,
    },
    model: {
      type: String,
      default: 'llama-3.1-70b-versatile',
    },
    tags: {
      type: [String],
      default: [],
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    totalTokens: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for searching
conversationSchema.index({ title: 'text', 'messages.content': 'text' });

export const Conversation = mongoose.model<IConversationDocument>(
  'Conversation',
  conversationSchema
);
export default Conversation;
