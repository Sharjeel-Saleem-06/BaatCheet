/**
 * Projects Page
 * Manage projects and their conversations
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderOpen,
  Plus,
  Edit2,
  Trash2,
  MessageSquare,
  Loader2,
  X,
} from 'lucide-react';
import { projects, conversations } from '../services/api';
import clsx from 'clsx';

interface Project {
  id: string;
  name: string;
  description?: string;
  color: string;
  _count?: { conversations: number };
}

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
}

export default function Projects() {
  const navigate = useNavigate();
  const [projectList, setProjectList] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectConversations, setProjectConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', color: '#22c55e' });

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadProjectConversations(selectedProject.id);
    }
  }, [selectedProject]);

  const loadProjects = async () => {
    try {
      const { data } = await projects.list();
      setProjectList(data.data || []);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProjectConversations = async (projectId: string) => {
    try {
      const { data } = await projects.getConversations(projectId);
      setProjectConversations(data.data || []);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editProject) {
        await projects.update(editProject.id, formData);
      } else {
        await projects.create(formData);
      }
      loadProjects();
      setShowModal(false);
      setEditProject(null);
      setFormData({ name: '', description: '', color: '#22c55e' });
    } catch (error) {
      console.error('Failed to save project:', error);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Delete this project? Conversations will be moved to "No Project".')) return;
    try {
      await projects.delete(id);
      if (selectedProject?.id === id) {
        setSelectedProject(null);
        setProjectConversations([]);
      }
      loadProjects();
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  const openEditModal = (project: Project) => {
    setEditProject(project);
    setFormData({
      name: project.name,
      description: project.description || '',
      color: project.color,
    });
    setShowModal(true);
  };

  const colors = [
    '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899',
    '#f59e0b', '#ef4444', '#06b6d4', '#84cc16',
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-primary-400" size={32} />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Projects list */}
      <div className="w-80 border-r border-dark-700 bg-dark-800/50 flex flex-col">
        <div className="p-4 border-b border-dark-700">
          <button
            onClick={() => {
              setEditProject(null);
              setFormData({ name: '', description: '', color: '#22c55e' });
              setShowModal(true);
            }}
            className="w-full flex items-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
          >
            <Plus size={20} />
            <span>New Project</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {projectList.map((project) => (
            <div
              key={project.id}
              className={clsx(
                'group flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors',
                selectedProject?.id === project.id
                  ? 'bg-primary-500/10 text-primary-400'
                  : 'text-dark-400 hover:bg-dark-700 hover:text-dark-200'
              )}
              onClick={() => setSelectedProject(project)}
            >
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: project.color }}
              />
              <span className="flex-1 truncate">{project.name}</span>
              <span className="text-xs text-dark-500">
                {project._count?.conversations || 0}
              </span>
              <div className="hidden group-hover:flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditModal(project);
                  }}
                  className="p-1 hover:text-primary-400"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteProject(project.id);
                  }}
                  className="p-1 hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}

          {projectList.length === 0 && (
            <div className="text-center py-8 text-dark-500">
              <FolderOpen className="mx-auto mb-2" size={32} />
              <p>No projects yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Project details */}
      <div className="flex-1 p-6 overflow-y-auto">
        {selectedProject ? (
          <>
            <div className="flex items-center gap-4 mb-6">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: selectedProject.color + '20' }}
              >
                <FolderOpen style={{ color: selectedProject.color }} size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-dark-100">
                  {selectedProject.name}
                </h1>
                {selectedProject.description && (
                  <p className="text-dark-400">{selectedProject.description}</p>
                )}
              </div>
            </div>

            <h2 className="text-lg font-medium text-dark-200 mb-4">
              Conversations ({projectConversations.length})
            </h2>

            <div className="grid gap-3">
              {projectConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => navigate(`/chat/${conv.id}`)}
                  className="flex items-center gap-3 p-4 bg-dark-800 hover:bg-dark-700 rounded-xl text-left transition-colors"
                >
                  <MessageSquare className="text-dark-500" size={20} />
                  <div className="flex-1 min-w-0">
                    <p className="text-dark-200 truncate">
                      {conv.title || 'Untitled'}
                    </p>
                    <p className="text-xs text-dark-500">
                      {new Date(conv.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </button>
              ))}

              {projectConversations.length === 0 && (
                <div className="text-center py-8 text-dark-500">
                  <MessageSquare className="mx-auto mb-2" size={32} />
                  <p>No conversations in this project</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <FolderOpen className="text-dark-600 mb-4" size={48} />
            <h2 className="text-xl font-semibold text-dark-300 mb-2">
              Select a Project
            </h2>
            <p className="text-dark-500 max-w-md">
              Choose a project from the sidebar to view its conversations
            </p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-2xl border border-dark-700 w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-dark-700">
              <h2 className="text-lg font-semibold text-dark-100">
                {editProject ? 'Edit Project' : 'New Project'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-dark-500 hover:text-dark-300"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-primary-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">
                  Color
                </label>
                <div className="flex gap-2">
                  {colors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={clsx(
                        'w-8 h-8 rounded-lg transition-transform',
                        formData.color === color && 'ring-2 ring-white scale-110'
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 bg-dark-700 hover:bg-dark-600 text-dark-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
                >
                  {editProject ? 'Save' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
