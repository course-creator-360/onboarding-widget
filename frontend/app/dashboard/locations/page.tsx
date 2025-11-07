'use client';

import { useEffect, useState } from 'react';
import { agency } from '@/lib/api';

export default function LocationsPage() {
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [previewEnabled, setPreviewEnabled] = useState(false);
  
  useEffect(() => {
    loadLocations();
  }, []);
  
  async function loadLocations() {
    try {
      const data = await agency.locations();
      setLocations(data.locations || []);
    } catch (error) {
      console.error('Error loading locations:', error);
    } finally {
      setLoading(false);
    }
  }
  
  function handleTogglePreview(locationId: string) {
    if (selectedLocationId === locationId && previewEnabled) {
      // Turn off preview - remove widget script and reset
      removeWidgetScript();
      setPreviewEnabled(false);
      setSelectedLocationId(null);
    } else {
      // Turn on preview for this location - inject widget script
      removeWidgetScript(); // Remove any existing widget first
      setSelectedLocationId(locationId);
      setPreviewEnabled(true);
      injectWidgetScript(locationId);
    }
  }
  
  function injectWidgetScript(locationId: string) {
    // Get API base URL from environment or current origin
    const apiBase = process.env.NEXT_PUBLIC_API_BASE || window.location.origin;
    
    // Create and inject the widget script
    const script = document.createElement('script');
    script.id = 'cc360-widget-script';
    script.src = `${apiBase}/widget.js`;
    script.setAttribute('data-location', locationId);
    script.setAttribute('data-api', apiBase);
    
    document.body.appendChild(script);
    console.log('[CC360] Widget loaded for location:', locationId);
  }
  
  function removeWidgetScript() {
    // Remove the widget script
    const existingScript = document.getElementById('cc360-widget-script');
    if (existingScript) {
      existingScript.remove();
    }
    
    // Remove the widget container
    const widgetContainer = document.getElementById('cc360-onboarding-widget');
    if (widgetContainer) {
      widgetContainer.remove();
    }
    
    // Remove any dialog overlays
    const dialogs = document.querySelectorAll('.cc360-dialog-overlay');
    dialogs.forEach(dialog => dialog.remove());
  }
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      removeWidgetScript();
    };
  }, []);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0475FF]"></div>
      </div>
    );
  }
  
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#0E325E] mb-2">Locations</h1>
        {previewEnabled && selectedLocationId && (
          <div className="inline-flex items-center gap-2 px-3 py-2 bg-green-100 border border-green-300 rounded-lg text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-700 font-semibold">
              Widget Preview Active
            </span>
            <span className="text-green-600 text-xs">
              (Check bottom-right corner)
            </span>
          </div>
        )}
      </div>
      
      <div className="bg-white rounded-xl shadow p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-[#0E325E]">
            All Locations ({locations.length})
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Click "Preview Widget" to load the widget on this page
          </p>
        </div>
        
        {locations.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {locations.map(loc => (
              <div
                key={loc.id}
                className={`border-2 rounded-lg p-4 transition-all ${
                  selectedLocationId === loc.id && previewEnabled
                    ? 'border-[#0475FF] bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-[#0475FF] hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="font-semibold text-[#0E325E] mb-1">{loc.name}</div>
                    <div className="text-xs text-gray-500 font-mono mb-2">{loc.id}</div>
                    {loc.companyId && (
                      <div className="text-xs text-gray-600 mb-1">
                        Company: {loc.companyId}
                      </div>
                    )}
                  </div>
                  {selectedLocationId === loc.id && previewEnabled && (
                    <div className="px-2 py-1 bg-[#0475FF] text-white text-xs font-semibold rounded">
                      Active
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTogglePreview(loc.id)}
                    className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                      selectedLocationId === loc.id && previewEnabled
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'bg-gradient-to-r from-[#0E325E] to-[#0475FF] text-white hover:opacity-90'
                    }`}
                  >
                    {selectedLocationId === loc.id && previewEnabled ? '✕ Stop Preview' : '👁 Preview Widget'}
                  </button>
                  {loc.website && (
                    <a 
                      href={loc.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      title="Visit Website"
                    >
                      🔗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📍</div>
            <p className="text-gray-500">No locations found</p>
            <p className="text-sm text-gray-400 mt-2">
              Connect your agency to see locations
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

