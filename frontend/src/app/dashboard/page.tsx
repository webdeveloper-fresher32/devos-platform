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
  AlertCircle
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

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout, accessToken } = useAuthStore();

  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  
  // Create Org Modal/Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgSlug, setNewOrgSlug] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);

  // Auth Protection
  useEffect(() => {
    if (!accessToken) {
      router.push('/login');
    }
  }, [accessToken, router]);

  const fetchOrgs = async () => {
    try {
      const response = await api.get('/orgs');
      setOrgs(response.data);
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

  // Handle Slug generation on Name change
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewOrgName(val);
    setNewOrgSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateLoading(true);

    try {
      await api.post('/orgs', { name: newOrgName, slug: newOrgSlug });
      setNewOrgName('');
      setNewOrgSlug('');
      setShowCreateModal(false);
      fetchOrgs(); // refresh organizations list
    } catch (err: unknown) {
      const apiError = err as {
        response?: {
          data?: {
            message?: string;
          };
        };
      };
      setCreateError(apiError.response?.data?.message || 'Failed to create organization. Slug might be taken.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

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
            <span className="text-xl font-bold tracking-tight Outfit font-serif">DevOS</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-violet-500/10 border border-violet-500/20 text-violet-400 font-semibold font-mono">v1.0</span>
          </div>

          {/* Nav Items */}
          <nav className="flex flex-col gap-1.5">
            <button className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 hover:text-white transition-colors text-sm font-medium w-full text-left">
              <LayoutDashboard className="w-4 h-4 text-violet-400" />
              <span>Overview</span>
            </button>
            <button className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-slate-900/40 hover:text-slate-100 transition-colors text-sm font-medium w-full text-left">
              <FolderSync className="w-4 h-4" />
              <span>Repositories</span>
            </button>
            <button className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-slate-900/40 hover:text-slate-100 transition-colors text-sm font-medium w-full text-left">
              <GitPullRequest className="w-4 h-4" />
              <span>Pull Requests</span>
            </button>
            <button className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-slate-900/40 hover:text-slate-100 transition-colors text-sm font-medium w-full text-left">
              <LayoutGrid className="w-4 h-4" />
              <span>Kanban Sprints</span>
            </button>
            <button className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-slate-900/40 hover:text-slate-100 transition-colors text-sm font-medium w-full text-left">
              <MessageSquareCode className="w-4 h-4" />
              <span>AI Chat & RAG</span>
            </button>
            <button className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-slate-900/40 hover:text-slate-100 transition-colors text-sm font-medium w-full text-left">
              <SettingsIcon className="w-4 h-4" />
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
        
        {/* Header */}
        <header className="flex justify-between items-center border-b border-slate-800/60 pb-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-3xl font-extrabold tracking-tight font-serif text-slate-100">Workspace Dashboard</h2>
            <p className="text-sm text-slate-400">Welcome, {user.name || 'Developer'}. Manage your engineering organizations.</p>
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium transition-all shadow-[0_2px_10px_rgba(139,92,246,0.3)] flex items-center gap-1.5 text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Organization</span>
          </button>
        </header>

        {/* Organizations Lists */}
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
            /* Empty State Container */
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
                    
                    {/* Members List */}
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

    </div>
  );
}
