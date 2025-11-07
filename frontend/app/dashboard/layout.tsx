'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { auth } from '@/lib/api';
import Link from 'next/link';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  
  useEffect(() => {
    auth.me()
      .then(data => setUser(data.user))
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);
  
  async function handleLogout() {
    await auth.logout();
    router.push('/login');
  }
  
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0475FF]"></div>
      </div>
    );
  }
  
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-gradient-to-b from-[#0E325E] to-[#0475FF] text-white flex flex-col flex-shrink-0">
        <div className="p-6">
          <h1 className="text-2xl font-bold">CC360 Widget</h1>
        </div>
        
        <nav className="flex-1 px-4">
          <Link
            href="/dashboard"
            className={`block px-4 py-3 rounded-lg mb-2 transition-colors ${
              pathname === '/dashboard'
                ? 'bg-white/20'
                : 'hover:bg-white/10'
            }`}
          >
            Dashboard
          </Link>
          <Link
            href="/dashboard/locations"
            className={`block px-4 py-3 rounded-lg mb-2 transition-colors ${
              pathname === '/dashboard/locations'
                ? 'bg-white/20'
                : 'hover:bg-white/10'
            }`}
          >
            Locations
          </Link>
          <Link
            href="/dashboard/settings"
            className={`block px-4 py-3 rounded-lg mb-2 transition-colors ${
              pathname === '/dashboard/settings'
                ? 'bg-white/20'
                : 'hover:bg-white/10'
            }`}
          >
            Settings
          </Link>
        </nav>
        
        <div className="p-4 border-t border-white/20">
          <div className="mb-3">
            <div className="text-sm opacity-75">Logged in as</div>
            <div className="font-semibold">{user?.username}</div>
            <div className="text-xs opacity-75">{user?.email}</div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full bg-white/20 hover:bg-white/30 py-2 rounded-lg font-semibold transition-colors"
          >
            Logout
          </button>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

