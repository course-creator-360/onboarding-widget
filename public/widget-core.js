(function() {
  'use strict';

  window.CC360Widget = window.CC360Widget || {};

  // Get existing state (set by widget.js entry point before modules load)
  const existingState = window.CC360Widget?.state || {};
  const apiBase = existingState.apiBase || 'http://localhost:5000';
  const skipApiChecks = existingState.skipApiChecks || false;
  window.CC360Widget.state = Object.assign({
    apiBase: apiBase,
    skipApiChecks: skipApiChecks,
    locationId: null,
    currentStatus: null,
    widgetElement: null,
    isInstalled: false,
    shouldShowWidget: true,
    hasShownCompletionDialog: false,
    ghlAppBaseUrl: 'https://app.gohighlevel.com',
    userpilotToken: null,
    segmentWriteKey: null,
    profitWellAuthToken: null,
    widgetLocationFilter: null,
    customersApiConfigured: false,
    featureFlags: { connectPaymentsEnabled: true, connectDomainEnabled: true },
    ghlUser: null,
    customer: null,
    isMinimized: false,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    widgetStartX: 0,
    widgetStartY: 0,
    hasDragged: false,
    pollInterval: null,
    eventSource: null,  // deprecated (SSE removed)
    sseConnected: false  // deprecated (SSE removed)
  }, existingState, {
    // Ensure apiBase and skipApiChecks from script attributes take precedence
    apiBase: apiBase,
    skipApiChecks: skipApiChecks
  });

  if (skipApiChecks) {
    console.log('[CC360 Widget] ⚠️ API checks disabled - manual toggles will persist');
  }

  window.CC360Widget.fetchWithTimeout = function(url, options, timeoutMs) {
    timeoutMs = timeoutMs || 8000;
    var controller = new AbortController();
    var timer = setTimeout(function() { controller.abort(); }, timeoutMs);
    var opts = Object.assign({}, options || {}, { signal: controller.signal });
    return fetch(url, opts).finally(function() { clearTimeout(timer); });
  };

  window.CC360Widget.detectLocation = function() {
    // 1. GHL AppUtils (preferred -- instant, provided by GHL platform)
    try {
      if (typeof AppUtils !== 'undefined' && AppUtils.Utilities) {
        var loc = AppUtils.Utilities.getCurrentLocation();
        if (loc && typeof loc === 'object' && loc.id) {
          console.log('[CC360 Widget] Location from AppUtils:', loc.id);
          return loc.id;
        }
        if (loc && loc.then) {
          // getCurrentLocation may be async in some GHL versions -- handled below
        }
      }
    } catch (e) {}

    // 2. _GHL_CONTEXT (legacy)
    if (typeof window._GHL_CONTEXT !== 'undefined' && window._GHL_CONTEXT?.locationId) {
      console.log('[CC360 Widget] Location from _GHL_CONTEXT:', window._GHL_CONTEXT.locationId);
      return window._GHL_CONTEXT.locationId;
    }

    // 3. URL path / query (fallback for demo page & direct links)
    var urlMatch = window.location.pathname.match(/\/location\/([^\/]+)/) ||
                   window.location.search.match(/locationId=([^&]+)/);
    if (urlMatch && urlMatch[1]) {
      console.log('[CC360 Widget] Location from URL:', urlMatch[1]);
      return urlMatch[1];
    }

    return null;
  };

  window.CC360Widget.detectLocationAsync = async function() {
    var sync = window.CC360Widget.detectLocation();
    if (sync) return sync;

    // Try async AppUtils.Utilities.getCurrentLocation()
    try {
      if (typeof AppUtils !== 'undefined' && AppUtils.Utilities) {
        var loc = await AppUtils.Utilities.getCurrentLocation();
        if (loc && loc.id) {
          console.log('[CC360 Widget] Location from AppUtils (async):', loc.id);
          return loc.id;
        }
      }
    } catch (e) {}

    return null;
  };

  window.CC360Widget.applyConfig = function(config) {
    var state = window.CC360Widget.state;
    if (!config) return;
    if (config.ghlAppBaseUrl) state.ghlAppBaseUrl = config.ghlAppBaseUrl;
    if (config.userpilotToken) state.userpilotToken = config.userpilotToken;
    if (config.segmentWriteKey) state.segmentWriteKey = config.segmentWriteKey;
    if (config.profitWellAuthToken) state.profitWellAuthToken = config.profitWellAuthToken;
    if (config.widgetLocationFilter) state.widgetLocationFilter = config.widgetLocationFilter;
    state.customersApiConfigured = config.customersApiConfigured === true;
    if (config.featureFlags) state.featureFlags = config.featureFlags;
  };

  window.CC360Widget.buildDashboardUrl = function(path) {
    const state = window.CC360Widget.state;
    return `${state.ghlAppBaseUrl}/v2/location/${state.locationId}/${path}`;
  };

  window.CC360Widget.fetchStatus = async function(forceSkipApiChecks) {
    const state = window.CC360Widget.state;
    if (!state.locationId) {
      console.warn('[CC360 Widget] Cannot fetch status without location ID');
      return false;
    }
    
    try {
      const shouldSkip = forceSkipApiChecks !== undefined ? forceSkipApiChecks : state.skipApiChecks;
      const skipParam = shouldSkip ? '&skipApiChecks=true' : '';
      const url = `${state.apiBase}/api/status?locationId=${state.locationId}${skipParam}`;
      console.log('[CC360 Widget] Fetching status from:', url);
      
      const response = await window.CC360Widget.fetchWithTimeout(url, {}, 8000);
      console.log('[CC360 Widget] Status response status:', response.status, response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[CC360 Widget] Status fetch failed:', response.status, errorText);
        throw new Error(`Failed to fetch status: ${response.status} ${errorText}`);
      }
      
      state.currentStatus = await response.json();
      console.log('[CC360 Widget] Status received:', state.currentStatus);
      console.log('[CC360 Widget] Survey completed:', state.currentStatus.surveyCompleted);
      console.log('[CC360 Widget] Booking cancelled:', state.currentStatus.bookingCancelled);
      
      state.shouldShowWidget = state.currentStatus.shouldShowWidget !== false;
      console.log('[CC360 Widget] shouldShowWidget evaluated to:', state.shouldShowWidget);
      
      if (!state.shouldShowWidget) {
        console.log('[CC360 Widget] Widget should not be shown (30+ days old or all tasks completed)');
        if (state.widgetElement) {
          state.widgetElement.remove();
          state.widgetElement = null;
        }
        return false;
      }
      
      console.log('[CC360 Widget] fetchStatus returning true');
      return true;
    } catch (error) {
      console.error('[CC360 Widget] ❌ Error fetching status:', error);
      console.error('[CC360 Widget] Error message:', error.message);
      console.error('[CC360 Widget] Error stack:', error.stack);
      return false;
    }
  };

  window.CC360Widget.checkInstallation = async function() {
    var state = window.CC360Widget.state;
    return state.isInstalled;
  };

  window.CC360Widget.handleStatusUpdate = async function(newStatus) {
    const state = window.CC360Widget.state;
    if (!newStatus) return;
    
    state.currentStatus = newStatus;
    
    if (!state.currentStatus.shouldShowWidget) {
      console.log('[CC360 Widget] Widget should no longer be shown, removing...');
      if (state.widgetElement) {
        state.widgetElement.remove();
        state.widgetElement = null;
      }
      window.CC360Widget.stopStatusUpdates();
      return;
    }
    
    window.CC360Widget.renderChecklist(state.currentStatus);
  };

  window.CC360Widget.startSSE = function() {
    // SSE removed: incompatible with Vercel serverless (60s timeout).
    // Polling is the primary update mechanism now.
  };

  window.CC360Widget.pollForStatus = async function() {
    const state = window.CC360Widget.state;
    try {
      const shouldShow = await window.CC360Widget.fetchStatus();
      
      if (!shouldShow || !state.currentStatus || !state.shouldShowWidget) {
        console.log('[CC360 Widget] Widget should no longer be shown, removing...');
        if (state.widgetElement) {
          state.widgetElement.remove();
          state.widgetElement = null;
        }
        window.CC360Widget.stopStatusUpdates();
        return;
      }
      
      window.CC360Widget.renderChecklist(state.currentStatus);
    } catch (error) {
      console.error('[CC360 Widget] Error polling status:', error);
    }
  };

  window.CC360Widget.startStatusPolling = function() {
    const state = window.CC360Widget.state;
    if (!state.locationId) {
      console.warn('[CC360 Widget] Cannot poll status without location ID');
      return;
    }
    
    if (state.pollInterval) {
      clearInterval(state.pollInterval);
    }
    
    state.pollInterval = setInterval(window.CC360Widget.pollForStatus, 15000);
    console.log('[CC360 Widget] Status polling started (every 15 seconds)');
  };

  window.CC360Widget.stopStatusUpdates = function() {
    const state = window.CC360Widget.state;
    if (state.pollInterval) {
      clearInterval(state.pollInterval);
      state.pollInterval = null;
      console.log('[CC360 Widget] Status polling stopped');
    }
  };

  window.CC360Widget.stopStatusPolling = function() {
    window.CC360Widget.stopStatusUpdates();
  };

  window.CC360Widget.minimizeWidget = function() {
    const state = window.CC360Widget.state;
    if (!state.widgetElement) return;
    
    const widget = document.getElementById('cc360-onboarding-widget');
    if (!widget) return;
    
    state.isMinimized = true;
    state.widgetElement.classList.add('minimized');
    
    window.CC360Widget.trackSegmentEvent('Widget Minimized', {
      onboardingStatus: state.currentStatus?.allTasksCompleted ? 'completed' : 'active',
      completedSteps: state.currentStatus ? [
        state.currentStatus.courseCreated && 'course_created',
        state.currentStatus.domainConnected && 'domain_connected',
        state.currentStatus.paymentIntegrated && 'payment_integrated'
      ].filter(Boolean) : []
    });
    
    const position = window.CC360Widget.getWidgetPosition();
    window.CC360Widget.saveWidgetPosition(position.isRight, position.bottom, widget.style.height);
    
    console.log('[CC360 Widget] Widget minimized');
  };

  window.CC360Widget.expandWidget = function() {
    const state = window.CC360Widget.state;
    if (!state.widgetElement) return;
    
    const widget = document.getElementById('cc360-onboarding-widget');
    if (!widget) return;
    
    state.isMinimized = false;
    state.widgetElement.classList.remove('minimized');
    
    window.CC360Widget.trackSegmentEvent('Widget Expanded', {
      onboardingStatus: state.currentStatus?.allTasksCompleted ? 'completed' : 'active'
    });
    
    const rect = widget.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const margin = 24;
    
    setTimeout(() => {
      const expandedRect = widget.getBoundingClientRect();
      const expandedHeight = expandedRect.height;
      
      if (expandedRect.bottom > viewportHeight - margin) {
        const currentBottom = parseInt(widget.style.bottom) || margin;
        const overflow = expandedRect.bottom - (viewportHeight - margin);
        const newBottom = currentBottom + overflow;
        
        const maxBottom = viewportHeight - expandedHeight - margin;
        widget.style.bottom = Math.min(newBottom, maxBottom) + 'px';
        
        console.log('[CC360 Widget] Adjusted position to fit in viewport');
      }
    }, 50);
    
    console.log('[CC360 Widget] Widget expanded');
  };

  window.CC360Widget.dismissWidgetPermanently = async function() {
    const state = window.CC360Widget.state;
    if (!state.widgetElement) return;
    
    if (window.userpilot) {
      try {
        console.log('[Userpilot] 📊 Tracking event: widget_dismissed');
        window.userpilot.track('widget_dismissed', {
          location_id: state.locationId,
          dismissed_at: new Date().toISOString()
        });
        console.log('[Userpilot] ✅ Event tracked successfully');
      } catch (e) {
        console.error('[Userpilot] ❌ Error tracking widget dismissal:', e);
      }
    } else {
      console.log('[Userpilot] ⚠️ Userpilot not initialized, skipping event tracking');
    }
    
    window.CC360Widget.trackSegmentEvent('Widget Dismissed', {
      dismissed_at: new Date().toISOString()
    });
    
    state.widgetElement.remove();
    state.widgetElement = null;
    
    if (state.locationId) {
      try {
        await fetch(`${state.apiBase}/api/dismiss`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locationId: state.locationId })
        });
        console.log('[CC360 Widget] Marked as dismissed in database');
      } catch (error) {
        console.error('[CC360 Widget] Error marking as dismissed:', error);
      }
    }
    
    window.CC360Widget.stopStatusPolling();
    
    console.log('[CC360 Widget] Widget dismissed permanently');
  };

  window.CC360Widget.saveWidgetPosition = function(isRight, bottom, height) {
    try {
      localStorage.setItem('cc360_widget_position', JSON.stringify({
        isRight: isRight,
        bottom: bottom,
        height: height
      }));
    } catch (e) {
      console.error('[CC360 Widget] Failed to save position:', e);
    }
  };

  window.CC360Widget.getWidgetPosition = function() {
    const widget = document.getElementById('cc360-onboarding-widget');
    if (!widget) return { isRight: true, bottom: 24 };
    
    const rect = widget.getBoundingClientRect();
    const isRight = widget.style.right !== 'auto' && widget.style.right !== '';
    const bottom = window.innerHeight - rect.bottom;
    
    return { isRight, bottom };
  };

  window.CC360Widget.restoreWidgetPosition = function() {
    try {
      const saved = localStorage.getItem('cc360_widget_position');
      if (!saved) return;
      
      const position = JSON.parse(saved);
      const widget = document.getElementById('cc360-onboarding-widget');
      if (!widget) return;
      
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
      
      const applyConstrainedPosition = () => {
        const rect = widget.getBoundingClientRect();
        const margin = 24;
        let bottom = position.bottom !== undefined ? position.bottom : margin;
        
        const widgetHeight = rect.height;
        const maxBottom = window.innerHeight - widgetHeight - margin;
        const minBottom = margin;
        
        const constrainedBottom = Math.max(minBottom, Math.min(bottom, maxBottom));
        
        widget.style.bottom = constrainedBottom + 'px';
        widget.style.top = 'auto';
        
        const finalRect = widget.getBoundingClientRect();
        
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
        
        const finalBottom = parseInt(widget.style.bottom);
        if (finalBottom !== bottom) {
          window.CC360Widget.saveWidgetPosition(position.isRight, finalBottom, widget.style.height);
          console.log('[CC360 Widget] Position corrected on restore:', {
            original: bottom,
            corrected: finalBottom,
            viewportHeight: window.innerHeight,
            widgetHeight: widgetHeight
          });
        }
      };
      
      setTimeout(applyConstrainedPosition, 10);
      setTimeout(applyConstrainedPosition, 100);
      
    } catch (e) {
      console.error('[CC360 Widget] Failed to restore position:', e);
    }
  };

  window.CC360Widget.setupDragAndResize = function() {
    const state = window.CC360Widget.state;
    const widget = document.getElementById('cc360-onboarding-widget');
    const minimizedWidget = document.querySelector('.cc360-widget-minimized');
    const minimizeBtn = document.getElementById('cc360-minimize-btn');
    
    if (!widget) return;

    window.CC360Widget.restoreWidgetPosition();
    
    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (state.isMinimized) {
          window.CC360Widget.expandWidget();
        } else {
          window.CC360Widget.minimizeWidget();
        }
      });
      minimizeBtn.addEventListener('mousedown', (e) => {
        e.stopPropagation();
      });
      minimizeBtn.addEventListener('touchstart', (e) => {
        e.stopPropagation();
      });
    }
    
    if (minimizedWidget) {
      minimizedWidget.addEventListener('mousedown', startDraggingMinimized);
      minimizedWidget.addEventListener('touchstart', startDraggingMinimized);
      
      minimizedWidget.addEventListener('click', (e) => {
        if (!state.hasDragged) {
          e.stopPropagation();
          if (state.isMinimized) {
            window.CC360Widget.expandWidget();
          } else {
            window.CC360Widget.minimizeWidget();
          }
        }
      });
    }
    
    function startDraggingMinimized(e) {
      if (!state.isMinimized) return;
      
      state.isDragging = true;
      state.hasDragged = false;
      widget.classList.add('dragging');
      
      const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
      const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
      
      state.dragStartX = clientX;
      state.dragStartY = clientY;
      
      const rect = widget.getBoundingClientRect();
      state.widgetStartX = rect.left;
      state.widgetStartY = rect.top;
      
      e.preventDefault();
      e.stopPropagation();
    }
    
    function onMouseMove(e) {
      if (state.isDragging) {
        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
        
        const deltaX = clientX - state.dragStartX;
        const deltaY = clientY - state.dragStartY;
        
        const dragThreshold = 8;
        const movement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (movement > dragThreshold && !state.hasDragged) {
          state.hasDragged = true;
          console.log('[CC360 Widget] Drag detected - movement:', Math.round(movement), 'px');
        }
        
        if (state.hasDragged) {
          let newX = state.widgetStartX + deltaX;
          let newY = state.widgetStartY + deltaY;
          
          const margin = 24;
          const widgetWidth = widget.offsetWidth;
          const widgetHeight = widget.offsetHeight;
          
          const minX = -widgetWidth + 100;
          const maxX = window.innerWidth - 100;
          newX = Math.max(minX, Math.min(newX, maxX));
          
          const minY = 0;
          const maxY = window.innerHeight - 60;
          newY = Math.max(minY, Math.min(newY, maxY));
          
          widget.style.left = newX + 'px';
          widget.style.top = newY + 'px';
          widget.style.bottom = 'auto';
          widget.style.right = 'auto';
        }
      }
    }
    
    function onMouseUp(e) {
      if (state.isDragging) {
        widget.classList.remove('dragging');
        
        if (state.hasDragged) {
          console.log('[CC360 Widget] Drag completed - repositioning and snapping to side');
          
          const rect = widget.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const screenCenter = window.innerWidth / 2;
          
          const snapToRight = centerX > screenCenter;
          const margin = 24;
          
          let bottomPos = window.innerHeight - rect.bottom;
          
          const widgetHeight = state.isMinimized ? 50 : widget.offsetHeight;
          
          const maxAllowedBottom = state.isMinimized 
            ? window.innerHeight - widgetHeight - 5
            : window.innerHeight - widgetHeight - 10;
          
          const minBottom = 10;
          
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
          
          window.CC360Widget.saveWidgetPosition(snapToRight, bottomPos, widget.style.height);
        }
        
        state.isDragging = false;
        
        setTimeout(() => {
          state.hasDragged = false;
        }, 100);
      }
    }
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchmove', onMouseMove, { passive: false });
    document.addEventListener('touchend', onMouseUp);
  };

  window.CC360Widget.startOnboarding = function() {
    const state = window.CC360Widget.state;
    console.log('[CC360 Widget] Starting OAuth flow...');
    
    const width = 600;
    const height = 700;
    const left = (screen.width - width) / 2;
    const top = (screen.height - height) / 2;
    
    const oauthUrl = `${state.apiBase}/api/oauth/install?locationId=${state.locationId}`;
    const popup = window.open(
      oauthUrl,
      'CC360 Authorization',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`
    );
    
    if (!popup) {
      alert('Please allow popups for this site to complete authorization');
      return;
    }

    const messageHandler = (event) => {
      if (event.data && event.data.type === 'oauth_complete') {
        console.log('[CC360 Widget] OAuth complete!');
        window.removeEventListener('message', messageHandler);
        state.isInstalled = true;
        
        if (state.widgetElement) {
          state.widgetElement.innerHTML = `
            <div class="cc360-start-screen">
              <div class="cc360-start-icon">⏳</div>
              <h3 class="cc360-start-title">Loading your checklist...</h3>
            </div>
          `;
        }
        
        setTimeout(() => {
          window.CC360Widget.initializeChecklist();
        }, 500);
      }
    };
    
    window.addEventListener('message', messageHandler);
    
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', messageHandler);
        console.log('[CC360 Widget] OAuth popup closed');
      }
    }, 500);
  };

  window.CC360Widget.initializeChecklist = async function() {
    const state = window.CC360Widget.state;
    console.log('[CC360 Widget] Initializing checklist...');
    
    try {
      var shouldShow;
      if (state.currentStatus && state.shouldShowWidget) {
        console.log('[CC360 Widget] Using already-fetched status');
        shouldShow = true;
      } else {
        console.log('[CC360 Widget] Fetching status from API...');
        shouldShow = await window.CC360Widget.fetchStatus();
      }
      console.log('[CC360 Widget] shouldShow:', shouldShow, 'currentStatus:', !!state.currentStatus, 'shouldShowWidget:', state.shouldShowWidget);
      
      if (!shouldShow || !state.currentStatus || !state.shouldShowWidget) {
        console.log('[CC360 Widget] Not showing widget - eligibility check failed');
        console.log('[CC360 Widget] shouldShow:', shouldShow, 'currentStatus:', !!state.currentStatus, 'shouldShowWidget:', state.shouldShowWidget);
        return;
      }

      console.log('[CC360 Widget] Creating widget element...');
      if (!state.widgetElement) {
        state.widgetElement = window.CC360Widget.createWidget();
        document.body.appendChild(state.widgetElement);
        console.log('[CC360 Widget] Widget element created and appended to body');
      } else {
        const existingWidget = state.widgetElement;
        state.widgetElement = window.CC360Widget.createWidget();
        existingWidget.replaceWith(state.widgetElement);
        console.log('[CC360 Widget] Widget element replaced');
      }
      
      console.log('[CC360 Widget] Rendering checklist...');
      window.CC360Widget.renderChecklist(state.currentStatus);
      
      console.log('[CC360 Widget] Setting up drag and resize...');
      window.CC360Widget.setupDragAndResize();
      
      state.isMinimized = false;
      if (state.widgetElement) {
        state.widgetElement.classList.remove('minimized');
      }
      
      setTimeout(() => window.CC360Widget.forceWidgetIntoView(), 150);
      
      console.log('[CC360 Widget] Starting status polling...');
      window.CC360Widget.startStatusPolling();
      
      console.log('[CC360 Widget] ✅ Checklist initialized successfully');
    } catch (error) {
      console.error('[CC360 Widget] ❌ Error initializing checklist:', error);
      console.error('[CC360 Widget] Error stack:', error.stack);
    }
  };

  window.CC360Widget.init = async function() {
    var state = window.CC360Widget.state;
    var initStart = Date.now();
    console.log('[CC360 Widget] Initializing...');

    try { localStorage.removeItem('cc360_widget_minimized'); } catch (e) {}

    // ── Phase 1: get location ID (instant from GHL context or URL) ──
    var locationId = window.CC360Widget.detectLocation();
    if (!locationId) {
      locationId = await window.CC360Widget.detectLocationAsync();
    }
    if (!locationId) {
      console.error('[CC360 Widget] No location ID found - widget stopped');
      return;
    }
    state.locationId = locationId;
    console.log('[CC360 Widget] Location:', locationId);

    // ── Phase 2: single /api/init call (config + verify + install + status) ──
    try {
      var response = await window.CC360Widget.fetchWithTimeout(
        state.apiBase + '/api/init?locationId=' + locationId, {}, 8000
      );
      if (!response.ok) {
        console.error('[CC360 Widget] /api/init failed:', response.status);
        return;
      }
      var data = await response.json();
      console.log('[CC360 Widget] Init completed in', Date.now() - initStart, 'ms');
    } catch (err) {
      console.error('[CC360 Widget] Init request failed:', err.message);
      return;
    }

    // ── Apply config ──
    window.CC360Widget.applyConfig(data.config);

    // ── Check gates ──
    if (data.show === false) {
      console.log('[CC360 Widget] Widget not shown:', data.reason);
      return;
    }

    // ── Inject styles (needed by dialogs even if createWidget isn't called) ──
    if (!document.getElementById('cc360-widget-styles')) {
      var styleEl = document.createElement('style');
      styleEl.id = 'cc360-widget-styles';
      styleEl.textContent = window.CC360Widget.getWidgetStyles() + '\n' + window.CC360Widget.getStartScreenStyles();
      document.head.appendChild(styleEl);
    }

    // ── Clean up stale overlays from prior renders ──
    document.querySelectorAll('.cc360-dialog-overlay, #cc360-booking-overlay, #cc360-outline-notif, #cc360-video-panel, #cc360-video-modal-overlay').forEach(function(el) { el.remove(); });

    // ── Process status ──
    if (data.status) {
      state.currentStatus = data.status;
      state.shouldShowWidget = data.status.shouldShowWidget !== false;
    }

    state.isInstalled = !!data.installed;

    if (data.customer) {
      state.customer = data.customer;
      console.log('[CC360 Widget] Customer:', data.customer.name, '| Status:', data.customer.subscriptionStatus);
    }

    // ── Render ──
    if (!data.installed) {
      console.log('[CC360 Widget] Not authorized');
      window.cc360WidgetError = data.installError || null;
      window.CC360Widget.showNotAuthorized(data.installError || null);
    } else if (state.currentStatus && state.shouldShowWidget) {
      if (!state.currentStatus.surveyCompleted) {
        console.log('[CC360 Widget] Showing survey');
        window.CC360Widget.showSurveyModal();
      } else {
        console.log('[CC360 Widget] Showing checklist');
        await window.CC360Widget.initializeChecklist();
      }
    } else if (state.currentStatus && state.currentStatus.allTasksCompleted && !state.currentStatus.bookingCancelled) {
      await window.CC360Widget.checkAndShowBookingModal();
    }

    // ── Check for pending course outline video (persists across page navigations) ──
    try {
      const pendingVideo = localStorage.getItem('cc360_course_outline_video');
      if (pendingVideo && window.CC360Widget.showCourseOutlineVideo) {
        console.log('[CC360 Widget] Pending course outline video found, showing player');
        window.CC360Widget.showCourseOutlineVideo();
      }
    } catch (e) {}

    // ── Deferred non-critical work ──
    window.CC360Widget.startSessionTracking();
    if (data.installed && state.currentStatus && state.currentStatus.surveyCompleted) {
      try {
        if (typeof AppUtils !== 'undefined' && AppUtils.Utilities && AppUtils.Utilities.getCurrentUser) {
          var ghlUser = await AppUtils.Utilities.getCurrentUser();
          if (ghlUser) {
            state.ghlUser = {
              id: ghlUser.id,
              name: ghlUser.name || ((ghlUser.firstName || '') + ' ' + (ghlUser.lastName || '')).trim(),
              firstName: ghlUser.firstName || '',
              lastName: ghlUser.lastName || '',
              email: ghlUser.email || '',
              role: ghlUser.role || '',
              type: ghlUser.type || ''
            };
            console.log('[CC360 Widget] GHL user context gathered for analytics');
          }
        }
      } catch (e) {
        console.log('[CC360 Widget] GHL AppUtils not available for analytics context');
      }
      window.CC360Widget.initUserpilot().catch(function() {});
      window.CC360Widget.initSegment().catch(function() {});
      window.CC360Widget.initProfitWell().catch(function() {});
    }
  };

  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      const widget = document.getElementById('cc360-onboarding-widget');
      if (!widget) return;
      
      const rect = widget.getBoundingClientRect();
      const margin = 24;
      let adjusted = false;
      
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
      
      const widgetHeight = widget.offsetHeight;
      const maxBottom = window.innerHeight - widgetHeight - margin;
      const currentBottom = parseInt(widget.style.bottom) || margin;
      
      if (currentBottom > maxBottom) {
        widget.style.bottom = maxBottom + 'px';
        adjusted = true;
      }
      
      if (adjusted) {
        const position = window.CC360Widget.getWidgetPosition();
        window.CC360Widget.saveWidgetPosition(position.isRight, parseInt(widget.style.bottom), widget.style.height);
      }
    }, 100);
  });

  // ── Session tracking ───────────────────────────────────────────────
  async function gatherGHLContext() {
    var meta = {};
    try {
      if (typeof AppUtils !== 'undefined' && AppUtils.Utilities) {
        var user = await AppUtils.Utilities.getCurrentUser();
        if (user) {
          meta.ghlUserId = user.id;
          meta.userName = user.name || ((user.firstName || '') + ' ' + (user.lastName || '')).trim();
          meta.userEmail = user.email;
          meta.userRole = user.role;
        }
        var loc = await AppUtils.Utilities.getCurrentLocation();
        if (loc) {
          meta.locationName = loc.name;
          if (loc.address) {
            meta.city = loc.address.city;
            meta.country = loc.address.country;
          }
        }
      }
    } catch (e) {
      console.log('[CC360 Widget] GHL AppUtils not available, skipping context enrichment');
    }
    return Object.keys(meta).length > 0 ? meta : undefined;
  }

  window.CC360Widget.startSessionTracking = async function() {
    const state = window.CC360Widget.state;
    if (!state.locationId || !state.apiBase) return;
    if (state._sessionActive) return;
    state._sessionActive = true;

    const apiBase = state.apiBase;
    const locationId = state.locationId;
    const HEARTBEAT_INTERVAL = 60000;

    const metadata = await gatherGHLContext();

    fetch(`${apiBase}/api/sessions/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locationId, metadata }),
    }).then(r => r.json()).then(d => {
      console.log('[CC360 Widget] Session started', d.session?.id || '', metadata ? '(with GHL context)' : '');
      state._currentSessionId = d.session?.id || null;
    }).catch(e => {
      console.warn('[CC360 Widget] Session login failed:', e.message);
    });

    // ── Page-level tracking via GHL route change events ──
    var _lastPageEnteredAt = Date.now();
    var _lastPagePath = window.location.pathname;

    function sendPageView(pagePath, pageUrl, pageTitle, prevDuration) {
      fetch(`${apiBase}/api/sessions/pageview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId: locationId,
          path: pagePath,
          url: pageUrl,
          title: pageTitle,
          source: 'ghl',
          sessionId: state._currentSessionId || undefined,
          previousPageDuration: prevDuration > 0 ? prevDuration : undefined,
        }),
      }).catch(function() {});
    }

    function onRouteChange() {
      var now = Date.now();
      var prevDuration = Math.floor((now - _lastPageEnteredAt) / 1000);
      var pagePath = window.location.pathname;
      var pageTitle = document.title;

      try {
        if (typeof AppUtils !== 'undefined' && AppUtils.RouteHelper) {
          AppUtils.RouteHelper.getCurrentRoute().then(function(route) {
            var rPath = (route && (route.path || route.fullPath)) || pagePath;
            sendPageView(rPath, window.location.href, pageTitle, prevDuration);
          }).catch(function() {
            sendPageView(pagePath, window.location.href, pageTitle, prevDuration);
          });
        } else {
          sendPageView(pagePath, window.location.href, pageTitle, prevDuration);
        }
      } catch (e) {
        sendPageView(pagePath, window.location.href, pageTitle, prevDuration);
      }

      _lastPageEnteredAt = now;
      _lastPagePath = pagePath;
    }

    // Record the initial page
    sendPageView(window.location.pathname, window.location.href, document.title, 0);
    window.addEventListener('routeLoaded', onRouteChange);
    window.addEventListener('routeChangeEvent', onRouteChange);
    console.log('[CC360 Widget] Page tracking enabled (GHL route events)');

    // ── Screenshot-based recording (html2canvas) ──
    (function initScreenshotRecording() {
      var frameBuffer = [];
      var CAPTURE_INTERVAL = 2000;
      var MAX_BUFFER = 5;
      var capturing = false;

      function flushFrames() {
        if (frameBuffer.length === 0 || !state._currentSessionId) return;
        var batch = frameBuffer.splice(0, frameBuffer.length);
        fetch(apiBase + '/api/sessions/screenshots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: state._currentSessionId, frames: batch }),
        }).catch(function() {});
      }

      function captureFrame() {
        if (document.visibilityState !== 'visible' || capturing) return;
        if (typeof html2canvas === 'undefined') return;
        if (document.getElementById('cc360-survey-overlay') || document.getElementById('cc360-booking-overlay')) return;
        capturing = true;
        html2canvas(document.body, {
          logging: false,
          useCORS: true,
          allowTaint: true,
          scale: 0.5,
          width: window.innerWidth,
          height: window.innerHeight,
          x: window.scrollX,
          y: window.scrollY,
        }).then(function(canvas) {
          var data = canvas.toDataURL('image/jpeg', 0.5);
          frameBuffer.push({ data: data, timestamp: new Date().toISOString() });
          if (frameBuffer.length >= MAX_BUFFER) flushFrames();
          capturing = false;
        }).catch(function() {
          capturing = false;
        });
      }

      var h2cScript = document.createElement('script');
      h2cScript.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
      h2cScript.onload = function() {
        if (typeof html2canvas === 'undefined') {
          console.warn('[CC360 Widget] html2canvas not available');
          return;
        }
        state._screenshotTimer = setInterval(captureFrame, CAPTURE_INTERVAL);
        console.log('[CC360 Widget] Screenshot recording started (every 2s)');
      };
      h2cScript.onerror = function() {
        console.warn('[CC360 Widget] Failed to load html2canvas CDN');
      };
      document.head.appendChild(h2cScript);

      state._flushScreenshots = flushFrames;
    })();

    state._heartbeatTimer = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      fetch(`${apiBase}/api/sessions/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId }),
      }).catch(() => {});
    }, HEARTBEAT_INTERVAL);

    const endSession = () => {
      if (!state._sessionActive) return;
      state._sessionActive = false;
      if (state._heartbeatTimer) clearInterval(state._heartbeatTimer);
      if (state._screenshotTimer) clearInterval(state._screenshotTimer);
      if (state._flushScreenshots) { try { state._flushScreenshots(); } catch (e) {} }
      try {
        fetch(`${apiBase}/api/sessions/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locationId }),
          keepalive: true,
        });
      } catch (e) {}
    };

    window.addEventListener('beforeunload', endSession);
  };

  window.addEventListener('beforeunload', () => {
    window.CC360Widget.stopStatusUpdates();
  });

  console.log('[CC360 Widget] Core module loaded');
})();
