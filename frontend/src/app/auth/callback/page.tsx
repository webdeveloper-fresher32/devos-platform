"use client";

import React, { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '../../../store/authStore';
import { api } from '../../../lib/api';
import { Loader2 } from 'lucide-react';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setTokens = useAuthStore((state) => state.setTokens);
  const setUser = useAuthStore((state) => state.setUser);

  useEffect(() => {
    const token = searchParams.get('token');
    const refreshToken = searchParams.get('refreshToken');

    if (token && refreshToken) {
      // Store session state
      setTokens(token, refreshToken);

      // Verify profile immediately and update store
      api
        .get('/auth/me')
        .then((response) => {
          setUser(response.data);
          router.push('/dashboard');
        })
        .catch((error) => {
          console.error('Failed to retrieve user profile via OAuth', error);
          router.push('/login?error=oauth_profile_failed');
        });
    } else {
      router.push('/login?error=invalid_oauth_response');
    }
  }, [searchParams, router, setTokens, setUser]);

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[hsl(222.2,84%,4.9%)] text-slate-100 overflow-hidden font-sans">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
      <div className="relative p-8 rounded-2xl border border-slate-800 bg-gray-900/60 backdrop-blur-xl shadow-2xl flex flex-col items-center gap-4 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        <h2 className="text-xl font-semibold">Authorizing Session</h2>
        <p className="text-sm text-slate-400">Syncing secure tokens, redirecting you shortly...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[hsl(222.2,84%,4.9%)] text-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
