'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { auth } from '@/lib/api';
import Spinner from '@/components/Spinner';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;
    
    try {
      await auth.login({ username, password });
      toast.success('Login successful! Redirecting...');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }
  
  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const username = formData.get('username') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    
    try {
      await auth.register({ username, email, password });
      toast.success('Account created successfully! Redirecting...');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0E325E] to-[#0475FF] p-5">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-[#0E325E] mb-6 text-center">
          CC360 Onboarding
        </h1>
        
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${
              mode === 'login'
                ? 'bg-[#0475FF] text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => setMode('register')}
            className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${
              mode === 'register'
                ? 'bg-[#0475FF] text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            Register
          </button>
        </div>
        
        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              name="username"
              type="text"
              placeholder="Username or Email"
              required
              disabled={loading}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#0475FF] bg-white text-gray-900 placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <input
              name="password"
              type="password"
              placeholder="Password"
              required
              disabled={loading}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#0475FF] bg-white text-gray-900 placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#0E325E] to-[#0475FF] text-white py-3 rounded-lg font-semibold hover:opacity-90 disabled:opacity-70 disabled:cursor-not-allowed transition-opacity shadow-lg flex items-center justify-center gap-2"
            >
              {loading && <Spinner size="sm" />}
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <input
              name="username"
              type="text"
              placeholder="Username"
              required
              disabled={loading}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#0475FF] bg-white text-gray-900 placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <input
              name="email"
              type="email"
              placeholder="Email"
              required
              disabled={loading}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#0475FF] bg-white text-gray-900 placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <input
              name="password"
              type="password"
              placeholder="Password (min 8 characters)"
              required
              minLength={8}
              disabled={loading}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#0475FF] bg-white text-gray-900 placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#0E325E] to-[#0475FF] text-white py-3 rounded-lg font-semibold hover:opacity-90 disabled:opacity-70 disabled:cursor-not-allowed transition-opacity shadow-lg flex items-center justify-center gap-2"
            >
              {loading && <Spinner size="sm" />}
              {loading ? 'Creating account...' : 'Register'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

