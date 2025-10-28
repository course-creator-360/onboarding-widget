(function() {
  'use strict';

  // Get configuration from script tag
  const currentScript = document.currentScript || document.querySelector('script[src*="widget.js"]');
  const apiBase = currentScript?.getAttribute('data-api') || 'http://localhost:4002';
  const skipApiChecks = currentScript?.getAttribute('data-skip-api-checks') === 'true';

  // Location ID will be auto-detected from GHL UserContext
  let locationId = null;
  
  if (skipApiChecks) {
    console.log('[CC360 Widget] ⚠️ API checks disabled - manual toggles will persist');
  }

  // Auto-detect location ID from GHL user context
  async function detectLocationFromContext() {
    try {
      // Check for GHL global context objects (primary method)
      if (typeof window._GHL_CONTEXT !== 'undefined' && window._GHL_CONTEXT?.locationId) {
        console.log('[CC360 Widget] Detected location ID from _GHL_CONTEXT:', window._GHL_CONTEXT.locationId);
        return window._GHL_CONTEXT.locationId;
      }

      // Check for location in URL (when embedded in GHL dashboard)
      const urlMatch = window.location.pathname.match(/\/location\/([^\/]+)/) || 
                       window.location.search.match(/locationId=([^&]+)/);
      if (urlMatch && urlMatch[1]) {
        console.log('[CC360 Widget] Detected location ID from URL:', urlMatch[1]);
        return urlMatch[1];
      }

      // Check if running in GHL iframe context
      try {
        if (window.parent && window.parent !== window) {
          // Try to get location from parent window URL
          const parentUrl = window.parent.location.href;
          const parentMatch = parentUrl.match(/\/location\/([^\/]+)/) ||
                            parentUrl.match(/locationId=([^&]+)/);
          if (parentMatch && parentMatch[1]) {
            console.log('[CC360 Widget] Detected location ID from parent URL:', parentMatch[1]);
            return parentMatch[1];
          }
          
          // Try to get location from parent window's GHL context
          if (window.parent._GHL_CONTEXT?.locationId) {
            console.log('[CC360 Widget] Detected location ID from parent _GHL_CONTEXT:', window.parent._GHL_CONTEXT.locationId);
            return window.parent._GHL_CONTEXT.locationId;
          }
        }
      } catch (e) {
        // Cross-origin access blocked - this is expected in some scenarios
        console.log('[CC360 Widget] Cannot access parent context (cross-origin)');
      }

      console.warn('[CC360 Widget] Could not detect location ID from GHL context');
      return null;
    } catch (error) {
      console.error('[CC360 Widget] Error detecting location from context:', error);
      return null;
    }
  }

  console.log('[CC360 Widget] Initializing with auto-detection from GHL UserContext...');

  // Widget state
  let currentStatus = null;
  let widgetElement = null;
  let isInstalled = false;
  let shouldShowWidget = true;
  let hasShownCompletionDialog = false; // Track if we've shown the completion dialog
  let ghlAppBaseUrl = 'https://app.gohighlevel.com'; // Default, will be fetched from backend
  let userpilotToken = null; // Will be fetched from backend

  // Fetch configuration from backend
  async function fetchConfig() {
    try {
      console.log('[CC360 Widget] 🔧 Fetching config from:', `${apiBase}/api/config`);
      const response = await fetch(`${apiBase}/api/config`);
      if (response.ok) {
        const config = await response.json();
        console.log('[CC360 Widget] ✅ Config received:', config);
        
        if (config.ghlAppBaseUrl) {
          ghlAppBaseUrl = config.ghlAppBaseUrl;
          console.log('[CC360 Widget] Using GHL base URL:', ghlAppBaseUrl);
        }
        
        if (config.userpilotToken) {
          userpilotToken = config.userpilotToken;
          console.log('[CC360 Widget] ✅ Userpilot token received from backend');
        } else {
          console.log('[CC360 Widget] ⚠️ No Userpilot token in config');
        }
      }
    } catch (error) {
      console.warn('[CC360 Widget] ❌ Could not fetch config:', error);
    }
  }

  // Dashboard URL builder
  function buildDashboardUrl(path) {
    return `${ghlAppBaseUrl}/v2/location/${locationId}/${path}`;
  }

  // Widget state
  let isMinimized = false;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let widgetStartX = 0;
  let widgetStartY = 0;
  let hasDragged = false; // Track if user actually moved the widget

  // Create widget HTML
  function createWidget() {
    const container = document.createElement('div');
    container.id = 'cc360-onboarding-widget';
    container.innerHTML = `
      <style>
        #cc360-onboarding-widget {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 340px;
          max-height: 90vh;
          min-height: 200px;
          height: auto;
          background: transparent;
          border-radius: 16px;
          font-family: Arial, sans-serif;
          z-index: 99999;
          overflow: visible;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          user-select: none;
        }
        #cc360-onboarding-widget.dragging {
          transition: none;
          cursor: grabbing;
        }
        #cc360-onboarding-widget.hidden {
          transform: translateY(120%);
        }
        #cc360-onboarding-widget.minimized {
          width: auto;
          max-width: 280px;
          height: 50px !important;
          min-height: 50px;
          max-height: 50px;
          border-radius: 25px;
          cursor: pointer;
          box-shadow: none;
          background: transparent;
        }
        #cc360-onboarding-widget.minimized:active {
          cursor: grabbing;
        }
        #cc360-onboarding-widget.minimized:hover .cc360-widget-minimized {
          transform: translateY(-2px);
          box-shadow: 0 6px 24px rgba(4, 117, 255, 0.35);
        }
        #cc360-onboarding-widget.minimized .cc360-widget-full {
          opacity: 0;
          pointer-events: none;
          visibility: hidden;
        }
        #cc360-onboarding-widget.minimized .cc360-widget-minimized {
          opacity: 1;
          visibility: visible;
        }
        #cc360-onboarding-widget:not(.minimized) .cc360-widget-full {
          opacity: 1;
          visibility: visible;
        }
        #cc360-onboarding-widget:not(.minimized) .cc360-widget-minimized {
          opacity: 0;
          visibility: hidden;
        }
        .cc360-widget-minimized {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: row;
          height: 50px;
          background: linear-gradient(135deg, #0E325E 0%, #0475FF 100%);
          color: white;
          gap: 12px;
          padding: 0 22px;
          text-align: center;
          border-radius: 25px;
          overflow: hidden;
          box-shadow: 0 4px 16px rgba(4, 117, 255, 0.25);
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.3s ease, visibility 0.3s ease, transform 0.2s ease;
        }
        .cc360-widget-minimized.complete {
          background: linear-gradient(135deg, #0E325E 0%, #00D9A3 100%);
        }
        .cc360-widget-minimized-icon {
          font-size: 20px;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .cc360-widget-minimized-text {
          font-size: 14px;
          line-height: 1;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 160px;
          display: flex;
          align-items: center;
          font-family: 'Helvetica Now', 'Helvetica Neue', Helvetica, Arial, sans-serif;
        }
        .cc360-widget-minimized-count {
          font-size: 13px;
          font-weight: 700;
          line-height: 1;
          background: rgba(255, 255, 255, 0.3);
          padding: 6px 11px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(4px);
          font-family: 'Helvetica Now', 'Helvetica Neue', Helvetica, Arial, sans-serif;
        }
        .cc360-widget-full {
          display: block;
          transition: opacity 0.3s ease, visibility 0.3s ease;
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(14, 50, 94, 0.15), 0 4px 16px rgba(4, 117, 255, 0.1);
        }
        .cc360-widget-header {
          background: linear-gradient(135deg, #0E325E 0%, #0475FF 100%);
          color: white;
          padding: 20px 50px 16px 18px;
          position: relative;
          z-index: 10;
        }
        .cc360-widget-title {
          font-size: 18px;
          font-weight: 700;
          margin: 0 0 8px 0;
          letter-spacing: -0.3px;
          color: #ffffff !important;
          font-family: 'Helvetica Now', 'Helvetica Neue', Helvetica, Arial, sans-serif;
        }
        .cc360-widget-subtitle {
          font-size: 13px;
          font-weight: 400;
          margin: 0 0 16px 0;
          line-height: 1.5;
          opacity: 1;
          color: rgba(255, 255, 255, 0.95);
        }
        .cc360-minimize-btn {
          position: absolute;
          top: 18px;
          right: 18px;
          width: 32px;
          height: 32px;
          background: transparent !important;
          border: none;
          border-radius: 50%;
          color: white;
          font-size: 24px;
          line-height: 1;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s;
          z-index: 20;
          outline: none;
          padding: 0;
          margin: 0;
        }
        .cc360-minimize-btn:hover {
          background: transparent !important;
          transform: scale(1.15);
        }
        .cc360-minimize-btn:focus {
          outline: none;
          background: transparent !important;
        }
        .cc360-minimize-btn:active {
          background: transparent !important;
        }
        .cc360-widget-footer {
          padding: 14px 18px;
          background: #f5f7fa;
          text-align: center;
          position: relative;
          z-index: 10;
        }
        .cc360-dismiss-btn {
          background: transparent !important;
          border: none;
          color: #868e96;
          padding: 8px 0;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          width: auto;
          display: inline-block;
          position: relative;
          z-index: 1;
          transition: none !important;
          animation: none !important;
          box-shadow: none !important;
          outline: none !important;
        }
        .cc360-dismiss-btn:hover {
          background: transparent !important;
          transition: none !important;
          animation: none !important;
          box-shadow: none !important;
          transform: none !important;
        }
        .cc360-dismiss-btn:active {
          background: transparent !important;
        }
        .cc360-dismiss-btn:focus {
          background: transparent !important;
          outline: none !important;
        }
        .cc360-widget-body {
          padding: 18px 18px 18px 24px;
          overflow-y: auto;
          overflow-x: hidden;
          max-height: calc(90vh - 200px);
          background: white;
          position: relative;
          z-index: 1;
        }
        .cc360-checklist {
          position: relative;
        }
        .cc360-checklist-item {
          display: flex;
          align-items: center;
          padding: 10px 12px 10px 0;
          margin-bottom: 14px;
          background: transparent;
          border-radius: 10px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          text-decoration: none;
          color: inherit;
          cursor: pointer;
          border: none;
          position: relative;
        }
        .cc360-checklist-item:last-child {
          margin-bottom: 0;
        }
        .cc360-checklist-item:not(:last-child)::before {
          content: '';
          position: absolute;
          left: 12px;
          top: 34px;
          width: 2px;
          height: calc(100% - 24px);
          background: #e9ecef;
          transition: background 0.3s;
          z-index: 1;
        }
        .cc360-checklist-item.completed:not(:last-child)::before {
          background: #0475FF;
        }
        .cc360-checklist-item:hover {
          background: #f5f7fa;
        }
        .cc360-checklist-item:hover .cc360-chevron-icon {
          opacity: 1;
          color: #0475FF;
        }
        .cc360-checklist-item.completed .cc360-checklist-title {
          color: #0E325E;
        }
        .cc360-checklist-item.disabled {
          opacity: 0.5;
          cursor: not-allowed;
          pointer-events: none;
        }
        .cc360-checklist-item.disabled:hover {
          background: transparent;
        }
        .cc360-checkbox {
          width: 24px;
          height: 24px;
          min-width: 24px;
          min-height: 24px;
          border: 2.5px solid #cbd5e0;
          border-radius: 50%;
          margin-right: 14px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          background: white;
          position: relative;
          z-index: 2;
        }
        .cc360-checklist-item:hover .cc360-checkbox {
          border-color: #0475FF;
          transform: scale(1.1);
        }
        .cc360-checklist-item.completed .cc360-checkbox {
          background: #0475FF;
          border-color: #0475FF;
        }
        .cc360-checklist-item.disabled .cc360-checkbox {
          border-color: #e9ecef;
          background: #f8f9fa;
        }
        .cc360-checklist-item.disabled:hover .cc360-checkbox {
          transform: none;
        }
        .cc360-checkbox::after {
          content: '✓';
          color: white;
          font-size: 13px;
          font-weight: bold;
          opacity: 0;
          transform: scale(0);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .cc360-checklist-item.completed .cc360-checkbox::after {
          opacity: 1;
          transform: scale(1);
        }
        .cc360-checklist-content {
          flex: 1;
          transition: transform 0.2s;
          display: flex;
          align-items: center;
        }
        .cc360-checklist-title {
          font-size: 14px;
          font-weight: 500;
          margin: 0;
          color: #1a202c;
          transition: color 0.2s;
          line-height: 1.4;
          font-family: 'Helvetica Now', 'Helvetica Neue', Helvetica, Arial, sans-serif;
        }
        .cc360-checklist-item.disabled .cc360-checklist-title {
          color: #adb5bd;
        }
        .cc360-lock-icon {
          margin-left: auto;
          padding-left: 8px;
          font-size: 16px;
          opacity: 0.5;
        }
        .cc360-chevron-icon {
          margin-left: auto;
          padding-left: 12px;
          font-size: 20px;
          color: #cbd5e0;
          opacity: 0;
          transition: all 0.2s;
          line-height: 1;
          display: flex;
          align-items: center;
        }
        .cc360-checklist-item.disabled .cc360-chevron-icon {
          display: none;
        }
        .cc360-dialog-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(14, 50, 94, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100000;
          animation: cc360-fadeIn 0.2s ease;
        }
        @keyframes cc360-fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .cc360-dialog {
          background: white;
          border-radius: 16px;
          padding: 28px;
          max-width: 380px;
          width: 90%;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: cc360-slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @keyframes cc360-slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        .cc360-dialog-title {
          font-size: 20px;
          font-weight: 600;
          margin: 0 0 12px 0;
          color: #1a202c;
          font-family: 'Helvetica Now', 'Helvetica Neue', Helvetica, Arial, sans-serif;
        }
        .cc360-dialog-message {
          font-size: 14px;
          line-height: 1.6;
          color: #6c757d;
          margin: 0 0 24px 0;
        }
        .cc360-dialog-buttons {
          display: flex;
          gap: 12px;
        }
        .cc360-dialog-btn {
          flex: 1;
          padding: 12px 20px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .cc360-dialog-btn-primary {
          background: linear-gradient(135deg, #0E325E 0%, #0475FF 100%);
          color: white;
        }
        .cc360-dialog-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(4, 117, 255, 0.4);
        }
        .cc360-dialog-btn-secondary {
          background: #f8f9fa;
          color: #495057;
        }
        .cc360-dialog-btn-secondary:hover {
          background: #e9ecef;
        }
        .cc360-dialog-icon {
          font-size: 48px;
          text-align: center;
          margin-bottom: 16px;
        }
        .cc360-dialog-success .cc360-dialog-title {
          text-align: center;
          color: #0475FF;
        }
        .cc360-dialog-success .cc360-dialog-message {
          text-align: center;
        }
        .cc360-progress {
          margin-bottom: 0;
          padding: 0;
        }
        .cc360-progress-text {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.9);
          margin-bottom: 8px;
          font-weight: 500;
          line-height: 1.4;
          font-family: 'Helvetica Now', 'Helvetica Neue', Helvetica, Arial, sans-serif;
        }
        .cc360-progress-bar-bg {
          height: 6px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
          overflow: hidden;
        }
        .cc360-progress-bar {
          height: 100%;
          background: white;
          transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          border-radius: 3px;
          box-shadow: 0 0 12px rgba(255, 255, 255, 0.5);
        }
      </style>
      <div class="cc360-widget-minimized" id="cc360-widget-minimized">
        <div class="cc360-widget-minimized-icon" id="cc360-minimized-icon">🚀</div>
        <div class="cc360-widget-minimized-text" id="cc360-minimized-text">Start Onboarding!</div>
        <div class="cc360-widget-minimized-count" id="cc360-minimized-count">1/4</div>
      </div>
      <div class="cc360-widget-full">
        <div class="cc360-widget-header">
          <button class="cc360-minimize-btn" id="cc360-minimize-btn">⌄</button>
          <h3 class="cc360-widget-title">Welcome Aboard to CC360!</h3>
          <p class="cc360-widget-subtitle">Complete these steps to get your account fully set up and ready to go.</p>
          <div class="cc360-progress">
            <div class="cc360-progress-text"><span id="cc360-progress-count">0/4</span> tasks completed</div>
            <div class="cc360-progress-bar-bg">
              <div class="cc360-progress-bar" id="cc360-progress-bar" style="width: 0%"></div>
            </div>
          </div>
        </div>
        <div class="cc360-widget-body">
          <div id="cc360-checklist"></div>
        </div>
        <div class="cc360-widget-footer">
          <button class="cc360-dismiss-btn" onclick="window.cc360Widget.showDismissDialog()">Dismiss Checklist</button>
        </div>
      </div>
    `;
    return container;
  }

  // Render checklist items
  function renderChecklist(status) {
    const checklistContainer = document.getElementById('cc360-checklist');
    if (!checklistContainer) return;

    const items = [
      {
        key: 'accountCreated',
        title: 'Create your Account',
        url: '#',
        completed: true,
        isStatic: true
      },
      {
        key: 'paymentIntegrated',
        title: 'Connect Payments',
        url: 'payments/integrations/?userpilot=ZXhwZXJpZW5jZTpmQXRoSHhaVDlt',
        completed: status.paymentIntegrated
      },
      {
        key: 'courseCreated',
        title: 'Create a Course',
        url: 'memberships/courses/products-v2?userpilot=ZXhwZXJpZW5jZTpaM19SblNpY0Zq',
        completed: status.courseCreated
      },
      {
        key: 'domainConnected',
        title: 'Connect a Domain',
        url: 'settings/domain?userpilot=ZXhwZXJpZW5jZTpKbncxMkVPWHlj',
        completed: status.domainConnected
      }
    ];

    const completedCount = items.filter(item => item.completed).length;
    const progressPercent = (completedCount / items.length) * 100;
    
    // Check if all tasks are completed - show completion dialog
    const allCompleted = status.domainConnected && status.courseCreated && status.paymentIntegrated;
    if (allCompleted && !hasShownCompletionDialog) {
      console.log('[CC360 Widget] All tasks completed! Showing completion dialog...');
      showCompletionDialog();
      hasShownCompletionDialog = true; // Only show once per session
    }

    // Update progress
    const progressCountEl = document.getElementById('cc360-progress-count');
    const minimizedCountEl = document.getElementById('cc360-minimized-count');
    const minimizedTextEl = document.getElementById('cc360-minimized-text');
    const minimizedIconEl = document.getElementById('cc360-minimized-icon');
    const minimizedWidget = document.querySelector('.cc360-widget-minimized');
    
    if (progressCountEl) progressCountEl.textContent = `${completedCount}/${items.length}`;
    if (minimizedCountEl) minimizedCountEl.textContent = `${completedCount}/${items.length}`;
    
    // Update minimized text based on completion
    if (minimizedTextEl && minimizedIconEl) {
      if (completedCount === 0) {
        minimizedTextEl.textContent = 'Start Onboarding!';
        minimizedIconEl.textContent = '🚀';
        if (minimizedWidget) minimizedWidget.classList.remove('complete');
      } else if (completedCount === items.length) {
        minimizedTextEl.textContent = 'All Done!';
        minimizedIconEl.textContent = '🎉';
        if (minimizedWidget) minimizedWidget.classList.add('complete');
      } else {
        minimizedTextEl.textContent = 'Onboaring In Progress';
        minimizedIconEl.textContent = '⚡';
        if (minimizedWidget) minimizedWidget.classList.remove('complete');
      }
    }
    
    const progressBarEl = document.getElementById('cc360-progress-bar');
    if (progressBarEl) progressBarEl.style.width = `${progressPercent}%`;

    // Determine which items should be enabled (in order)
    let foundFirstIncomplete = false;
    const itemsWithState = items.map(item => {
      let isDisabled = false;
      
      if (item.completed) {
        // Completed items are always enabled
        isDisabled = false;
      } else {
        // For incomplete items, only the first one should be enabled
        if (foundFirstIncomplete) {
          isDisabled = true;
        } else {
          foundFirstIncomplete = true;
          isDisabled = false;
        }
      }
      
      return { ...item, isDisabled };
    });
    
    // Render items (minimal - no descriptions)
    checklistContainer.innerHTML = itemsWithState.map(item => {
      // Static items (like account creation) should not be links
      if (item.isStatic) {
        return `
          <div class="cc360-checklist-item ${item.completed ? 'completed' : ''} ${item.isDisabled ? 'disabled' : ''}" style="cursor: default;">
            <div class="cc360-checkbox"></div>
            <div class="cc360-checklist-content">
              <div class="cc360-checklist-title">${item.title}</div>
            </div>
          </div>
        `;
      }
      
      // Regular items are clickable links
      return `
        <a 
          href="${buildDashboardUrl(item.url)}" 
          class="cc360-checklist-item ${item.completed ? 'completed' : ''} ${item.isDisabled ? 'disabled' : ''}"
          target="_blank"
        >
          <div class="cc360-checkbox"></div>
          <div class="cc360-checklist-content">
            <div class="cc360-checklist-title">${item.title}</div>
          </div>
          ${item.isDisabled ? '<div class="cc360-lock-icon">🔒</div>' : '<div class="cc360-chevron-icon">›</div>'}
        </a>
      `;
    }).join('');
  }

  // Force widget into viewport if it's off-screen (safety function)
  function forceWidgetIntoView() {
    const widget = document.getElementById('cc360-onboarding-widget');
    if (!widget) return;
    
    const rect = widget.getBoundingClientRect();
    const margin = 24;
    let adjusted = false;
    
    // Check all boundaries
    if (rect.left < -widget.offsetWidth + 100) {
      widget.style.left = margin + 'px';
      widget.style.right = 'auto';
      adjusted = true;
      console.log('[CC360 Widget] Forced into view - was off left edge');
    }
    
    if (rect.right > window.innerWidth + widget.offsetWidth - 100) {
      widget.style.right = margin + 'px';
      widget.style.left = 'auto';
      adjusted = true;
      console.log('[CC360 Widget] Forced into view - was off right edge');
    }
    
    if (rect.top < margin) {
      const currentBottom = parseInt(widget.style.bottom) || margin;
      const adjustment = margin - rect.top;
      widget.style.bottom = Math.max(margin, currentBottom - adjustment) + 'px';
      adjusted = true;
      console.log('[CC360 Widget] Forced into view - was off top');
    }
    
    if (rect.bottom > window.innerHeight - margin) {
      const currentBottom = parseInt(widget.style.bottom) || margin;
      const overflow = rect.bottom - (window.innerHeight - margin);
      widget.style.bottom = (currentBottom + overflow) + 'px';
      adjusted = true;
      console.log('[CC360 Widget] Forced into view - was off bottom');
    }
    
    if (adjusted) {
      const position = getWidgetPosition();
      saveWidgetPosition(position.isRight, parseInt(widget.style.bottom), widget.style.height);
    }
    
    return adjusted;
  }

  // Setup drag functionality
  function setupDragAndResize() {
    const widget = document.getElementById('cc360-onboarding-widget');
    const minimizedWidget = document.querySelector('.cc360-widget-minimized');
    const minimizeBtn = document.getElementById('cc360-minimize-btn');
    
    if (!widget) return;

    // Load saved position and height from localStorage
    restoreWidgetPosition();
    
    // Minimize button click handler
    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Toggle between minimized and expanded
        if (isMinimized) {
          expandWidget();
        } else {
          minimizeWidget();
        }
      });
      // Prevent dragging when clicking minimize button
      minimizeBtn.addEventListener('mousedown', (e) => {
        e.stopPropagation();
      });
      minimizeBtn.addEventListener('touchstart', (e) => {
        e.stopPropagation();
      });
    }
    
    // Drag functionality for minimized widget
    if (minimizedWidget) {
      minimizedWidget.addEventListener('mousedown', startDraggingMinimized);
      minimizedWidget.addEventListener('touchstart', startDraggingMinimized);
      
      // Add click handler for toggling
      minimizedWidget.addEventListener('click', (e) => {
        // Only toggle if user didn't drag
        if (!hasDragged) {
          e.stopPropagation();
          if (isMinimized) {
            expandWidget();
          } else {
            minimizeWidget();
          }
        }
      });
    }
    
    function startDraggingMinimized(e) {
      // Only allow dragging when minimized (expanded state is undraggable)
      if (!isMinimized) return;
      
      isDragging = true;
      hasDragged = false; // Reset drag flag
      widget.classList.add('dragging');
      
      const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
      const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
      
      dragStartX = clientX;
      dragStartY = clientY;
      
      // Get the widget container's position
      const rect = widget.getBoundingClientRect();
      widgetStartX = rect.left;
      widgetStartY = rect.top;
      
      e.preventDefault();
      e.stopPropagation(); // Prevent the expand/click event
    }
    
    function onMouseMove(e) {
      if (isDragging) {
        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
        
        const deltaX = clientX - dragStartX;
        const deltaY = clientY - dragStartY;
        
        // Check if user has actually moved the widget (more than 8px threshold for reliable click detection)
        const dragThreshold = 8;
        const movement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (movement > dragThreshold && !hasDragged) {
          hasDragged = true;
          console.log('[CC360 Widget] Drag detected - movement:', Math.round(movement), 'px');
        }
        
        // Only reposition if drag threshold is exceeded
        if (hasDragged) {
          let newX = widgetStartX + deltaX;
          let newY = widgetStartY + deltaY;
          
          // Apply viewport constraints during drag
          const margin = 24;
          const widgetWidth = widget.offsetWidth;
          const widgetHeight = widget.offsetHeight;
          
          // Constrain X position (keep some part visible)
          const minX = -widgetWidth + 100; // Allow 100px to remain visible on left
          const maxX = window.innerWidth - 100; // Allow 100px to remain visible on right
          newX = Math.max(minX, Math.min(newX, maxX));
          
          // Constrain Y position (allow dragging to bottom)
          const minY = 0; // Allow dragging to very top
          const maxY = window.innerHeight - 60; // Keep at least 60px visible at bottom
          newY = Math.max(minY, Math.min(newY, maxY));
          
          // Temporarily position the widget while dragging
          widget.style.left = newX + 'px';
          widget.style.top = newY + 'px';
          widget.style.bottom = 'auto';
          widget.style.right = 'auto';
        }
      }
    }
    
    function onMouseUp(e) {
      if (isDragging) {
        widget.classList.remove('dragging');
        
        // Only reposition if user actually dragged
        if (hasDragged) {
          console.log('[CC360 Widget] Drag completed - repositioning and snapping to side');
          
          // Determine which side to snap to
          const rect = widget.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const screenCenter = window.innerWidth / 2;
          
          // Snap to left or right
          const snapToRight = centerX > screenCenter;
          const margin = 24;
          
          // Calculate bottom position with boundary constraints
          let bottomPos = window.innerHeight - rect.bottom;
          
          // Get current widget height (minimized = 50px, expanded = actual height)
          const widgetHeight = isMinimized ? 50 : widget.offsetHeight;
          
          // For minimized state, allow it to go very close to bottom
          // For expanded state, keep more margin to ensure visibility
          const maxAllowedBottom = isMinimized 
            ? window.innerHeight - widgetHeight - 5  // 5px from bottom when minimized
            : window.innerHeight - widgetHeight - 10; // 10px margin when expanded
          
          const minBottom = 10; // Allow close to edges
          
          // Constrain bottom position to keep widget visible
          bottomPos = Math.max(minBottom, Math.min(bottomPos, maxAllowedBottom));
          
          if (snapToRight) {
            widget.style.right = margin + 'px';
            widget.style.left = 'auto';
          } else {
            widget.style.left = margin + 'px';
            widget.style.right = 'auto';
          }
          
          widget.style.bottom = bottomPos + 'px';
          widget.style.top = 'auto';
          
          console.log('[CC360 Widget] Snapped to', snapToRight ? 'right' : 'left', 'side at bottom:', bottomPos);
          
          // Save position
          saveWidgetPosition(snapToRight, bottomPos, widget.style.height);
        }
        
        isDragging = false;
        
        // Delay resetting hasDragged to prevent click event from expanding
        // after a drag. The click event fires after mouseup, so we need
        // to keep hasDragged true until after the click event has processed
        setTimeout(() => {
          hasDragged = false;
        }, 100);
      }
    }
    
    // Add global event listeners
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchmove', onMouseMove, { passive: false });
    document.addEventListener('touchend', onMouseUp);
  }
  
  // Save widget position and height to localStorage
  function saveWidgetPosition(isRight, bottom, height) {
    try {
      localStorage.setItem('cc360_widget_position', JSON.stringify({
        isRight: isRight,
        bottom: bottom,
        height: height
      }));
    } catch (e) {
      console.error('[CC360 Widget] Failed to save position:', e);
    }
  }
  
  // Get current widget position
  function getWidgetPosition() {
    const widget = document.getElementById('cc360-onboarding-widget');
    if (!widget) return { isRight: true, bottom: 24 };
    
    const rect = widget.getBoundingClientRect();
    const isRight = widget.style.right !== 'auto' && widget.style.right !== '';
    const bottom = window.innerHeight - rect.bottom;
    
    return { isRight, bottom };
  }
  
  // Restore widget position and height from localStorage
  function restoreWidgetPosition() {
    try {
      const saved = localStorage.getItem('cc360_widget_position');
      if (!saved) return;
      
      const position = JSON.parse(saved);
      const widget = document.getElementById('cc360-onboarding-widget');
      if (!widget) return;
      
      // Apply saved position
      if (position.isRight) {
        widget.style.right = '24px';
        widget.style.left = 'auto';
      } else {
        widget.style.left = '24px';
        widget.style.right = 'auto';
      }
      
      if (position.height) {
        widget.style.height = position.height;
      }
      
      // Apply saved bottom position with viewport constraints
      const applyConstrainedPosition = () => {
        const rect = widget.getBoundingClientRect();
        const margin = 24;
        let bottom = position.bottom !== undefined ? position.bottom : margin;
        
        const widgetHeight = rect.height;
        const maxBottom = window.innerHeight - widgetHeight - margin;
        const minBottom = margin;
        
        // Constrain bottom position to keep widget fully visible
        const constrainedBottom = Math.max(minBottom, Math.min(bottom, maxBottom));
        
        widget.style.bottom = constrainedBottom + 'px';
        widget.style.top = 'auto';
        
        // Verify the widget is actually visible
        const finalRect = widget.getBoundingClientRect();
        
        // If still going off-screen, force it into view
        if (finalRect.bottom > window.innerHeight - margin) {
          const overflow = finalRect.bottom - (window.innerHeight - margin);
          widget.style.bottom = (constrainedBottom + overflow) + 'px';
          console.log('[CC360 Widget] Adjusted position on restore - was off bottom');
        }
        
        if (finalRect.top < margin) {
          const overflow = margin - finalRect.top;
          widget.style.bottom = (parseInt(widget.style.bottom) - overflow) + 'px';
          console.log('[CC360 Widget] Adjusted position on restore - was off top');
        }
        
        // Save the corrected position if it changed
        const finalBottom = parseInt(widget.style.bottom);
        if (finalBottom !== bottom) {
          saveWidgetPosition(position.isRight, finalBottom, widget.style.height);
          console.log('[CC360 Widget] Position corrected on restore:', {
            original: bottom,
            corrected: finalBottom,
            viewportHeight: window.innerHeight,
            widgetHeight: widgetHeight
          });
        }
      };
      
      // Apply with multiple checks to ensure it's correct
      setTimeout(applyConstrainedPosition, 10);
      setTimeout(applyConstrainedPosition, 100);
      
    } catch (e) {
      console.error('[CC360 Widget] Failed to restore position:', e);
    }
  }

  // Check if OAuth installation is complete and token is valid
  async function checkInstallation() {
    // If no location ID, always show setup required
    if (!locationId) {
      console.log('[CC360 Widget] No location ID - showing setup required');
      window.cc360WidgetError = 'Agency administrator needs to authorize this app. Please contact your agency admin.';
      return false;
    }
    
    try {
      // First, validate that the locationId exists in the agency's location list
      console.log('[CC360 Widget] Validating locationId with agency...');
      const validationResponse = await fetch(`${apiBase}/api/location/validate?locationId=${locationId}`);
      const validationData = await validationResponse.json();
      
      if (!validationData.valid) {
        console.error('[CC360 Widget] Location validation failed:', validationData.error);
        window.cc360WidgetError = validationData.error || 'This location is not accessible. Please contact your agency administrator.';
        return false;
      }
      
      console.log('[CC360 Widget] Location validated successfully:', validationData.locationName || locationId);
      
      // Now check installation and authorization
      const response = await fetch(`${apiBase}/api/installation/check?locationId=${locationId}`);
      if (!response.ok) throw new Error('Failed to check installation');
      const data = await response.json();
      console.log('[CC360 Widget] Installation check:', data);
      
      // Store error message if provided
      if (data.error) {
        window.cc360WidgetError = data.error;
      }
      
      // Simply check if installed and has token
      isInstalled = data.installed && data.hasToken;
      console.log('[CC360 Widget] Installation result:', isInstalled ? 'Authorized' : 'Not authorized');
      return isInstalled;
    } catch (error) {
      console.error('[CC360 Widget] Error checking installation:', error);
      return false;
    }
  }

  // Fetch initial status
  async function fetchStatus(forceSkipApiChecks) {
    // Can't fetch status without location ID
    if (!locationId) {
      console.warn('[CC360 Widget] Cannot fetch status without location ID');
      return false;
    }
    
    try {
      // Use forceSkipApiChecks if provided, otherwise use the widget's setting
      const shouldSkip = forceSkipApiChecks !== undefined ? forceSkipApiChecks : skipApiChecks;
      const skipParam = shouldSkip ? '&skipApiChecks=true' : '';
      const response = await fetch(`${apiBase}/api/status?locationId=${locationId}${skipParam}`);
      if (!response.ok) throw new Error('Failed to fetch status');
      currentStatus = await response.json();
      console.log('[CC360 Widget] Status:', currentStatus);
      
      // Check if widget should be shown (based on age and completion)
      shouldShowWidget = currentStatus.shouldShowWidget !== false;
      
      if (!shouldShowWidget) {
        console.log('[CC360 Widget] Widget should not be shown (30+ days old or all tasks completed)');
        // Remove widget if it's currently visible
        if (widgetElement) {
          widgetElement.remove();
          widgetElement = null;
        }
        return false;
      }
      
      // Note: We no longer use the 'dismissed' field since dismiss now means minimize
      // Widget is controlled by localStorage (minimized state) instead
      
      return true;
    } catch (error) {
      console.error('[CC360 Widget] Error fetching status:', error);
      return false;
    }
  }

  // Poll for status updates (serverless-friendly alternative to SSE)
  let pollInterval = null;
  
  function startStatusPolling() {
    if (!locationId) {
      console.warn('[CC360 Widget] Cannot poll status without location ID');
      return;
    }
    
    // Stop existing polling
    if (pollInterval) {
      clearInterval(pollInterval);
    }
    
    // Poll every 10 seconds for status updates
    pollInterval = setInterval(async () => {
      try {
        const shouldShow = await fetchStatus();
        
        if (!shouldShow || !currentStatus || !shouldShowWidget) {
          console.log('[CC360 Widget] Widget should no longer be shown, removing...');
          if (widgetElement) {
            widgetElement.remove();
            widgetElement = null;
          }
          stopStatusPolling();
          return;
        }
        
        // Update UI with current status
        renderChecklist(currentStatus);
      } catch (error) {
        console.error('[CC360 Widget] Error polling status:', error);
      }
    }, 10000);
    
    console.log('[CC360 Widget] ✅ Status polling started (every 10 seconds)');
  }
  
  function stopStatusPolling() {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
      console.log('[CC360 Widget] Status polling stopped');
    }
  }

  // Show start onboarding screen
  function showStartScreen() {
    if (!widgetElement) {
      widgetElement = document.createElement('div');
      widgetElement.id = 'cc360-onboarding-widget';
      document.body.appendChild(widgetElement);
    }

    widgetElement.innerHTML = `
      <style>
        #cc360-onboarding-widget {
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 380px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          z-index: 99999;
          overflow: hidden;
          transition: transform 0.3s ease;
        }
        #cc360-onboarding-widget.hidden {
          transform: translateY(120%);
        }
        .cc360-start-screen {
          padding: 40px;
          text-align: center;
        }
        .cc360-start-icon {
          font-size: 64px;
          margin-bottom: 20px;
        }
        .cc360-start-title {
          font-size: 24px;
          font-weight: 600;
          color: #2c3e50;
          margin: 0 0 12px 0;
          font-family: 'Helvetica Now', 'Helvetica Neue', Helvetica, Arial, sans-serif;
        }
        .cc360-start-subtitle {
          font-size: 14px;
          color: #6c757d;
          margin: 0 0 32px 0;
          line-height: 1.5;
        }
        .cc360-start-button {
          background: linear-gradient(135deg, #0E325E 0%, #0475FF 100%);
          color: white;
          border: none;
          padding: 14px 32px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          width: 100%;
        }
        .cc360-start-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(4, 117, 255, 0.4);
        }
        .cc360-start-button:active {
          transform: translateY(0);
        }
      </style>
      <div class="cc360-start-screen">
        <div class="cc360-start-icon">🚀</div>
        <h3 class="cc360-start-title">Welcome to CourseCreator360!</h3>
        <p class="cc360-start-subtitle">
          Let's get you set up in just a few steps. Click below to begin your onboarding journey.
        </p>
        <button class="cc360-start-button" onclick="window.cc360Widget.startOnboarding()">
          Start Onboarding
        </button>
      </div>
    `;
  }

  // Open OAuth popup
  function startOnboarding() {
    console.log('[CC360 Widget] Starting OAuth flow...');
    
    const width = 600;
    const height = 700;
    const left = (screen.width - width) / 2;
    const top = (screen.height - height) / 2;
    
    const oauthUrl = `${apiBase}/api/oauth/install?locationId=${locationId}`;
    const popup = window.open(
      oauthUrl,
      'CC360 Authorization',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`
    );
    
    if (!popup) {
      alert('Please allow popups for this site to complete authorization');
      return;
    }

    // Listen for OAuth completion message
    const messageHandler = (event) => {
      // Security: verify origin in production
      if (event.data && event.data.type === 'oauth_complete') {
        console.log('[CC360 Widget] OAuth complete!');
        window.removeEventListener('message', messageHandler);
        isInstalled = true;
        
        // Show loading state
        if (widgetElement) {
          widgetElement.innerHTML = `
            <div class="cc360-start-screen">
              <div class="cc360-start-icon">⏳</div>
              <h3 class="cc360-start-title">Loading your checklist...</h3>
            </div>
          `;
        }
        
        // Initialize checklist
        setTimeout(() => {
          initializeChecklist();
        }, 500);
      }
    };
    
    window.addEventListener('message', messageHandler);
    
    // Check if popup was closed without completing
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', messageHandler);
        console.log('[CC360 Widget] OAuth popup closed');
      }
    }, 500);
  }

  // Minimize widget (just minimizes, doesn't dismiss)
  function minimizeWidget() {
    if (!widgetElement) return;
    
    const widget = document.getElementById('cc360-onboarding-widget');
    if (!widget) return;
    
    // Minimize the widget (CSS transition handles the fade)
    isMinimized = true;
    widgetElement.classList.add('minimized');
    
    // Keep current position, just change the visual state
    const position = getWidgetPosition();
    saveWidgetPosition(position.isRight, position.bottom, widget.style.height);
    
    console.log('[CC360 Widget] Widget minimized');
  }
  
  // Show dismiss dialog
  // Show completion dialog when all tasks are done
  function showCompletionDialog() {
    // Create dialog overlay
    const overlay = document.createElement('div');
    overlay.className = 'cc360-dialog-overlay';
    overlay.innerHTML = `
      <div class="cc360-dialog cc360-dialog-success">
        <div class="cc360-dialog-icon">🎉</div>
        <h3 class="cc360-dialog-title">Congratulations!</h3>
        <p class="cc360-dialog-message">
          You've completed all onboarding tasks! Your account is now fully set up and ready to go.
        </p>
        <div class="cc360-dialog-buttons">
          <button class="cc360-dialog-btn cc360-dialog-btn-primary" id="cc360-dialog-ok">Got It!</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Handle "Got It!" button - show survey instead of dismissing
    document.getElementById('cc360-dialog-ok').addEventListener('click', () => {
      overlay.remove();
      showSurveyModal();
    });
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
        showSurveyModal();
      }
    });
  }

  // Show survey modal as a popup
  function showSurveyModal() {
    // Create survey modal overlay
    const surveyOverlay = document.createElement('div');
    surveyOverlay.id = 'cc360-survey-overlay';
    surveyOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100001;
      animation: cc360-fadeIn 0.2s ease;
    `;
    
    const surveyContainer = document.createElement('div');
    surveyContainer.id = 'cc360-survey-container';
    surveyContainer.style.cssText = `
      background: white;
      border-radius: 16px;
      padding: 40px;
      max-width: 700px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: cc360-slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
    `;
    
    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
      position: absolute;
      top: 16px;
      right: 16px;
      background: transparent;
      border: none;
      font-size: 32px;
      color: #6c757d;
      cursor: pointer;
      padding: 0;
      width: 32px;
      height: 32px;
      line-height: 32px;
      text-align: center;
    `;
    closeBtn.onclick = () => {
      surveyOverlay.remove();
      dismissWidgetPermanently();
    };
    
    surveyContainer.appendChild(closeBtn);
    
    // Survey content container
    const surveyContent = document.createElement('div');
    surveyContent.id = 'cc360-survey-root';
    surveyContainer.appendChild(surveyContent);
    
    surveyOverlay.appendChild(surveyContainer);
    document.body.appendChild(surveyOverlay);
    
    // Load React, ReactDOM, and Babel if not already loaded
    const loadScript = (src, type = 'text/javascript') => {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        if (type) script.type = type;
        script.onload = resolve;
        script.onerror = reject;
        if (type === 'text/babel') {
          script.setAttribute('data-type', 'module');
        }
        document.head.appendChild(script);
      });
    };
    
    // Load dependencies and render survey
    Promise.all([
      window.React ? Promise.resolve() : loadScript('https://unpkg.com/react@18/umd/react.production.min.js'),
      window.ReactDOM ? Promise.resolve() : loadScript('https://unpkg.com/react-dom@18/umd/react-dom.production.min.js'),
      window.Babel ? Promise.resolve() : loadScript('https://unpkg.com/@babel/standalone/babel.min.js')
    ]).then(() => {
      renderSurvey();
    }).catch(err => {
      console.error('[CC360 Widget] Failed to load survey dependencies:', err);
      surveyOverlay.remove();
      dismissWidgetPermanently();
    });
    
    function renderSurvey() {
      const { useState } = React;
      
      const OnboardingSurveyWidget = () => {
        const [step, setStep] = useState(0);
        const [formData, setFormData] = useState({
          reason: "",
          profession: "",
          hasDomain: "",
          domain: "",
          courseIdea: "",
        });
        const [submitted, setSubmitted] = useState(false);
        
        const logoUrl = "https://cc360-pages.s3.us-west-2.amazonaws.com/course-creator-360-logo.webp";
        const totalSteps = 5;
        
        const updateForm = (updates) => {
          setFormData((prev) => ({ ...prev, ...updates }));
        };
        
        const handleNext = () => {
          if (step < totalSteps - 1) {
            setStep(step + 1);
          } else {
            setSubmitted(true);
            console.log("Survey submitted with data:", formData);
            
            // Track in Userpilot
            if (window.userpilot) {
              try {
                console.log('[Userpilot] 📊 Tracking event: survey_completed');
                window.userpilot.track('survey_completed', {
                  location_id: locationId,
                  reason: formData.reason,
                  profession: formData.profession,
                  has_domain: formData.hasDomain,
                  domain: formData.domain || '',
                  course_idea: formData.courseIdea || '',
                  completed_at: new Date().toISOString()
                });
                console.log('[Userpilot] ✅ Survey completion event tracked');
              } catch (e) {
                console.error('[Userpilot] ❌ Error tracking survey completion:', e);
              }
            } else {
              console.log('[Userpilot] ⚠️ Userpilot not initialized, skipping survey tracking');
            }
            
            // Show booking modal after 2 seconds
            setTimeout(() => {
              surveyOverlay.remove();
              showBookingModal();
            }, 2000);
          }
        };
        
        const handleBack = () => {
          if (step > 0) setStep(step - 1);
        };
        
        const progressPercent = Math.min((step / (totalSteps - 1)) * 100, 100);
        
        const isNextDisabled = () => {
          switch (step) {
            case 1:
              return !formData.reason;
            case 2:
              return !formData.profession;
            case 3:
              if (!formData.hasDomain) return true;
              if (formData.hasDomain === "yes" && !formData.domain) return true;
              return false;
            case 4:
              return formData.courseIdea.trim().length < 40;
            default:
              return false;
          }
        };
        
        const renderStep = () => {
          const styles = {
            heading: { fontSize: '1.75rem', fontWeight: 600, marginBottom: '16px', lineHeight: 1.3, color: '#111827', fontFamily: "'Helvetica Now', 'Helvetica Neue', Helvetica, Arial, sans-serif" },
            subtext: { fontSize: '1rem', color: '#6b7280', marginBottom: '24px', lineHeight: 1.5 },
            optionList: { display: 'flex', flexDirection: 'column', gap: '12px' },
            optionItem: { display: 'flex', alignItems: 'center', padding: '16px 20px', border: '2px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem', color: '#374151', backgroundColor: '#ffffff', transition: 'all 0.2s ease' },
            radio: { marginRight: '12px', width: '20px', height: '20px', cursor: 'pointer' },
            textInput: { width: '100%', padding: '12px 16px', marginTop: '16px', fontSize: '1rem', border: '2px solid #e5e7eb', borderRadius: '8px', outline: 'none', transition: 'border-color 0.2s ease', boxSizing: 'border-box' },
            textArea: { width: '100%', padding: '12px 16px', fontSize: '1rem', border: '2px solid #e5e7eb', borderRadius: '8px', outline: 'none', resize: 'vertical', minHeight: '120px', transition: 'border-color 0.2s ease', fontFamily: 'inherit', boxSizing: 'border-box' },
            counter: { fontSize: '0.875rem', color: '#9ca3af', textAlign: 'right', marginTop: '8px' }
          };
          
          switch (step) {
            case 0:
              return React.createElement('div', null,
                React.createElement('h2', { style: styles.heading }, 
                  'Welcome! We\'re so excited to have you ', 
                  React.createElement('span', { role: 'img', 'aria-label': 'celebration' }, '🙌')
                ),
                React.createElement('p', { style: styles.subtext }, 'We have a few questions to personalize your experience.')
              );
            case 1:
              return React.createElement('div', null,
                React.createElement('h2', { style: styles.heading }, 'What brings you to Course Creator 360?'),
                React.createElement('div', { style: styles.optionList },
                  [
                    { key: "exploring", label: "Just casually exploring." },
                    { key: "monetize", label: "I want to monetize my knowledge online." },
                    { key: "better", label: "I'm looking for a better solution for my online business." },
                  ].map((opt) => 
                    React.createElement('label', { key: opt.key, style: styles.optionItem },
                      React.createElement('input', {
                        type: 'radio',
                        name: 'reason',
                        value: opt.key,
                        checked: formData.reason === opt.key,
                        onChange: () => updateForm({ reason: opt.key }),
                        style: styles.radio
                      }),
                      React.createElement('span', null, opt.label)
                    )
                  )
                )
              );
            case 2:
              return React.createElement('div', null,
                React.createElement('h2', { style: styles.heading }, 'How would you describe yourself professionally?'),
                React.createElement('div', { style: styles.optionList },
                  [
                    { key: "coach", label: "Coach, teacher, or instructor." },
                    { key: "creator", label: "Content creator." },
                    { key: "freelancer", label: "Freelancer or consultant." },
                    { key: "entrepreneur", label: "Entrepreneur." },
                    { key: "other", label: "Other." },
                  ].map((opt) => 
                    React.createElement('label', { key: opt.key, style: styles.optionItem },
                      React.createElement('input', {
                        type: 'radio',
                        name: 'profession',
                        value: opt.key,
                        checked: formData.profession === opt.key,
                        onChange: () => updateForm({ profession: opt.key }),
                        style: styles.radio
                      }),
                      React.createElement('span', null, opt.label)
                    )
                  )
                )
              );
            case 3:
              return React.createElement('div', null,
                React.createElement('h2', { style: styles.heading }, 'Do you have an existing domain?'),
                React.createElement('p', { style: styles.subtext }, 'A domain is the web address people type to reach your site (e.g. mybrand.com).'),
                React.createElement('div', { style: styles.optionList },
                  [
                    { key: "yes", label: "Yes" },
                    { key: "no", label: "No" },
                  ].map((opt) => 
                    React.createElement('label', { key: opt.key, style: styles.optionItem },
                      React.createElement('input', {
                        type: 'radio',
                        name: 'hasDomain',
                        value: opt.key,
                        checked: formData.hasDomain === opt.key,
                        onChange: () => updateForm({ hasDomain: opt.key, domain: "" }),
                        style: styles.radio
                      }),
                      React.createElement('span', null, opt.label)
                    )
                  )
                ),
                formData.hasDomain === "yes" && React.createElement('input', {
                  type: 'text',
                  placeholder: 'e.g. mybrand.com',
                  value: formData.domain,
                  onChange: (e) => updateForm({ domain: e.target.value }),
                  style: styles.textInput
                })
              );
            case 4:
              return React.createElement('div', null,
                React.createElement('h2', { style: styles.heading }, 'Describe your course idea in as much detail as possible:'),
                React.createElement('textarea', {
                  placeholder: 'E.g. \'My course teaches busy parents how to cook 20-minute vegetarian meals...\'',
                  value: formData.courseIdea,
                  onChange: (e) => updateForm({ courseIdea: e.target.value }),
                  style: styles.textArea,
                  rows: 5
                }),
                React.createElement('p', { style: styles.counter }, `${formData.courseIdea.trim().length} / 40`)
              );
            default:
              return null;
          }
        };
        
        if (submitted) {
          return React.createElement('div', null,
            React.createElement('div', { style: { textAlign: 'center', marginBottom: '30px' } },
              React.createElement('img', { src: logoUrl, alt: 'Course Creator 360', style: { height: '40px', width: 'auto' } })
            ),
            React.createElement('div', { style: { maxWidth: '600px', margin: '0 auto' } },
              React.createElement('div', { style: { width: '100%', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', marginBottom: '32px', overflow: 'hidden' } },
                React.createElement('div', { style: { height: '100%', background: 'linear-gradient(90deg, #0E325E 0%, #0475FF 100%)', borderRadius: '4px', width: '100%' } })
              ),
              React.createElement('div', null,
                React.createElement('h2', { style: { fontSize: '1.75rem', fontWeight: 600, marginBottom: '16px', lineHeight: 1.3, color: '#111827', fontFamily: "'Helvetica Now', 'Helvetica Neue', Helvetica, Arial, sans-serif" } },
                  '🎉 Thanks! We\'ve received your responses.'
                ),
                React.createElement('p', { style: { fontSize: '1rem', color: '#6b7280', marginBottom: '24px', lineHeight: 1.5 } },
                  'You can now proceed to book your free onboarding call.'
                )
              )
            )
          );
        }
        
        const buttonStyles = {
          button: { flex: 1, padding: '14px 24px', fontSize: '1rem', fontWeight: 600, borderRadius: '8px', border: 'none', cursor: 'pointer', transition: 'all 0.2s ease' },
          backButton: { backgroundColor: '#f3f4f6', color: '#374151' },
          primaryButton: { background: 'linear-gradient(135deg, #0E325E 0%, #0475FF 100%)', color: '#ffffff' }
        };
        
        return React.createElement('div', null,
          React.createElement('div', { style: { textAlign: 'center', marginBottom: '30px' } },
            React.createElement('img', { src: logoUrl, alt: 'Course Creator 360', style: { height: '40px', width: 'auto' } })
          ),
          React.createElement('div', { style: { maxWidth: '600px', margin: '0 auto' } },
            React.createElement('div', { style: { width: '100%', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', marginBottom: '32px', overflow: 'hidden' } },
              React.createElement('div', { style: { height: '100%', background: 'linear-gradient(90deg, #0E325E 0%, #0475FF 100%)', borderRadius: '4px', width: `${progressPercent}%`, transition: 'width 0.3s ease' } })
            ),
            renderStep(),
            React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', gap: '16px', marginTop: '32px' } },
              step > 0 ? React.createElement('button', { style: { ...buttonStyles.button, ...buttonStyles.backButton }, onClick: handleBack }, 'Back')
                : React.createElement('div', { style: { flex: 1 } }),
              React.createElement('button', {
                style: { ...buttonStyles.button, ...buttonStyles.primaryButton, opacity: isNextDisabled() ? 0.4 : 1, cursor: isNextDisabled() ? 'default' : 'pointer' },
                onClick: () => { if (!isNextDisabled()) handleNext(); },
                disabled: isNextDisabled()
              }, step === totalSteps - 1 ? 'Submit' : 'Next')
            )
          )
        );
      };
      
      const root = ReactDOM.createRoot(document.getElementById('cc360-survey-root'));
      root.render(React.createElement(OnboardingSurveyWidget));
    }
  }

  // Show booking modal after survey completion
  function showBookingModal() {
    // Create booking modal overlay
    const bookingOverlay = document.createElement('div');
    bookingOverlay.id = 'cc360-booking-overlay';
    bookingOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100002;
      animation: cc360-fadeIn 0.2s ease;
    `;
    
    const bookingModal = document.createElement('div');
    bookingModal.id = 'cc360-booking-modal';
    bookingModal.style.cssText = `
      background: white;
      border-radius: 16px;
      max-width: 600px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: cc360-slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `;
    
    // Header with logo and close button
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 24px;
      text-align: center;
      border-bottom: 1px solid #e5e7eb;
      position: relative;
    `;
    
    const logo = document.createElement('img');
    logo.src = 'https://cc360-pages.s3.us-west-2.amazonaws.com/course-creator-360-logo.webp';
    logo.alt = 'Course Creator 360';
    logo.style.cssText = 'height: 36px; width: auto; margin-bottom: 16px;';
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
      position: absolute;
      top: 16px;
      right: 16px;
      background: none;
      border: none;
      font-size: 28px;
      color: #6b7280;
      cursor: pointer;
      width: 32px;
      height: 32px;
      border-radius: 6px;
      transition: all 0.2s ease;
    `;
    closeBtn.onmouseover = () => { closeBtn.style.background = '#f3f4f6'; closeBtn.style.color = '#374151'; };
    closeBtn.onmouseout = () => { closeBtn.style.background = 'none'; closeBtn.style.color = '#6b7280'; };
    closeBtn.onclick = () => {
      bookingOverlay.remove();
      dismissWidgetPermanently();
    };
    
    header.appendChild(logo);
    header.appendChild(closeBtn);
    
    // Initial content view
    const initialContent = document.createElement('div');
    initialContent.id = 'cc360-booking-initial';
    initialContent.style.cssText = 'padding: 32px 24px; text-align: center;';
    initialContent.innerHTML = `
      <div style="font-size: 3.5rem; margin-bottom: 16px;">📞</div>
      <h2 style="font-size: 1.75rem; font-weight: 700; color: #111827; margin-bottom: 16px; line-height: 1.3; font-family: 'Helvetica Now', 'Helvetica Neue', Helvetica, Arial, sans-serif;">
        Did you know that creators who have an onboarding call make money 
        <span style="display: inline-block; background: linear-gradient(135deg, #0E325E 0%, #0475FF 100%); color: white; padding: 4px 12px; border-radius: 6px; font-weight: 700; font-size: 1.1rem; margin: 0 4px;">57% faster</span> 
        than those who don't?
      </h2>
      <p style="font-size: 1.1rem; color: #4b5563; margin-bottom: 24px; line-height: 1.6;">
        Book your free 1-on-1 onboarding call and get personalized guidance to accelerate your success.
      </p>
      <div style="text-align: left; margin: 24px auto; max-width: 400px;">
        <div style="display: flex; align-items: center; margin-bottom: 12px; font-size: 1rem; color: #374151;">
          <span style="font-size: 1.25rem; margin-right: 12px; min-width: 24px;">✅</span>
          <span>Personalized platform walkthrough</span>
        </div>
        <div style="display: flex; align-items: center; margin-bottom: 12px; font-size: 1rem; color: #374151;">
          <span style="font-size: 1.25rem; margin-right: 12px; min-width: 24px;">✅</span>
          <span>Custom strategy for your business</span>
        </div>
        <div style="display: flex; align-items: center; margin-bottom: 12px; font-size: 1rem; color: #374151;">
          <span style="font-size: 1.25rem; margin-right: 12px; min-width: 24px;">✅</span>
          <span>Answer all your questions live</span>
        </div>
        <div style="display: flex; align-items: center; margin-bottom: 12px; font-size: 1rem; color: #374151;">
          <span style="font-size: 1.25rem; margin-right: 12px; min-width: 24px;">✅</span>
          <span>Fast-track your first course launch</span>
        </div>
      </div>
    `;
    
    const scheduleBtn = document.createElement('button');
    scheduleBtn.innerHTML = '📅 Schedule My Free Onboarding Call';
    scheduleBtn.style.cssText = `
      padding: 16px 40px;
      font-size: 1.125rem;
      font-weight: 600;
      background: linear-gradient(135deg, #0E325E 0%, #0475FF 100%);
      color: white;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 14px rgba(4, 117, 255, 0.4);
      margin-top: 8px;
    `;
    scheduleBtn.onmouseover = () => {
      scheduleBtn.style.transform = 'translateY(-2px)';
      scheduleBtn.style.boxShadow = '0 6px 20px rgba(4, 117, 255, 0.5)';
    };
    scheduleBtn.onmouseout = () => {
      scheduleBtn.style.transform = 'translateY(0)';
      scheduleBtn.style.boxShadow = '0 4px 14px rgba(4, 117, 255, 0.4)';
    };
    scheduleBtn.onclick = () => {
      initialContent.style.display = 'none';
      calendarContent.style.display = 'block';
      header.style.display = 'none';
    };
    
    const skipBtn = document.createElement('button');
    skipBtn.innerHTML = 'Maybe later';
    skipBtn.style.cssText = `
      background: none;
      border: none;
      color: #9ca3af;
      font-size: 0.9rem;
      cursor: pointer;
      margin-top: 16px;
      padding: 8px;
      transition: color 0.2s ease;
    `;
    skipBtn.onmouseover = () => { skipBtn.style.color = '#6b7280'; skipBtn.style.textDecoration = 'underline'; };
    skipBtn.onmouseout = () => { skipBtn.style.color = '#9ca3af'; skipBtn.style.textDecoration = 'none'; };
    skipBtn.onclick = () => {
      bookingOverlay.remove();
      dismissWidgetPermanently();
    };
    
    initialContent.appendChild(scheduleBtn);
    initialContent.appendChild(skipBtn);
    
    // Calendar view
    const calendarContent = document.createElement('div');
    calendarContent.id = 'cc360-booking-calendar';
    calendarContent.style.cssText = 'padding: 0; height: 700px; overflow-y: auto; display: none; position: relative;';
    
    const backBtn = document.createElement('button');
    backBtn.innerHTML = '← Back';
    backBtn.style.cssText = `
      position: absolute;
      top: 16px;
      left: 16px;
      background: #f3f4f6;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 0.9rem;
      color: #374151;
      cursor: pointer;
      transition: all 0.2s ease;
      z-index: 10;
    `;
    backBtn.onmouseover = () => { backBtn.style.background = '#e5e7eb'; };
    backBtn.onmouseout = () => { backBtn.style.background = '#f3f4f6'; };
    backBtn.onclick = () => {
      calendarContent.style.display = 'none';
      initialContent.style.display = 'block';
      header.style.display = 'block';
    };
    
    const iframe = document.createElement('iframe');
    iframe.src = 'https://my.coursecreator360.com/widget/booking/k0yrAymNvet7hUvzBxTh';
    iframe.style.cssText = 'width: 100%; height: 100%; border: none;';
    iframe.setAttribute('scrolling', 'yes');
    
    calendarContent.appendChild(backBtn);
    calendarContent.appendChild(iframe);
    
    // Assemble modal
    bookingModal.appendChild(header);
    bookingModal.appendChild(initialContent);
    bookingModal.appendChild(calendarContent);
    
    bookingOverlay.appendChild(bookingModal);
    document.body.appendChild(bookingOverlay);
    
    // Close on overlay click
    bookingOverlay.addEventListener('click', (e) => {
      if (e.target === bookingOverlay) {
        bookingOverlay.remove();
        dismissWidgetPermanently();
      }
    });
    
    console.log('[CC360 Widget] Booking modal opened');
  }

  function showDismissDialog() {
    // Create dialog overlay
    const overlay = document.createElement('div');
    overlay.className = 'cc360-dialog-overlay';
    overlay.innerHTML = `
      <div class="cc360-dialog">
        <h3 class="cc360-dialog-title">Dismiss Onboarding?</h3>
        <p class="cc360-dialog-message">
          Would you like to keep this checklist or remove it permanently? You can always bring it back later if you keep it.
        </p>
        <div class="cc360-dialog-buttons">
          <button class="cc360-dialog-btn cc360-dialog-btn-primary" id="cc360-dialog-keep">Keep It</button>
          <button class="cc360-dialog-btn cc360-dialog-btn-secondary" id="cc360-dialog-discard">Discard Forever</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Handle "Keep It" button
    document.getElementById('cc360-dialog-keep').addEventListener('click', () => {
      overlay.remove();
    });
    
    // Handle "Discard Forever" button
    document.getElementById('cc360-dialog-discard').addEventListener('click', () => {
      overlay.remove();
      dismissWidgetPermanently();
    });
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });
  }
  
  // Dismiss widget permanently
  async function dismissWidgetPermanently() {
    if (!widgetElement) return;
    
    // Track in Userpilot
    if (window.userpilot) {
      try {
        console.log('[Userpilot] 📊 Tracking event: widget_dismissed');
        window.userpilot.track('widget_dismissed', {
          location_id: locationId,
          dismissed_at: new Date().toISOString()
        });
        console.log('[Userpilot] ✅ Event tracked successfully');
      } catch (e) {
        console.error('[Userpilot] ❌ Error tracking widget dismissal:', e);
      }
    } else {
      console.log('[Userpilot] ⚠️ Userpilot not initialized, skipping event tracking');
    }
    
    // Remove widget from DOM
    widgetElement.remove();
    widgetElement = null;
    
    // Mark as dismissed in database (controls widget visibility)
    if (locationId) {
      try {
        await fetch(`${apiBase}/api/dismiss`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locationId })
        });
        console.log('[CC360 Widget] Marked as dismissed in database');
      } catch (error) {
        console.error('[CC360 Widget] Error marking as dismissed:', error);
      }
    }
    
    // Stop polling
    stopStatusPolling();
    
    console.log('[CC360 Widget] Widget dismissed permanently');
  }
  
  // Expand widget from minimized state
  function expandWidget() {
    if (!widgetElement) return;
    
    const widget = document.getElementById('cc360-onboarding-widget');
    if (!widget) return;
    
    // Expand the widget
    isMinimized = false;
    widgetElement.classList.remove('minimized');
    
    // Ensure the expanded widget fits in viewport
    const rect = widget.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const margin = 24;
    
    // Check if widget would go off bottom of screen
    setTimeout(() => {
      const expandedRect = widget.getBoundingClientRect();
      const expandedHeight = expandedRect.height;
      
      // If it would go off the bottom, reposition it
      if (expandedRect.bottom > viewportHeight - margin) {
        const currentBottom = parseInt(widget.style.bottom) || margin;
        const overflow = expandedRect.bottom - (viewportHeight - margin);
        const newBottom = currentBottom + overflow;
        
        // Make sure we don't push it off the top
        const maxBottom = viewportHeight - expandedHeight - margin;
        widget.style.bottom = Math.min(newBottom, maxBottom) + 'px';
        
        console.log('[CC360 Widget] Adjusted position to fit in viewport');
      }
    }, 50); // Small delay to let DOM update
    
    console.log('[CC360 Widget] Widget expanded');
  }

  // Initialize checklist
  async function initializeChecklist() {
    console.log('[CC360 Widget] Initializing checklist...');
    
    const shouldShow = await fetchStatus();
    if (!shouldShow || !currentStatus || !shouldShowWidget) {
      console.log('[CC360 Widget] Not showing widget - eligibility check failed');
      return;
    }

    // Create widget if not exists
    if (!widgetElement) {
      widgetElement = createWidget();
      document.body.appendChild(widgetElement);
    } else {
      // Replace content with checklist
      const existingWidget = widgetElement;
      widgetElement = createWidget();
      existingWidget.replaceWith(widgetElement);
    }
    
    // Render initial checklist
    renderChecklist(currentStatus);
    
    // Setup drag and resize functionality
    setupDragAndResize();
    
    // Default to expanded state (no longer respect dismissed from database)
    // Widget always defaults to expanded on page load
    isMinimized = false;
    if (widgetElement) {
      widgetElement.classList.remove('minimized');
    }
    
    // Safety check after initialization to ensure widget is visible
    setTimeout(() => forceWidgetIntoView(), 150);
    
    // Start polling for status updates (serverless-friendly)
    startStatusPolling();
  }

  // Show not authorized message (minimized widget)
  function showNotAuthorized(errorMessage) {
    widgetElement = document.createElement('div');
    widgetElement.id = 'cc360-onboarding-widget';
    widgetElement.classList.add('minimized', 'setup-required');
    document.body.appendChild(widgetElement);

    // Always show simple message, log full error to console
    if (errorMessage) {
      console.error('[CC360 Widget] Setup error:', errorMessage);
    }

    widgetElement.innerHTML = `
      <style>
        #cc360-onboarding-widget.setup-required {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: auto;
          max-width: 300px;
          height: 48px;
          min-height: 48px;
          background: linear-gradient(135deg, #FF2F00 0%, #E2FF00 100%);
          border-radius: 24px;
          box-shadow: 0 4px 16px rgba(255, 47, 0, 0.3);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          z-index: 99999;
          overflow: hidden;
          cursor: default;
          transition: all 0.2s;
        }
        #cc360-onboarding-widget.setup-required:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(255, 47, 0, 0.4);
        }
        .cc360-setup-required-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 0 20px;
          height: 48px;
          color: white;
        }
        .cc360-setup-icon {
          font-size: 20px;
          line-height: 1;
        }
        .cc360-setup-text {
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
          color: #131313;
          font-family: 'Helvetica Now', 'Helvetica Neue', Helvetica, Arial, sans-serif;
        }
      </style>
      <div class="cc360-setup-required-content">
        <div class="cc360-setup-icon">🔒</div>
        <div class="cc360-setup-text">Setup Required: Contact Admin</div>
      </div>
    `;
  }

  // Initialize Userpilot with user context from GHL
  async function initUserpilot() {
    console.log('[Userpilot] Starting initialization...');
    console.log('[Userpilot] LocationId:', locationId);
    
    if (!locationId) {
      console.warn('[Userpilot] ❌ No locationId, skipping initialization');
      return;
    }
    
    // Get Userpilot token from backend config (preferred) or fallback to manual setting
    const token = userpilotToken || 
                  window.cc360UserpilotToken || 
                  document.currentScript?.getAttribute('data-userpilot-token');
    
    console.log('[Userpilot] Token sources:');
    console.log('[Userpilot]   - From backend config:', userpilotToken ? '✅' : '❌');
    console.log('[Userpilot]   - From window.cc360UserpilotToken:', window.cc360UserpilotToken ? '✅' : '❌');
    console.log('[Userpilot]   - From script attribute:', document.currentScript?.getAttribute('data-userpilot-token') ? '✅' : '❌');
    console.log('[Userpilot] Final token:', token ? '✅ Token available' : '❌ No token');
    
    if (!token) {
      console.warn('[Userpilot] ❌ No token available from any source, skipping initialization');
      console.log('[Userpilot] 💡 Set USERPILOT_TOKEN in Vercel environment variables');
      return;
    }
    
    try {
      // Fetch location context from backend
      console.log('[Userpilot] 📡 Fetching location context from:', `${apiBase}/api/location-context?locationId=${locationId}`);
      const response = await fetch(`${apiBase}/api/location-context?locationId=${locationId}`);
      console.log('[Userpilot] Context API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Userpilot] ❌ Failed to fetch context:', response.status, errorText);
        throw new Error(`Failed to fetch location context: ${response.status}`);
      }
      
      const context = await response.json();
      console.log('[Userpilot] ✅ Fetched location context:', context);
      
      // Load Userpilot SDK if not already loaded
      if (!window.userpilot) {
        console.log('[Userpilot] 📦 Loading Userpilot SDK...');
        
        // Set token BEFORE loading SDK (required by Userpilot)
        window.userpilotSettings = { 
          token: token 
        };
        console.log('[Userpilot] ✅ Set userpilotSettings with token:', token.substring(0, 10) + '...');
        
        const script = document.createElement('script');
        script.src = 'https://js.userpilot.io/sdk/latest.js';
        
        await new Promise((resolve, reject) => {
          script.onload = () => {
            console.log('[Userpilot] ✅ SDK loaded successfully');
            resolve();
          };
          script.onerror = (err) => {
            console.error('[Userpilot] ❌ SDK failed to load:', err);
            reject(err);
          };
          document.head.appendChild(script);
        });
        
        // Wait for SDK to fully initialize and make initial requests
        console.log('[Userpilot] ⏳ Waiting for SDK to initialize and connect...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      } else {
        console.log('[Userpilot] SDK already loaded');
      }
      
      // Check if SDK is available
      if (!window.userpilot) {
        console.error('[Userpilot] ❌ SDK not available after load');
        return;
      }
      
      console.log('[Userpilot] 🔍 SDK type:', typeof window.userpilot);
      console.log('[Userpilot] 🔍 Available methods:', Object.keys(window.userpilot || {}));
      
      // Prepare user data with GHL context
      const userData = {
        name: context.name,
        email: context.email,
        phone: context.phone,
        companyId: context.companyId,
        city: context.city,
        state: context.state,
        country: context.country,
        website: context.website,
        timezone: context.timezone,
        // Add onboarding progress
        onboarding_status: currentStatus?.allTasksCompleted ? 'completed' : 'active',
        domain_connected: currentStatus?.domainConnected || false,
        course_created: currentStatus?.courseCreated || false,
        payment_integrated: currentStatus?.paymentIntegrated || false
      };
      
      console.log('[Userpilot] 👤 Identifying user:', locationId);
      console.log('[Userpilot] User data:', userData);
      
      // Identify user with context from GHL
      if (typeof window.userpilot.identify === 'function') {
        window.userpilot.identify(locationId, userData);
        console.log('[Userpilot] ✅ Called userpilot.identify()');
      } else {
        console.warn('[Userpilot] ⚠️ identify method not available');
      }
    } catch (error) {
      console.error('[Userpilot] ❌ Failed to initialize:', error);
      console.error('[Userpilot] Error details:', error.message || error);
    }
  }

  // Initialize widget
  async function init() {
    console.log('[CC360 Widget] Initializing...');
    
    // Clear minimized state on page load (widget should default to expanded)
    try {
      localStorage.removeItem('cc360_widget_minimized');
    } catch (e) {}
    
    // Auto-detect location ID from GHL UserContext
    const detectedLocationId = await detectLocationFromContext();
    if (detectedLocationId) {
      locationId = detectedLocationId;
      console.log('[CC360 Widget] Using auto-detected location ID:', locationId);
    } else {
      console.warn('[CC360 Widget] Could not auto-detect location ID from GHL UserContext');
    }
    
    // Fetch configuration from backend
    await fetchConfig();
    
    // Check if authorized (agency or location)
    const installed = await checkInstallation();
    
    if (!installed) {
      // Not authorized or token expired - show message
      console.log('[CC360 Widget] Not authorized or token expired');
      const errorMessage = window.cc360WidgetError || null;
      showNotAuthorized(errorMessage);
    } else {
      // Authorized - show checklist directly
      console.log('[CC360 Widget] Authorized, showing checklist');
      await initializeChecklist();
      
      // Initialize Userpilot after checklist loads
      console.log('[CC360 Widget] 🎯 Calling initUserpilot...');
      await initUserpilot();
      console.log('[CC360 Widget] ✅ initUserpilot completed');
    }
  }

  // Expose functions globally
  window.cc360Widget = {
    minimize: minimizeWidget,
    expand: expandWidget,
    showDismissDialog: showDismissDialog,
    dismissPermanently: dismissWidgetPermanently,
    forceIntoView: forceWidgetIntoView,
    resetPosition: function() {
      localStorage.removeItem('cc360_widget_position');
      const widget = document.getElementById('cc360-onboarding-widget');
      if (widget) {
        widget.style.left = 'auto';
        widget.style.right = '24px';
        widget.style.top = 'auto';
        widget.style.bottom = '24px';
        widget.style.height = 'auto';
      }
      console.log('[CC360 Widget] Position reset to default');
    },
    testWidget: function() {
      console.log('=== CC360 Widget Status ===');
      console.log('Location ID:', locationId);
      console.log('API Base:', apiBase);
      console.log('Widget Element:', widgetElement ? 'Loaded' : 'Not loaded');
      console.log('Current Status:', currentStatus);
      console.log('');
      console.log('Available commands:');
      console.log('  window.cc360Widget.minimize() - Minimize widget');
      console.log('  window.cc360Widget.expand() - Expand widget');
      console.log('  window.cc360Widget.showDismissDialog() - Show dismiss dialog');
      console.log('  window.cc360Widget.resetPosition() - Reset widget position');
      console.log('  window.cc360Widget.forceIntoView() - Force widget into viewport');
      console.log('  window.cc360Widget.refresh() - Refresh checklist status');
      console.log('  window.cc360Widget.reload() - Reload widget');
      console.log('===========================');
    },
    refresh: async function(forceSkipApiChecks) {
      console.log('[CC360 Widget] Refreshing checklist status...');
      try {
        // Allow caller to override skipApiChecks for this refresh
        const shouldShow = await fetchStatus(forceSkipApiChecks);
        
        if (shouldShow && currentStatus && shouldShowWidget) {
          renderChecklist(currentStatus);
          console.log('[CC360 Widget] ✅ Checklist refreshed successfully');
        } else {
          console.log('[CC360 Widget] Widget should not be shown, skipping render');
        }
      } catch (error) {
        console.error('[CC360 Widget] Error refreshing checklist:', error);
      }
    },
    reload: async function() {
      if (widgetElement) {
        widgetElement.remove();
        widgetElement = null;
      }
      await init();
    }
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Handle window resize to keep widget in bounds
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      const widget = document.getElementById('cc360-onboarding-widget');
      if (!widget) return;
      
      const rect = widget.getBoundingClientRect();
      const margin = 24;
      let adjusted = false;
      
      // Check if widget is off-screen and adjust
      if (rect.bottom > window.innerHeight) {
        const overflow = rect.bottom - window.innerHeight + margin;
        const currentBottom = parseInt(widget.style.bottom) || margin;
        widget.style.bottom = (currentBottom + overflow) + 'px';
        adjusted = true;
      }
      
      if (rect.top < margin) {
        const currentBottom = parseInt(widget.style.bottom) || margin;
        const adjustment = margin - rect.top;
        widget.style.bottom = Math.max(margin, currentBottom - adjustment) + 'px';
        adjusted = true;
      }
      
      // Ensure bottom doesn't exceed bounds
      const widgetHeight = widget.offsetHeight;
      const maxBottom = window.innerHeight - widgetHeight - margin;
      const currentBottom = parseInt(widget.style.bottom) || margin;
      
      if (currentBottom > maxBottom) {
        widget.style.bottom = maxBottom + 'px';
        adjusted = true;
      }
      
      // Save adjusted position
      if (adjusted) {
        const position = getWidgetPosition();
        saveWidgetPosition(position.isRight, parseInt(widget.style.bottom), widget.style.height);
      }
    }, 100); // Debounce resize events
  });

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    if (eventSource) {
      eventSource.close();
    }
  });
})();


