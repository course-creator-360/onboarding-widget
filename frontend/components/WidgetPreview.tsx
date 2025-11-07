'use client';

interface WidgetPreviewProps {
  locationId: string | null;
  enabled: boolean;
}

export default function WidgetPreview({ locationId, enabled }: WidgetPreviewProps) {
  if (!locationId || !enabled) {
    return null;
  }

  const apiBase = process.env.NEXT_PUBLIC_API_BASE || (typeof window !== 'undefined' ? window.location.origin : '');
  
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="bg-white rounded-xl shadow-2xl overflow-hidden border-2 border-gray-200" style={{ width: '400px', height: '700px' }}>
        {/* Preview Header */}
        <div className="bg-gradient-to-r from-[#0E325E] to-[#0475FF] text-white px-4 py-3 flex items-center justify-between">
          <div>
            <div className="font-semibold text-sm">Widget Preview</div>
            <div className="text-xs opacity-75">{locationId}</div>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>Live Preview</span>
          </div>
        </div>
        
        {/* Iframe Container */}
        <iframe
          src={`${apiBase}/preview?locationId=${locationId}`}
          className="w-full border-0"
          style={{ height: 'calc(100% - 60px)' }}
          title="Widget Preview"
        />
      </div>
    </div>
  );
}

