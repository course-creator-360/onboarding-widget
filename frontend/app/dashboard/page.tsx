'use client';

import { useEffect, useState } from 'react';
import { agency } from '@/lib/api';

export default function DashboardPage() {
  const [agencyStatus, setAgencyStatus] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadAgencyStatus();
  }, []);
  
  async function loadAgencyStatus() {
    try {
      const status = await agency.status();
      setAgencyStatus(status);
      
      if (status.authorized) {
        // Limit to 100 locations for performance
        // For agencies with many locations, consider adding pagination
        const locs = await agency.locations();
        setLocations(locs.locations || []);
        
        // Warn if we hit the limit
        if (locs.locations && locs.locations.length >= 100) {
          console.warn('⚠️ Showing first 100 locations. Your agency may have more locations.');
        }
      }
    } catch (error) {
      console.error('Error loading agency status:', error);
    } finally {
      setLoading(false);
    }
  }
  
  function handleConnectAgency() {
    // Redirect to Express backend OAuth endpoint
    const apiBase = process.env.NEXT_PUBLIC_API_BASE || '';
    window.location.href = `${apiBase}/api/oauth/agency/install`;
  }
  
  async function handleClearAgencyData() {
    if (!confirm('⚠️ This will clear the agency authorization.\n\nAll sub-accounts will lose access until you re-authorize.\n\nYou will need to connect your agency again.\n\nContinue?')) {
      return;
    }
    
    try {
      await agency.clear();
      alert('✅ Agency authorization cleared! You can now reconnect your agency.');
      await loadAgencyStatus();
    } catch (error) {
      console.error('Error clearing agency data:', error);
      alert(`Failed to clear agency data: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      <h1 className="text-3xl font-bold text-[#0E325E] mb-6">Dashboard</h1>
      
      {!agencyStatus?.authorized ? (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-[#0475FF] rounded-xl p-8 text-center">
          <div className="text-6xl mb-4">🔑</div>
          <h2 className="text-2xl font-bold text-[#0E325E] mb-3">
            Connect Your Agency
          </h2>
          <p className="text-gray-600 mb-6">
            To get started, connect your GoHighLevel agency account.
            This allows you to manage onboarding for all your locations.
          </p>
          <button
            onClick={handleConnectAgency}
            className="bg-gradient-to-r from-[#0E325E] to-[#0475FF] text-white px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
          >
            Connect Agency OAuth
          </button>
        </div>
      ) : (
        <div>
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[#0E325E]">
                ✓ Agency Connected
              </h2>
              <button
                onClick={handleClearAgencyData}
                className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg font-semibold transition-colors border border-red-200"
              >
                🔄 Clear Agency Data
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600">Account ID:</span>{' '}
                <code className="bg-gray-100 px-2 py-1 rounded">
                  {agencyStatus.installation?.accountId}
                </code>
              </div>
              <div>
                <span className="text-gray-600">Connected:</span>{' '}
                {new Date(agencyStatus.installation?.createdAt).toLocaleString()}
              </div>
            </div>
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600">
                💡 <strong>Tip:</strong> Use the "Clear Agency Data" button to disconnect and reauthenticate your agency. This is useful if you need to switch accounts or refresh your OAuth connection.
              </p>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-bold text-[#0E325E] mb-4">
              Your Locations ({locations.length})
            </h2>
            {locations.length > 0 ? (
              <div className="grid gap-4">
                {locations.map(loc => (
                  <div
                    key={loc.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-[#0475FF] transition-colors"
                  >
                    <div className="font-semibold text-[#0E325E]">{loc.name}</div>
                    <div className="text-sm text-gray-600">{loc.id}</div>
                    {loc.website && (
                      <div className="text-sm text-gray-500 mt-1">
                        <a href={loc.website} target="_blank" rel="noopener noreferrer" className="text-[#0475FF] hover:underline">
                          {loc.website}
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No locations found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

