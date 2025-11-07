'use client';

import { useEffect, useState } from 'react';
import { auth, agency } from '@/lib/api';

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [agencyStatus, setAgencyStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadData();
  }, []);
  
  async function loadData() {
    try {
      const [userData, statusData] = await Promise.all([
        auth.me(),
        agency.status()
      ]);
      setUser(userData.user);
      setAgencyStatus(statusData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0475FF]"></div>
      </div>
    );
  }
  
  return (
    <div>
      <h1 className="text-3xl font-bold text-[#0E325E] mb-6">Settings</h1>
      
      <div className="space-y-6">
        {/* User Info */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold text-[#0E325E] mb-4">
            Account Information
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-600">Username</label>
              <div className="font-semibold">{user?.username}</div>
            </div>
            <div>
              <label className="text-sm text-gray-600">Email</label>
              <div className="font-semibold">{user?.email}</div>
            </div>
          </div>
        </div>
        
        {/* Agency Info */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold text-[#0E325E] mb-4">
            Agency Connection
          </h2>
          {agencyStatus?.authorized ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span className="font-semibold">Connected</span>
              </div>
              <div>
                <label className="text-sm text-gray-600">Account ID</label>
                <div className="font-mono text-sm">{agencyStatus.installation?.accountId}</div>
              </div>
              <div>
                <label className="text-sm text-gray-600">Connected Since</label>
                <div className="text-sm">
                  {new Date(agencyStatus.installation?.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-gray-400">○</span>
                <span className="text-gray-600">Not Connected</span>
              </div>
              <p className="text-sm text-gray-500">
                Go to Dashboard to connect your agency
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


