import mongoose, { Schema, Document } from 'mongoose';
import { IProject } from '../types/index.js';

export interface IProjectDocument extends Omit<IProject, '_id'>, Document {}

const projectSchema = new Schema<IProjectDocument>(
  {
    projectId: {
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
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      default: null,
      maxlength: 500,
    },
    conversationCount: {
      type: Number,
      default: 0,
    },
    color: {
      type: String,
      default: '#1e293b', // Navy blue from logo
    },
    icon: {
      type: String,
      default: 'folder',
    },
  },
  {
    timestamps: true,
  }
);

export const Project = mongoose.model<IProjectDocument>('Project', projectSchema);
export default Project;
