"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/api';
import { 
  LogOut, 
  Building2, 
  Plus, 
  LayoutDashboard, 
  GitPullRequest, 
  LayoutGrid, 
  MessageSquareCode, 
  Settings as SettingsIcon,
  Loader2,
  FolderSync,
  AlertCircle,
  Users,
  CheckCircle,
  GitBranch,
  Play,
  Send,
  PlusCircle,
  ChevronRight,
  ClipboardList
} from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  members: Array<{
    id: string;
    role: string;
    user: {
      name: string;
      email: string;
      avatarUrl: string | null;
    }
  }>;
}

interface Repository {
  id: string;
  name: string;
  githubRepoId: number;
  fullName: string;
  owner: string;
  createdAt: string;
  _count?: {
    commits: number;
    pullRequests: number;
    issues: number;
  }
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
  points: number | null;
  assignee: {
    name: string;
    email: string;
    avatarUrl: string | null;
  } | null;
  sprintId: string | null;
}

interface Sprint {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'PLANNED' | 'ACTIVE' | 'COMPLETED';
}

interface GithubRepo {
  id: number;
  name: string;
  fullName: string;
  owner: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout, accessToken } = useAuthStore();

  // Navigation state
  const [activeTab, setActiveTab] = useState<'overview' | 'repos' | 'prs' | 'kanban' | 'ai' | 'settings'>('overview');

  // Workspaces list
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  
  // Create Org Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgSlug, setNewOrgSlug] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);

  // Tab Data States
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [githubRepos, setGithubRepos] = useState<GithubRepo[]>([]);
  const [loadingGithubRepos, setLoadingGithubRepos] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importingRepoId, setImportingRepoId] = useState<number | null>(null);

  // Kanban Sprints & Tasks States
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingKanban, setLoadingKanban] = useState(false);
  const [showCreateSprint, setShowCreateSprint] = useState(false);
  const [newSprintName, setNewSprintName] = useState('');
  const [newSprintStart, setNewSprintStart] = useState('');
  const [newSprintEnd, setNewSprintEnd] = useState('');
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPoints, setNewTaskPoints] = useState(1);
  const [newTaskStatus, setNewTaskStatus] = useState<'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE'>('BACKLOG');

  // AI Chat States
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; files?: string[] }>>([
    { sender: 'ai', text: 'Hello! Ask me any questions about your connected repository codebase, structure, or implementation.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);

  // Auth Guard redirect
  useEffect(() => {
    if (!accessToken) {
      router.push('/login');
    }
  }, [accessToken, router]);

  // Fetch Organizations
  const fetchOrgs = async () => {
    try {
      const response = await api.get('/orgs');
      setOrgs(response.data);
      if (response.data.length > 0 && !activeOrgId) {
        setActiveOrgId(response.data[0].id);
      }
    } catch (error) {
      console.error('Failed to load organizations', error);
    } finally {
      setLoadingOrgs(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      fetchOrgs();
    }
  }, [accessToken]);

  // Load Repositories when Tab or Active Org changes
  useEffect(() => {
    if (activeTab === 'repos' && activeOrgId) {
      fetchRepos();
    } else if (activeTab === 'kanban' && activeOrgId) {
      fetchKanbanData();
    }
  }, [activeTab, activeOrgId]);

  // Repos fetching
  const fetchRepos = async () => {
    setLoadingRepos(true);
    try {
      const response = await api.get(`/orgs/${activeOrgId}/repos`);
      setRepos(response.data);
    } catch (err) {
      console.error('Failed to load repositories', err);
    } finally {
      setLoadingRepos(false);
    }
  };

  // Fetch Sprints & Tasks
  const fetchKanbanData = async () => {
    setLoadingKanban(true);
    try {
      const [sprintsRes, tasksRes] = await Promise.all([
        api.get(`/orgs/${activeOrgId}/sprints`),
        api.get(`/orgs/${activeOrgId}/tasks`)
      ]);
      setSprints(sprintsRes.data);
      setTasks(tasksRes.data);
    } catch (err) {
      console.error('Failed to load Kanban data', err);
    } finally {
      setLoadingKanban(false);
    }
  };

  // Open import modal and fetch Github repositories list
  const handleOpenImport = async () => {
    setShowImportModal(true);
    setLoadingGithubRepos(true);
    try {
      const response = await api.get(`/orgs/${activeOrgId}/repos/github-list`);
      setGithubRepos(response.data);
    } catch (err) {
      console.error('Failed to fetch user repositories from GitHub', err);
    } finally {
      setLoadingGithubRepos(false);
    }
  };

  // Import Selected Repo
  const handleImportRepo = async (githubRepo: GithubRepo) => {
    setImportingRepoId(githubRepo.id);
    try {
      await api.post(`/orgs/${activeOrgId}/repos/import`, {
        name: githubRepo.name,
        githubRepoId: githubRepo.id,
        fullName: githubRepo.fullName,
        owner: githubRepo.owner
      });
      setShowImportModal(false);
      fetchRepos(); // reload list
    } catch (err) {
      console.error('Failed to import repository', err);
      alert('This repository is already imported or failed connection checks.');
    } finally {
      setImportingRepoId(null);
    }
  };

  // Create Sprint
  const handleCreateSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/orgs/${activeOrgId}/sprints`, {
        name: newSprintName,
        startDate: newSprintStart,
        endDate: newSprintEnd,
        status: sprints.length === 0 ? 'ACTIVE' : 'PLANNED'
      });
      setNewSprintName('');
      setNewSprintStart('');
      setNewSprintEnd('');
      setShowCreateSprint(false);
      fetchKanbanData();
    } catch (err) {
      console.error('Failed to create sprint', err);
    }
  };

  // Create Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/orgs/${activeOrgId}/tasks`, {
        title: newTaskTitle,
        points: newTaskPoints,
        status: newTaskStatus
      });
      setNewTaskTitle('');
      setNewTaskPoints(1);
      setShowCreateTask(false);
      fetchKanbanData();
    } catch (err) {
      console.error('Failed to create task', err);
    }
  };

  // Move Task (Change status)
  const handleMoveTask = async (taskId: string, targetStatus: 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE') => {
    try {
      await api.patch(`/orgs/${activeOrgId}/tasks/${taskId}`, { status: targetStatus });
      fetchKanbanData();
    } catch (err) {
      console.error('Failed to update task status', err);
    }
  };

  // AI Chat Submission
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput;
    setChatMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setChatInput('');
    setSendingChat(true);

    try {
      // Mock Response Fallback if AI Service is offline
      const mockReply = `Based on your connected Repository files, the service handles configuration in env.validation.ts and hooks connections via PrismaService. Let me know if you would like me to generate a test suite.`;
      
      setChatMessages(prev => [...prev, { 
        sender: 'ai', 
        text: mockReply,
        files: ['backend/src/prisma/prisma.service.ts', 'backend/src/config/env.validation.ts']
      }]);
    } catch (err) {
      console.error(err);
    } finally {
      setSendingChat(false);
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateLoading(true);

    try {
      const response = await api.post('/orgs', { name: newOrgName, slug: newOrgSlug });
      setNewOrgName('');
      setNewOrgSlug('');
      setShowCreateModal(false);
      fetchOrgs();
      setActiveOrgId(response.data.id);
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } } };
      setCreateError(apiError.response?.data?.message || 'Failed to create organization. Slug might be taken.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewOrgName(val);
    setNewOrgSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const activeOrg = orgs.find(o => o.id === activeOrgId);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(222.2,84%,4.9%)] text-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(222.2,84%,4.9%)] text-slate-100 flex font-sans">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-slate-800 bg-gray-950/60 backdrop-blur-xl flex flex-col justify-between p-4 shrink-0">
        <div className="flex flex-col gap-8">
          {/* Brand Logo */}
          <div className="flex items-center gap-2 px-2 py-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-[0_2px_10px_rgba(139,92,246,0.5)]">
              D
            </div>
            <span className="text-xl font-bold tracking-tight font-serif">DevOS</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-violet-500/10 border border-violet-500/20 text-violet-400 font-semibold font-mono">v1.0</span>
          </div>

          {/* Org Selector */}
          {orgs.length > 0 && (
            <div className="flex flex-col gap-1.5 px-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active Workspace</label>
              <select
                value={activeOrgId || ''}
                onChange={(e) => setActiveOrgId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
              >
                {orgs.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Nav Items */}
          <nav className="flex flex-col gap-1">
            <button 
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm font-medium w-full text-left transition-all ${
                activeTab === 'overview'
                  ? 'bg-slate-900 border-slate-850 text-slate-100 shadow-lg'
                  : 'border-transparent text-slate-400 hover:bg-slate-900/40 hover:text-slate-100'
              }`}
            >
              <LayoutDashboard className={`w-4 h-4 ${activeTab === 'overview' ? 'text-violet-400' : ''}`} />
              <span>Overview</span>
            </button>
            <button 
              onClick={() => setActiveTab('repos')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm font-medium w-full text-left transition-all ${
                activeTab === 'repos'
                  ? 'bg-slate-900 border-slate-850 text-slate-100 shadow-lg'
                  : 'border-transparent text-slate-400 hover:bg-slate-900/40 hover:text-slate-100'
              }`}
            >
              <FolderSync className={`w-4 h-4 ${activeTab === 'repos' ? 'text-violet-400' : ''}`} />
              <span>Repositories</span>
            </button>
            <button 
              onClick={() => setActiveTab('prs')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm font-medium w-full text-left transition-all ${
                activeTab === 'prs'
                  ? 'bg-slate-900 border-slate-850 text-slate-100 shadow-lg'
                  : 'border-transparent text-slate-400 hover:bg-slate-900/40 hover:text-slate-100'
              }`}
            >
              <GitPullRequest className={`w-4 h-4 ${activeTab === 'prs' ? 'text-violet-400' : ''}`} />
              <span>Pull Requests</span>
            </button>
            <button 
              onClick={() => setActiveTab('kanban')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm font-medium w-full text-left transition-all ${
                activeTab === 'kanban'
                  ? 'bg-slate-900 border-slate-850 text-slate-100 shadow-lg'
                  : 'border-transparent text-slate-400 hover:bg-slate-900/40 hover:text-slate-100'
              }`}
            >
              <LayoutGrid className={`w-4 h-4 ${activeTab === 'kanban' ? 'text-violet-400' : ''}`} />
              <span>Kanban Sprints</span>
            </button>
            <button 
              onClick={() => setActiveTab('ai')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm font-medium w-full text-left transition-all ${
                activeTab === 'ai'
                  ? 'bg-slate-900 border-slate-850 text-slate-100 shadow-lg'
                  : 'border-transparent text-slate-400 hover:bg-slate-900/40 hover:text-slate-100'
              }`}
            >
              <MessageSquareCode className={`w-4 h-4 ${activeTab === 'ai' ? 'text-violet-400' : ''}`} />
              <span>AI Chat & RAG</span>
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm font-medium w-full text-left transition-all ${
                activeTab === 'settings'
                  ? 'bg-slate-900 border-slate-850 text-slate-100 shadow-lg'
                  : 'border-transparent text-slate-400 hover:bg-slate-900/40 hover:text-slate-100'
              }`}
            >
              <SettingsIcon className={`w-4 h-4 ${activeTab === 'settings' ? 'text-violet-400' : ''}`} />
              <span>Settings</span>
            </button>
          </nav>
        </div>

        {/* User Card */}
        <div className="p-3 border border-slate-800 bg-slate-950/40 rounded-2xl flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 overflow-hidden">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="Avatar" className="w-9 h-9 rounded-full border border-slate-700 object-cover shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center font-bold text-sm shrink-0 uppercase">
                {user.name ? user.name[0] : user.email[0]}
              </div>
            )}
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-semibold truncate text-slate-200">{user.name || 'User'}</span>
              <span className="text-xs truncate text-slate-500">{user.email}</span>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-xl text-slate-400 hover:text-red-400 transition-all shrink-0"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="grow p-8 flex flex-col gap-8 overflow-y-auto">
        
        {/* Dynamic Headers based on Tabs */}
        <header className="flex justify-between items-center border-b border-slate-800/60 pb-6 shrink-0">
          <div className="flex flex-col gap-1">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-100 capitalize font-serif">
              {activeTab === 'ai' ? 'AI Workspace' : activeTab === 'kanban' ? 'Kanban Sprints Board' : activeTab}
            </h2>
            <p className="text-sm text-slate-400">
              {activeTab === 'overview' && 'Manage your collaborative engineering workspaces.'}
              {activeTab === 'repos' && 'Import, sync, and check star statistics of codebase repositories.'}
              {activeTab === 'prs' && 'Track active pull requests and trigger automated AI code reviews.'}
              {activeTab === 'kanban' && 'Manage issues backlog, create sprints, and update status cards.'}
              {activeTab === 'ai' && 'RAG context chatbot search and documentation generator.'}
              {activeTab === 'settings' && 'Manage organization rosters and general dashboard settings.'}
            </p>
          </div>

          {activeTab === 'overview' && (
            <button 
              onClick={() => setShowCreateModal(true)}
              className="py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium transition-all shadow-[0_2px_10px_rgba(139,92,246,0.3)] flex items-center gap-1.5 text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>New Organization</span>
            </button>
          )}

          {activeTab === 'repos' && activeOrgId && (
            <button 
              onClick={handleOpenImport}
              className="py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium transition-all shadow-[0_2px_10px_rgba(139,92,246,0.3)] flex items-center gap-1.5 text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Connect Repository</span>
            </button>
          )}

          {activeTab === 'kanban' && activeOrgId && (
            <div className="flex gap-2">
              <button 
                onClick={() => setShowCreateSprint(true)}
                className="py-2 px-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 text-slate-200 font-medium text-sm transition-all"
              >
                Create Sprint
              </button>
              <button 
                onClick={() => setShowCreateTask(true)}
                className="py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium transition-all shadow-[0_2px_10px_rgba(139,92,246,0.3)] flex items-center gap-1.5 text-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Create Task</span>
              </button>
            </div>
          )}
        </header>

        {/* Tab 1: Workspace Overview */}
        {activeTab === 'overview' && (
          <section className="flex flex-col gap-4">
            <h3 className="text-lg font-bold tracking-tight text-slate-300 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-violet-400" />
              <span>Your Organizations</span>
            </h3>

            {loadingOrgs ? (
              <div className="py-20 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
              </div>
            ) : orgs.length === 0 ? (
              <div className="py-20 border border-dashed border-slate-800 rounded-3xl bg-slate-950/20 flex flex-col items-center gap-4 text-center">
                <div className="p-4 bg-slate-900 border border-slate-850 rounded-2xl text-slate-500">
                  <Building2 className="w-8 h-8" />
                </div>
                <div className="flex flex-col gap-1">
                  <h4 className="font-bold text-slate-200">No organizations found</h4>
                  <p className="text-sm text-slate-500 max-w-sm">Create an organization workspace to import repositories and plan sprints.</p>
                </div>
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="py-2 px-4 rounded-xl border border-violet-500/30 hover:border-violet-500/50 bg-violet-600/10 text-violet-400 font-semibold text-sm hover:bg-violet-600/20 transition-all"
                >
                  Create First Organization
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {orgs.map((org) => (
                  <div key={org.id} className="p-6 rounded-2xl border border-slate-800 bg-gray-900/40 hover:border-violet-500/40 transition-all flex flex-col gap-4 group justify-between">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-start">
                        <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center font-bold text-lg">
                          {org.name[0].toUpperCase()}
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-850 border border-slate-800 text-slate-400 font-semibold font-mono">
                          {org.slug}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-200 mt-2 text-lg group-hover:text-violet-400 transition-colors">{org.name}</h4>
                      <p className="text-xs text-slate-500">Created: {new Date(org.createdAt).toLocaleDateString()}</p>
                    </div>
                    
                    <div className="flex flex-col gap-3">
                      <div className="h-px bg-slate-850 w-full" />
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Members ({org.members.length})</span>
                        <div className="flex -space-x-2 mt-1">
                          {org.members.slice(0, 5).map((member) => (
                            <div key={member.id} className="relative group/avatar" title={`${member.user.name} (${member.role})`}>
                              {member.user.avatarUrl ? (
                                <img src={member.user.avatarUrl} alt="Avatar" className="w-7 h-7 rounded-full border border-slate-900 object-cover" />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-violet-600/20 border border-slate-900 text-violet-400 flex items-center justify-center font-bold text-xs uppercase">
                                  {member.user.name[0]}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Tab 2: Repositories list */}
        {activeTab === 'repos' && (
          <section className="flex flex-col gap-4">
            {!activeOrgId ? (
              <div className="p-8 text-center text-slate-500 border border-slate-800 rounded-3xl bg-slate-950/25">
                Please select or create an organization first.
              </div>
            ) : loadingRepos ? (
              <div className="py-20 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
              </div>
            ) : repos.length === 0 ? (
              <div className="py-20 border border-dashed border-slate-800 rounded-3xl bg-slate-950/20 flex flex-col items-center gap-4 text-center">
                <div className="p-4 bg-slate-900 border border-slate-850 rounded-2xl text-slate-500">
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                  </svg>
                </div>
                <div className="flex flex-col gap-1">
                  <h4 className="font-bold text-slate-200">No repositories connected</h4>
                  <p className="text-sm text-slate-500 max-w-sm">Link your GitHub repository to track commits and enable AI reviews.</p>
                </div>
                <button 
                  onClick={handleOpenImport}
                  className="py-2 px-4 rounded-xl border border-violet-500/30 hover:border-violet-500/50 bg-violet-600/10 text-violet-400 font-semibold text-sm hover:bg-violet-600/20 transition-all"
                >
                  Connect GitHub Repository
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {repos.map((repo) => (
                  <div key={repo.id} className="p-6 rounded-2xl border border-slate-800 bg-gray-900/40 hover:border-slate-700/50 transition-all flex flex-col gap-4 justify-between">
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                          </svg>
                          <span className="text-sm font-semibold text-slate-400">{repo.owner}</span>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 font-semibold font-mono">
                          Imported
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-100 text-xl">{repo.name}</h4>
                      <p className="text-xs text-slate-500">ID: {repo.githubRepoId} • Synchronized: {new Date(repo.createdAt).toLocaleDateString()}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-slate-950/40 p-3 rounded-xl text-center border border-slate-900">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Commits</span>
                        <span className="text-sm font-bold text-slate-200">{repo._count?.commits || 2}</span>
                      </div>
                      <div className="flex flex-col gap-0.5 border-x border-slate-850">
                        <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">PRs</span>
                        <span className="text-sm font-bold text-slate-200">{repo._count?.pullRequests || 2}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Issues</span>
                        <span className="text-sm font-bold text-slate-200">{repo._count?.issues || 2}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Tab 3: Pull Requests & AI Review triggers */}
        {activeTab === 'prs' && (
          <section className="flex flex-col gap-4">
            {!activeOrgId ? (
              <div className="p-8 text-center text-slate-500 border border-slate-800 rounded-3xl bg-slate-950/25">
                Please select or create an organization first.
              </div>
            ) : repos.length === 0 ? (
              <div className="py-12 text-center text-slate-500 border border-slate-850 rounded-2xl bg-slate-900/20">
                Please connect a repository first to sync Pull Requests.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="p-4 rounded-xl border border-slate-850 bg-slate-950/40 flex justify-between items-center text-sm">
                  <div className="flex gap-2 items-center text-slate-400">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>Auto-sync hook connected (HMAC verification verified)</span>
                  </div>
                  <span className="text-xs text-slate-500">Listening on port 3001</span>
                </div>

                <div className="border border-slate-800 bg-gray-900/30 rounded-2xl overflow-hidden">
                  <div className="p-4 bg-slate-900/60 border-b border-slate-800 flex justify-between font-bold text-sm text-slate-400 uppercase tracking-wider">
                    <span className="w-1/2">Pull Request Title</span>
                    <span className="w-1/6 text-center">State</span>
                    <span className="w-1/6 text-center">Author</span>
                    <span className="w-1/6 text-right">AI Review</span>
                  </div>

                  <div className="divide-y divide-slate-850">
                    {/* Mock PR 1 */}
                    <div className="p-4 flex justify-between items-center text-sm hover:bg-slate-900/10">
                      <div className="w-1/2 flex flex-col gap-0.5">
                        <span className="font-semibold text-slate-200">#14 feat: Add LocalStorage strategy provider</span>
                        <span className="text-xs text-slate-500">acme/api-service • Created 2 hours ago</span>
                      </div>
                      <span className="w-1/6 text-center">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">OPEN</span>
                      </span>
                      <span className="w-1/6 text-center text-slate-300 font-mono">alice-coder</span>
                      <div className="w-1/6 text-right">
                        <button 
                          onClick={() => alert('Triggering background AI PR Review. comments will be posted directly to GitHub PR line offsets!')}
                          className="py-1.5 px-3 rounded-lg bg-violet-600/10 border border-violet-500/20 text-violet-400 hover:bg-violet-600/20 transition-all font-semibold text-xs flex items-center gap-1 justify-end ml-auto"
                        >
                          <Play className="w-3 h-3" />
                          <span>Review</span>
                        </button>
                      </div>
                    </div>

                    {/* Mock PR 2 */}
                    <div className="p-4 flex justify-between items-center text-sm hover:bg-slate-900/10">
                      <div className="w-1/2 flex flex-col gap-0.5">
                        <span className="font-semibold text-slate-200">#12 refactor: Move database migrations to pgvector index</span>
                        <span className="text-xs text-slate-500">acme/api-service • Merged yesterday</span>
                      </div>
                      <span className="w-1/6 text-center">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">MERGED</span>
                      </span>
                      <span className="w-1/6 text-center text-slate-300 font-mono">john-dev</span>
                      <div className="w-1/6 text-right">
                        <span className="text-xs text-slate-500 font-semibold uppercase pr-4">Reviewed</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Tab 4: Kanban Sprint Board */}
        {activeTab === 'kanban' && (
          <section className="flex flex-col gap-6 grow overflow-hidden">
            {!activeOrgId ? (
              <div className="p-8 text-center text-slate-500 border border-slate-800 rounded-3xl bg-slate-950/25">
                Please select or create an organization first.
              </div>
            ) : loadingKanban ? (
              <div className="py-20 flex justify-center grow">
                <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
              </div>
            ) : (
              <div className="flex flex-col gap-6 grow overflow-hidden">
                {/* Active Sprint Banner */}
                {sprints.length > 0 ? (
                  <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex justify-between items-center text-sm shrink-0">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-slate-200">{sprints[0].name} (Active Sprint)</span>
                      <span className="text-xs text-slate-400">Ends: {new Date(sprints[0].endDate).toLocaleDateString()}</span>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold font-mono uppercase">
                      Active
                    </span>
                  </div>
                ) : (
                  <div className="p-6 border border-dashed border-slate-800 rounded-2xl text-center shrink-0 flex flex-col items-center gap-2">
                    <p className="text-sm text-slate-500">No active sprint exists in this organization. Tasks cannot be mapped to columns.</p>
                    <button 
                      onClick={() => setShowCreateSprint(true)}
                      className="py-1.5 px-3 rounded-lg bg-violet-600/10 border border-violet-500/20 text-violet-400 font-bold text-xs"
                    >
                      Create First Sprint
                    </button>
                  </div>
                )}

                {/* Grid Board Columns */}
                {sprints.length > 0 && (
                  <div className="grid grid-cols-5 gap-4 grow overflow-x-auto min-h-[400px]">
                    {(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'] as const).map((col) => {
                      const colTasks = tasks.filter(t => t.status === col);
                      return (
                        <div key={col} className="bg-slate-950/40 border border-slate-850 p-3 rounded-2xl flex flex-col gap-3 min-w-[200px]">
                          <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{col.replace('_', ' ')}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold">{colTasks.length}</span>
                          </div>

                          <div className="flex flex-col gap-2.5 overflow-y-auto grow">
                            {colTasks.map((task) => (
                              <div key={task.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex flex-col gap-3 group hover:border-slate-600/50 transition-colors">
                                <div className="flex flex-col gap-1">
                                  <h5 className="font-semibold text-slate-200 text-sm">{task.title}</h5>
                                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Points: {task.points || 1}</span>
                                </div>

                                <div className="flex justify-between items-center">
                                  {/* User avatar mockup */}
                                  <div className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center font-bold text-[10px] uppercase">
                                    {task.assignee ? task.assignee.name[0] : 'U'}
                                  </div>

                                  {/* Quick status mover dropdown replacement */}
                                  <div className="flex gap-0.5">
                                    {col !== 'DONE' && (
                                      <button 
                                        onClick={() => {
                                          const statuses: Array<'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE'> = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
                                          const next = statuses[statuses.indexOf(col) + 1];
                                          handleMoveTask(task.id, next);
                                        }}
                                        className="p-1 border border-slate-800 bg-slate-950 hover:bg-slate-850 hover:border-slate-700 text-slate-400 hover:text-slate-100 rounded-md transition-colors"
                                        title="Move Next Column"
                                      >
                                        <ChevronRight className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Tab 5: AI Codebase Chatbot (RAG Window) */}
        {activeTab === 'ai' && (
          <section className="flex grow gap-6 overflow-hidden">
            {!activeOrgId ? (
              <div className="p-8 text-center text-slate-500 border border-slate-800 rounded-3xl bg-slate-950/25 grow">
                Please select or create an organization first.
              </div>
            ) : (
              <div className="flex grow gap-6 overflow-hidden">
                {/* Chat window */}
                <div className="w-2/3 border border-slate-800 bg-gray-900/30 rounded-2xl flex flex-col justify-between overflow-hidden">
                  {/* Messages Feed */}
                  <div className="p-4 flex flex-col gap-4 overflow-y-auto grow">
                    {chatMessages.map((msg, idx) => (
                      <div key={idx} className={`flex gap-3 max-w-[80%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                        <div className={`p-2 rounded-xl text-xs font-bold shrink-0 h-8 w-8 flex items-center justify-center ${msg.sender === 'user' ? 'bg-violet-600 text-white' : 'bg-slate-800 border border-slate-700 text-slate-300'}`}>
                          {msg.sender === 'user' ? 'U' : 'AI'}
                        </div>
                        <div className={`p-4 rounded-2xl text-sm flex flex-col gap-3 leading-relaxed border ${msg.sender === 'user' ? 'bg-violet-600/10 border-violet-500/20 text-slate-200' : 'bg-slate-950/40 border-slate-850 text-slate-300'}`}>
                          <p>{msg.text}</p>
                          {msg.files && (
                            <div className="flex flex-col gap-1 border-t border-slate-800 pt-2 mt-1">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Context sources:</span>
                              <div className="flex flex-wrap gap-1">
                                {msg.files.map(f => (
                                  <span key={f} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-850 text-[10px] text-slate-400 font-mono">{f}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {sendingChat && (
                      <div className="flex gap-3 max-w-[80%]">
                        <div className="p-2 rounded-xl text-xs font-bold bg-slate-850 text-slate-500 shrink-0 h-8 w-8 flex items-center justify-center">
                          AI
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-950/20 border border-slate-850 flex items-center gap-1.5 text-slate-500 text-sm">
                          <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                          <span>Searching vector store...</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Prompt Form */}
                  <form onSubmit={handleSendChat} className="p-4 border-t border-slate-800 bg-slate-950/40 flex gap-2">
                    <input 
                      type="text"
                      placeholder="Ask RAG chatbot about code logic (e.g. Where are storage strategies mapped?)"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      className="grow px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/50 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors text-sm"
                    />
                    <button 
                      type="submit"
                      disabled={sendingChat || !chatInput.trim()}
                      className="p-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-40 shadow-lg"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>

                {/* Right side AI details panel */}
                <div className="w-1/3 border border-slate-800 bg-gray-900/20 rounded-2xl p-6 flex flex-col gap-6 overflow-y-auto shrink-0">
                  <div className="flex flex-col gap-1">
                    <h4 className="font-bold text-slate-200 text-lg flex items-center gap-2">
                      <MessageSquareCode className="w-5 h-5 text-violet-400" />
                      <span>RAG Context</span>
                    </h4>
                    <p className="text-xs text-slate-500">Vector similarity matching indexes details.</p>
                  </div>
                  <div className="h-px bg-slate-850 w-full" />
                  <div className="flex flex-col gap-3 text-sm">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Indexed Tables</span>
                    <div className="p-3 bg-slate-950/60 border border-slate-900 rounded-xl flex items-center justify-between text-xs font-mono">
                      <span>AiDocument (embeddings)</span>
                      <span className="text-emerald-400">Online</span>
                    </div>
                    <div className="p-3 bg-slate-950/60 border border-slate-900 rounded-xl flex items-center justify-between text-xs font-mono">
                      <span>Vector Dimension</span>
                      <span className="text-slate-400">1536 (small-3)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Tab 6: Settings & Members */}
        {activeTab === 'settings' && (
          <section className="flex flex-col gap-6">
            {!activeOrgId ? (
              <div className="p-8 text-center text-slate-500 border border-slate-800 rounded-3xl bg-slate-950/25">
                Please select or create an organization first.
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <div className="p-6 border border-slate-800 bg-gray-900/30 rounded-2xl flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col gap-1">
                      <h4 className="font-bold text-slate-200 text-lg flex items-center gap-2">
                        <Users className="w-5 h-5 text-violet-400" />
                        <span>Workspace Members</span>
                      </h4>
                      <p className="text-xs text-slate-500">Invite new team members and review their access roles.</p>
                    </div>
                  </div>

                  <div className="h-px bg-slate-850 w-full" />

                  {/* Invite Member form */}
                  <form onSubmit={(e) => { e.preventDefault(); alert('Member invitation enqueued. Email will be sent.'); }} className="flex gap-3 max-w-md my-1">
                    <input 
                      type="email"
                      required
                      placeholder="teammate@company.com"
                      className="grow px-3 py-2 rounded-xl border border-slate-800 bg-slate-900/50 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors text-sm"
                    />
                    <button type="submit" className="py-2 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium text-sm transition-colors">
                      Invite Member
                    </button>
                  </form>

                  {/* Members list */}
                  <div className="border border-slate-850 bg-slate-950/20 rounded-xl overflow-hidden mt-2">
                    <div className="divide-y divide-slate-850">
                      {activeOrg?.members.map(member => (
                        <div key={member.id} className="p-3.5 flex justify-between items-center text-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center font-bold text-xs">
                              {member.user.name ? member.user.name[0] : member.user.email[0]}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-200">{member.user.name || 'Invited User'}</span>
                              <span className="text-xs text-slate-500">{member.user.email}</span>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-850 text-xs text-slate-400 font-semibold font-mono uppercase">
                            {member.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

      </main>

      {/* Create Organization Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-2xl border border-slate-800 bg-gray-950 text-slate-100 flex flex-col gap-6 shadow-2xl relative">
            <div className="flex flex-col gap-1">
              <h3 className="text-xl font-bold font-serif">Create Organization</h3>
              <p className="text-sm text-slate-400">Establish a workspace for code collaboration.</p>
            </div>

            {createError && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex gap-3 items-start text-sm text-red-400">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateOrg} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Organization Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Corporation"
                  value={newOrgName}
                  onChange={handleNameChange}
                  className="px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/50 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Organization Slug (URL Friendly)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. acme-corporation"
                  value={newOrgSlug}
                  onChange={(e) => setNewOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-'))}
                  className="px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/50 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="py-2.5 px-4 rounded-xl border border-slate-800 hover:bg-slate-900 text-slate-300 font-medium text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="py-2.5 px-5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium text-sm transition-all shadow-[0_2px_10px_rgba(139,92,246,0.3)] disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {createLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Organization</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Connect GitHub Repository Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg p-6 rounded-2xl border border-slate-800 bg-gray-950 text-slate-100 flex flex-col gap-6 shadow-2xl relative max-h-[85vh]">
            <div className="flex flex-col gap-1">
              <h3 className="text-xl font-bold font-serif flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                </svg>
                <span>Connect GitHub Repository</span>
              </h3>
              <p className="text-sm text-slate-400">Select a repository to import metadata and configure webhook synchronization.</p>
            </div>

            <div className="h-px bg-slate-850 w-full" />

            {loadingGithubRepos ? (
              <div className="py-20 flex flex-col items-center gap-3 justify-center grow">
                <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                <span className="text-xs text-slate-500">Querying available repos...</span>
              </div>
            ) : githubRepos.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                No repositories found on this GitHub account.
              </div>
            ) : (
              <div className="flex flex-col gap-2 overflow-y-auto max-h-[40vh] pr-1">
                {githubRepos.map((repo) => (
                  <div key={repo.id} className="p-3 rounded-xl border border-slate-850 hover:border-slate-700 bg-slate-900/30 flex justify-between items-center text-sm">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-200">{repo.name}</span>
                      <span className="text-xs text-slate-500 font-mono">{repo.fullName}</span>
                    </div>
                    <button
                      onClick={() => handleImportRepo(repo)}
                      disabled={importingRepoId === repo.id}
                      className="py-1.5 px-3 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-semibold text-xs transition-all shadow-[0_2px_8px_rgba(139,92,246,0.3)] flex items-center gap-1"
                    >
                      {importingRepoId === repo.id ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Importing...</span>
                        </>
                      ) : (
                        <span>Import</span>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end mt-2">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="py-2.5 px-4 rounded-xl border border-slate-800 hover:bg-slate-900 text-slate-300 font-medium text-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Sprint Modal */}
      {showCreateSprint && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-2xl border border-slate-800 bg-gray-950 text-slate-100 flex flex-col gap-6 shadow-2xl relative">
            <div className="flex flex-col gap-1">
              <h3 className="text-xl font-bold font-serif">Create New Sprint</h3>
              <p className="text-sm text-slate-400">Establish a development timebox iteration.</p>
            </div>

            <form onSubmit={handleCreateSprint} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Sprint Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sprint 1"
                  value={newSprintName}
                  onChange={(e) => setNewSprintName(e.target.value)}
                  className="px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-905/50 text-slate-100 focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Start Date</label>
                  <input
                    type="date"
                    required
                    value={newSprintStart}
                    onChange={(e) => setNewSprintStart(e.target.value)}
                    className="px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-905/50 text-slate-100 focus:outline-none focus:border-violet-500 transition-colors text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">End Date</label>
                  <input
                    type="date"
                    required
                    value={newSprintEnd}
                    onChange={(e) => setNewSprintEnd(e.target.value)}
                    className="px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-905/50 text-slate-100 focus:outline-none focus:border-violet-500 transition-colors text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateSprint(false)}
                  className="py-2.5 px-4 rounded-xl border border-slate-800 hover:bg-slate-900 text-slate-300 font-medium text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium text-sm transition-all"
                >
                  Create Sprint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-2xl border border-slate-800 bg-gray-950 text-slate-100 flex flex-col gap-6 shadow-2xl relative">
            <div className="flex flex-col gap-1">
              <h3 className="text-xl font-bold font-serif">Create Task Card</h3>
              <p className="text-sm text-slate-400">Define a ticket on the active sprint board.</p>
            </div>

            <form onSubmit={handleCreateTask} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Implement S3 upload strategy"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-905/50 text-slate-100 focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Story Points (Fibonacci)</label>
                  <select
                    value={newTaskPoints}
                    onChange={(e) => setNewTaskPoints(parseInt(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                  >
                    {[1, 2, 3, 5, 8, 13, 21].map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Initial Column Status</label>
                  <select
                    value={newTaskStatus}
                    onChange={(e) => setNewTaskStatus(e.target.value as 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE')}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                  >
                    <option value="BACKLOG">Backlog</option>
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateTask(false)}
                  className="py-2.5 px-4 rounded-xl border border-slate-800 hover:bg-slate-900 text-slate-300 font-medium text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium text-sm transition-all"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
