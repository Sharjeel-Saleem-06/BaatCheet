/**
 * Projects Page
 * Manage projects with collaboration features
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
  Users,
  UserPlus,
  Settings,
  Check,
  Mail,
  Shield,
  Crown,
  Eye,
  FileText,
} from 'lucide-react';
import { projects } from '../services/api';
import { getClerkToken } from '../utils/auth';
import clsx from 'clsx';

interface Collaborator {
  id: string;
  userId: string;
  role: 'admin' | 'moderator' | 'viewer';
  canEdit: boolean;
  canDelete: boolean;
  canInvite: boolean;
  user?: {
    id: string;
    email: string;
    displayName?: string;
  };
}

interface Project {
  id: string;
  name: string;
  description?: string;
  color: string;
  emoji?: string;
  contextInstructions?: string;
  ownerId: string;
  isOwner?: boolean;
  collaborators?: Collaborator[];
  _count?: { conversations: number; collaborators: number };
}

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
}

interface Invitation {
  id: string;
  projectId: string;
  role: string;
  status: string;
  project?: {
    name: string;
    emoji?: string;
    color?: string;
  };
  inviter?: {
    displayName?: string;
    email?: string;
  };
}

export default function Projects() {
  const navigate = useNavigate();
  const [projectList, setProjectList] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectConversations, setProjectConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    description: '', 
    color: '#22c55e',
    emoji: '📁',
    contextInstructions: '',
  });
  
  // Collaboration states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'moderator' | 'viewer'>('viewer');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  
  // Pending invitations
  const [pendingInvitations, setPendingInvitations] = useState<Invitation[]>([]);
  const [showInvitations, setShowInvitations] = useState(false);

  useEffect(() => {
    loadProjects();
    loadPendingInvitations();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadProjectConversations(selectedProject.id);
      loadProjectDetails(selectedProject.id);
    }
  }, [selectedProject?.id]);

  const loadProjects = async () => {
    try {
      const { data } = await projects.list();
      const items = data?.data?.items || data?.data || [];
      setProjectList(Array.isArray(items) ? items : []);
    } catch (error) {
      console.error('Failed to load projects:', error);
      setProjectList([]);
    } finally {
      setLoading(false);
    }
  };

  const loadProjectDetails = async (projectId: string) => {
    try {
      const { data } = await projects.get(projectId);
      const project = data?.data;
      if (project) {
        setSelectedProject(project);
      }
    } catch (error) {
      console.error('Failed to load project details:', error);
    }
  };

  const loadProjectConversations = async (projectId: string) => {
    try {
      const { data } = await projects.getConversations(projectId);
      const items = data?.data?.items || data?.data || [];
      setProjectConversations(Array.isArray(items) ? items : []);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      setProjectConversations([]);
    }
  };

  const loadPendingInvitations = async () => {
    try {
      const token = await getClerkToken();
      const response = await fetch('/api/v1/projects/invitations/pending', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setPendingInvitations(data?.data?.items || data?.data?.invitations || []);
      }
    } catch (error) {
      console.error('Failed to load invitations:', error);
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
      setFormData({ name: '', description: '', color: '#22c55e', emoji: '📁', contextInstructions: '' });
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

  const handleInviteCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !inviteEmail) return;

    setInviting(true);
    setInviteError(null);

    try {
      const token = await getClerkToken();
      const response = await fetch(`/api/v1/projects/${selectedProject.id}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Provide more helpful error messages
        let errorMsg = data.error || 'Failed to send invitation';
        if (response.status === 500) {
          errorMsg = 'Server error. The user may need to sign up first, or there may be a configuration issue.';
        } else if (response.status === 404) {
          errorMsg = 'User not found. They must sign up to BaatCheet first.';
        }
        throw new Error(errorMsg);
      }

      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('viewer');
      loadProjectDetails(selectedProject.id);
    } catch (error) {
      const msg = (error as Error).message;
      setInviteError(msg === 'Failed to fetch' ? 'Network error. Please check your connection.' : msg);
    } finally {
      setInviting(false);
    }
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      const token = await getClerkToken();
      const response = await fetch(`/api/v1/projects/invitations/${invitationId}/respond`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accept: true }),
      });

      if (response.ok) {
        loadPendingInvitations();
        loadProjects();
      }
    } catch (error) {
      console.error('Failed to accept invitation:', error);
    }
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    try {
      const token = await getClerkToken();
      const response = await fetch(`/api/v1/projects/invitations/${invitationId}/respond`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accept: false }),
      });

      if (response.ok) {
        loadPendingInvitations();
      }
    } catch (error) {
      console.error('Failed to decline invitation:', error);
    }
  };

  const openEditModal = (project: Project) => {
    setEditProject(project);
    setFormData({
      name: project.name,
      description: project.description || '',
      color: project.color,
      emoji: project.emoji || '📁',
      contextInstructions: project.contextInstructions || '',
    });
    setShowModal(true);
  };

  const colors = [
    '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899',
    '#f59e0b', '#ef4444', '#06b6d4', '#84cc16',
  ];

  const emojis = ['📁', '💼', '🚀', '💡', '🎨', '📊', '🔬', '📚', '🎯', '⭐'];

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return Crown;
      case 'moderator': return Shield;
      default: return Eye;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'text-yellow-500';
      case 'moderator': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

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
              setFormData({ name: '', description: '', color: '#22c55e', emoji: '📁', contextInstructions: '' });
              setShowModal(true);
            }}
            className="w-full flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl transition-all shadow-lg shadow-primary-500/20"
          >
            <Plus size={20} />
            <span>New Project</span>
          </button>
        </div>

        {/* Pending invitations notification */}
        {pendingInvitations.length > 0 && (
          <button
            onClick={() => setShowInvitations(true)}
            className="mx-4 mt-4 flex items-center gap-2 px-3 py-2 bg-primary-500/10 border border-primary-500/30 rounded-lg text-primary-400 hover:bg-primary-500/20 transition-colors"
          >
            <Mail size={16} />
            <span className="text-sm">{pendingInvitations.length} pending invitation(s)</span>
          </button>
        )}

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {projectList.map((project) => (
            <div
              key={project.id}
              className={clsx(
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors',
                selectedProject?.id === project.id
                  ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                  : 'text-dark-400 hover:bg-dark-700 hover:text-dark-200'
              )}
              onClick={() => setSelectedProject(project)}
            >
              <span className="text-lg">{project.emoji || '📁'}</span>
              <span className="flex-1 truncate">{project.name}</span>
              {project._count?.collaborators && project._count.collaborators > 0 && (
                <div className="flex items-center gap-1 text-xs text-dark-500">
                  <Users size={12} />
                  {project._count.collaborators}
                </div>
              )}
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
                {project.isOwner && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteProject(project.id);
                    }}
                    className="p-1 hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
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
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
                  style={{ backgroundColor: selectedProject.color + '20' }}
                >
                  {selectedProject.emoji || '📁'}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-dark-100">
                    {selectedProject.name}
                  </h1>
                  {selectedProject.description && (
                    <p className="text-dark-400">{selectedProject.description}</p>
                  )}
                </div>
              </div>

              {/* Project actions */}
              <div className="flex items-center gap-2">
                {(selectedProject.isOwner || selectedProject.collaborators?.some(c => c.canInvite)) && (
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-dark-700 hover:bg-dark-600 text-dark-200 rounded-lg transition-colors"
                  >
                    <UserPlus size={18} />
                    <span>Invite</span>
                  </button>
                )}
                {selectedProject.isOwner && (
                  <button
                    onClick={() => openEditModal(selectedProject)}
                    className="flex items-center gap-2 px-4 py-2 bg-dark-700 hover:bg-dark-600 text-dark-200 rounded-lg transition-colors"
                  >
                    <Settings size={18} />
                    <span>Settings</span>
                  </button>
                )}
              </div>
            </div>

            {/* Context Instructions */}
            {selectedProject.contextInstructions && (
              <div className="mb-6 p-4 bg-dark-800 rounded-xl border border-dark-700">
                <div className="flex items-center gap-2 mb-2 text-dark-300">
                  <FileText size={16} />
                  <span className="font-medium">Project Context</span>
                </div>
                <p className="text-dark-400 text-sm">{selectedProject.contextInstructions}</p>
              </div>
            )}

            {/* Collaborators */}
            {selectedProject.collaborators && selectedProject.collaborators.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-dark-300 mb-3 flex items-center gap-2">
                  <Users size={16} />
                  Collaborators ({selectedProject.collaborators.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedProject.collaborators.map((collab) => {
                    const RoleIcon = getRoleIcon(collab.role);
                    return (
                      <div
                        key={collab.id}
                        className="flex items-center gap-2 px-3 py-1.5 bg-dark-800 rounded-lg border border-dark-700"
                      >
                        <RoleIcon size={14} className={getRoleColor(collab.role)} />
                        <span className="text-sm text-dark-300">
                          {collab.user?.displayName || collab.user?.email || 'Unknown'}
                        </span>
                        <span className="text-xs text-dark-500 capitalize">{collab.role}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <h2 className="text-lg font-medium text-dark-200 mb-4 flex items-center gap-2">
              <MessageSquare size={20} />
              Conversations ({projectConversations.length})
            </h2>

            <div className="grid gap-3">
              {projectConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => navigate(`/app/chat/${conv.id}`)}
                  className="flex items-center gap-3 p-4 bg-dark-800 hover:bg-dark-700 rounded-xl text-left transition-colors border border-dark-700 hover:border-dark-600"
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
                <div className="text-center py-12 text-dark-500">
                  <MessageSquare className="mx-auto mb-2" size={32} />
                  <p>No conversations in this project</p>
                  <button
                    onClick={() => navigate('/app/chat')}
                    className="mt-4 px-4 py-2 bg-primary-500/10 text-primary-400 rounded-lg hover:bg-primary-500/20 transition-colors"
                  >
                    Start a new chat
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <FolderOpen className="text-dark-600 mb-4" size={64} />
            <h2 className="text-2xl font-bold text-dark-300 mb-2">
              Select a Project
            </h2>
            <p className="text-dark-500 max-w-md">
              Choose a project from the sidebar to view its conversations and collaborators
            </p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-2xl border border-dark-700 w-full max-w-lg">
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

            <form onSubmit={handleCreateProject} className="p-4 space-y-5">
              {/* Name Input */}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Enter project name"
                  className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-dark-100 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 text-lg"
                />
              </div>

              {/* Emoji Selection */}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Icon
                </label>
                <div className="flex flex-wrap gap-2">
                  {emojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setFormData({ ...formData, emoji })}
                      className={clsx(
                        'w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all',
                        formData.emoji === emoji 
                          ? 'bg-primary-500/20 ring-2 ring-primary-500 scale-110' 
                          : 'bg-dark-700 hover:bg-dark-600 hover:scale-105'
                      )}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Description <span className="text-dark-500">(optional)</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  placeholder="Brief description of your project"
                  className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-dark-100 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 resize-none"
                />
              </div>

              {/* Context Instructions */}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Context Instructions <span className="text-dark-500">(AI follows these for all chats)</span>
                </label>
                <textarea
                  value={formData.contextInstructions}
                  onChange={(e) => setFormData({ ...formData, contextInstructions: e.target.value })}
                  rows={3}
                  placeholder="e.g., Always respond in formal English. This project is about mobile app development."
                  className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-dark-100 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 resize-none"
                />
              </div>

              {/* Color Selection */}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Color Theme
                </label>
                <div className="flex gap-3">
                  {colors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={clsx(
                        'w-10 h-10 rounded-xl transition-all',
                        formData.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-dark-800 scale-110' : 'hover:scale-105'
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-3 border-t border-dark-700">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 bg-dark-700 hover:bg-dark-600 text-dark-200 rounded-xl transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl transition-all font-semibold shadow-lg shadow-primary-500/20"
                >
                  {editProject ? 'Save Changes' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && selectedProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-2xl border border-dark-700 w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-dark-700">
              <h2 className="text-lg font-semibold text-dark-100">
                Invite Collaborator
              </h2>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteError(null);
                }}
                className="text-dark-500 hover:text-dark-300"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleInviteCollaborator} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  placeholder="colleague@example.com"
                  className="w-full px-4 py-2.5 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">
                  Role
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['admin', 'moderator', 'viewer'] as const).map((role) => {
                    const RoleIcon = getRoleIcon(role);
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setInviteRole(role)}
                        className={clsx(
                          'flex flex-col items-center gap-1 p-3 rounded-lg border transition-all',
                          inviteRole === role
                            ? 'bg-primary-500/10 border-primary-500/50'
                            : 'bg-dark-700 border-dark-600 hover:border-dark-500'
                        )}
                      >
                        <RoleIcon size={20} className={getRoleColor(role)} />
                        <span className="text-sm capitalize text-dark-200">{role}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-dark-500 mt-2">
                  {inviteRole === 'admin' && 'Full access: edit, delete, invite others'}
                  {inviteRole === 'moderator' && 'Can edit context and invite others'}
                  {inviteRole === 'viewer' && 'Can only view and create chats'}
                </p>
              </div>

              {inviteError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  {inviteError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteError(null);
                  }}
                  className="flex-1 px-4 py-2.5 bg-dark-700 hover:bg-dark-600 text-dark-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {inviting ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail size={18} />
                      Send Invite
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pending Invitations Modal */}
      {showInvitations && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-2xl border border-dark-700 w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-dark-700">
              <h2 className="text-lg font-semibold text-dark-100">
                Pending Invitations
              </h2>
              <button
                onClick={() => setShowInvitations(false)}
                className="text-dark-500 hover:text-dark-300"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
              {pendingInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="p-4 bg-dark-700 rounded-xl border border-dark-600"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xl">{invitation.project?.emoji || '📁'}</span>
                    <div>
                      <p className="font-medium text-dark-200">
                        {invitation.project?.name}
                      </p>
                      <p className="text-xs text-dark-500">
                        Invited by {invitation.inviter?.displayName || invitation.inviter?.email}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-dark-400 mb-3">
                    Role: <span className="capitalize">{invitation.role}</span>
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAcceptInvitation(invitation.id)}
                      className="flex-1 px-3 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors flex items-center justify-center gap-1"
                    >
                      <Check size={16} />
                      Accept
                    </button>
                    <button
                      onClick={() => handleDeclineInvitation(invitation.id)}
                      className="flex-1 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors flex items-center justify-center gap-1"
                    >
                      <X size={16} />
                      Decline
                    </button>
                  </div>
                </div>
              ))}

              {pendingInvitations.length === 0 && (
                <div className="text-center py-8 text-dark-500">
                  <Mail className="mx-auto mb-2" size={32} />
                  <p>No pending invitations</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
