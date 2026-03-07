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
    widgetLocationFilter: null,
    customersApiConfigured: false,
    featureFlags: { connectPaymentsEnabled: true, connectDomainEnabled: true },
    isMinimized: false,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    widgetStartX: 0,
    widgetStartY: 0,
    hasDragged: false,
    pollInterval: null,
    eventSource: null,
    sseConnected: false
  }, existingState, {
    // Ensure apiBase and skipApiChecks from script attributes take precedence
    apiBase: apiBase,
    skipApiChecks: skipApiChecks
  });

  if (skipApiChecks) {
    console.log('[CC360 Widget] ⚠️ API checks disabled - manual toggles will persist');
  }

  function tryDetectLocation() {
    if (typeof window._GHL_CONTEXT !== 'undefined' && window._GHL_CONTEXT?.locationId) {
      console.log('[CC360 Widget] Detected location ID from _GHL_CONTEXT:', window._GHL_CONTEXT.locationId);
      return window._GHL_CONTEXT.locationId;
    }

    const urlMatch = window.location.pathname.match(/\/location\/([^\/]+)/) || 
                     window.location.search.match(/locationId=([^&]+)/);
    if (urlMatch && urlMatch[1]) {
      console.log('[CC360 Widget] Detected location ID from URL:', urlMatch[1]);
      return urlMatch[1];
    }

    try {
      if (window.parent && window.parent !== window) {
        const parentUrl = window.parent.location.href;
        const parentMatch = parentUrl.match(/\/location\/([^\/]+)/) ||
                          parentUrl.match(/locationId=([^&]+)/);
        if (parentMatch && parentMatch[1]) {
          console.log('[CC360 Widget] Detected location ID from parent URL:', parentMatch[1]);
          return parentMatch[1];
        }
        
        if (window.parent._GHL_CONTEXT?.locationId) {
          console.log('[CC360 Widget] Detected location ID from parent _GHL_CONTEXT:', window.parent._GHL_CONTEXT.locationId);
          return window.parent._GHL_CONTEXT.locationId;
        }
      }
    } catch (e) {
      console.log('[CC360 Widget] Cannot access parent context (cross-origin)');
    }

    return null;
  }

  window.CC360Widget.detectLocationFromContext = async function() {
    try {
      const immediateResult = tryDetectLocation();
      if (immediateResult) {
        return immediateResult;
      }

      console.log('[CC360 Widget] GHL context not immediately available, polling...');
      
      const maxRetries = 30;
      const retryDelay = 100;
      
      for (let i = 0; i < maxRetries; i++) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        
        const result = tryDetectLocation();
        if (result) {
          console.log(`[CC360 Widget] Location ID detected after ${(i + 1) * retryDelay}ms`);
          return result;
        }
      }

      console.warn('[CC360 Widget] Could not detect location ID from GHL context after polling');
      return null;
    } catch (error) {
      console.error('[CC360 Widget] Error detecting location from context:', error);
      return null;
    }
  };

  window.CC360Widget.fetchConfig = async function() {
    const state = window.CC360Widget.state;
    try {
      console.log('[CC360 Widget] 🔧 Fetching config from:', `${state.apiBase}/api/config`);
      const response = await fetch(`${state.apiBase}/api/config`);
      if (response.ok) {
        const config = await response.json();
        console.log('[CC360 Widget] ✅ Config received:', config);
        
        if (config.ghlAppBaseUrl) {
          state.ghlAppBaseUrl = config.ghlAppBaseUrl;
          console.log('[CC360 Widget] Using GHL base URL:', state.ghlAppBaseUrl);
        }
        
        if (config.userpilotToken) {
          state.userpilotToken = config.userpilotToken;
          console.log('[CC360 Widget] ✅ Userpilot token received from backend');
        } else {
          console.log('[CC360 Widget] ⚠️ No Userpilot token in config');
        }
        
        if (config.segmentWriteKey) {
          state.segmentWriteKey = config.segmentWriteKey;
          console.log('[CC360 Widget] ✅ Segment write key received from backend');
        } else {
          console.log('[CC360 Widget] ⚠️ No Segment write key in config');
        }
        
        if (config.widgetLocationFilter) {
          state.widgetLocationFilter = config.widgetLocationFilter;
          console.log('[CC360 Widget] 🎯 Widget location pre-filter enabled:', state.widgetLocationFilter);
        } else {
          console.log('[CC360 Widget] 🌍 No location pre-filter - will verify all locations via API');
        }
        
        state.customersApiConfigured = config.customersApiConfigured === true;
        if (state.customersApiConfigured) {
          console.log('[CC360 Widget] ✅ CC360 Customers API verification is configured');
        } else {
          console.error('[CC360 Widget] ❌ CC360_CUSTOMERS_API_KEY is NOT configured');
          console.error('[CC360 Widget] ❌ Widget will NOT show anywhere until this is set');
        }
        
        if (config.featureFlags) {
          state.featureFlags = config.featureFlags;
          console.log('[CC360 Widget] 🚩 Feature flags received:', state.featureFlags);
        }
      }
    } catch (error) {
      console.warn('[CC360 Widget] ❌ Could not fetch config:', error);
    }
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
      
      const response = await fetch(url);
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
    const state = window.CC360Widget.state;
    if (!state.locationId) {
      console.log('[CC360 Widget] No location ID - showing setup required');
      window.cc360WidgetError = 'Agency administrator needs to authorize this app. Please contact your agency admin.';
      return false;
    }
    
    try {
      console.log('[CC360 Widget] Validating locationId with agency...');
      const validationResponse = await fetch(`${state.apiBase}/api/location/validate?locationId=${state.locationId}`);
      const validationData = await validationResponse.json();
      
      if (!validationData.valid) {
        console.error('[CC360 Widget] Location validation failed:', validationData.error);
        window.cc360WidgetError = validationData.error || 'This location is not accessible. Please contact your agency administrator.';
        return false;
      }
      
      console.log('[CC360 Widget] Location validated successfully:', validationData.locationName || state.locationId);
      
      const response = await fetch(`${state.apiBase}/api/installation/check?locationId=${state.locationId}`);
      if (!response.ok) throw new Error('Failed to check installation');
      const data = await response.json();
      console.log('[CC360 Widget] Installation check:', data);
      
      if (data.error) {
        window.cc360WidgetError = data.error;
      }
      
      state.isInstalled = data.installed && data.hasToken;
      console.log('[CC360 Widget] Installation result:', state.isInstalled ? 'Authorized' : 'Not authorized');
      return state.isInstalled;
    } catch (error) {
      console.error('[CC360 Widget] Error checking installation:', error);
      return false;
    }
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
    const state = window.CC360Widget.state;
    if (!state.locationId) {
      console.warn('[CC360 Widget] Cannot start SSE without location ID');
      return;
    }
    
    if (state.eventSource) {
      state.eventSource.close();
    }
    
    try {
      const sseUrl = `${state.apiBase}/api/events?locationId=${state.locationId}`;
      console.log('[CC360 Widget] 🔌 Connecting to SSE:', sseUrl);
      
      state.eventSource = new EventSource(sseUrl);
      
      state.eventSource.onopen = () => {
        state.sseConnected = true;
        console.log('[CC360 Widget] ✅ SSE connected - instant updates enabled');
        if (state.pollInterval) {
          clearInterval(state.pollInterval);
          state.pollInterval = setInterval(window.CC360Widget.pollForStatus, 30000);
          console.log('[CC360 Widget] 📉 Reduced polling to 30s (SSE active)');
        }
      };
      
      state.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[CC360 Widget] 📨 SSE update received:', data);
          const status = data.payload || data;
          window.CC360Widget.handleStatusUpdate(status);
        } catch (error) {
          console.error('[CC360 Widget] Error parsing SSE message:', error);
        }
      };
      
      state.eventSource.onerror = (error) => {
        console.warn('[CC360 Widget] ⚠️ SSE error/disconnected:', error);
        state.sseConnected = false;
        state.eventSource.close();
        state.eventSource = null;
        
        if (state.pollInterval) {
          clearInterval(state.pollInterval);
        }
        state.pollInterval = setInterval(window.CC360Widget.pollForStatus, 5000);
        console.log('[CC360 Widget] 📈 Increased polling to 5s (SSE fallback)');
        
        setTimeout(() => {
          if (!state.sseConnected && state.locationId) {
            console.log('[CC360 Widget] 🔄 Attempting SSE reconnect...');
            window.CC360Widget.startSSE();
          }
        }, 10000);
      };
      
    } catch (error) {
      console.error('[CC360 Widget] Failed to create SSE connection:', error);
      state.sseConnected = false;
    }
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
    
    state.pollInterval = setInterval(window.CC360Widget.pollForStatus, 5000);
    console.log('[CC360 Widget] ✅ Status polling started (every 5 seconds)');
    
    window.CC360Widget.startSSE();
  };

  window.CC360Widget.stopStatusUpdates = function() {
    const state = window.CC360Widget.state;
    if (state.pollInterval) {
      clearInterval(state.pollInterval);
      state.pollInterval = null;
      console.log('[CC360 Widget] Status polling stopped');
    }
    if (state.eventSource) {
      state.eventSource.close();
      state.eventSource = null;
      state.sseConnected = false;
      console.log('[CC360 Widget] SSE connection closed');
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
      console.log('[CC360 Widget] Fetching status from API...');
      const shouldShow = await window.CC360Widget.fetchStatus();
      console.log('[CC360 Widget] fetchStatus returned:', shouldShow);
      console.log('[CC360 Widget] currentStatus:', state.currentStatus);
      console.log('[CC360 Widget] shouldShowWidget:', state.shouldShowWidget);
      
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
    const state = window.CC360Widget.state;
    console.log('[CC360 Widget] Initializing...');
    
    try {
      localStorage.removeItem('cc360_widget_minimized');
    } catch (e) {}
    
    const detectedLocationId = await window.CC360Widget.detectLocationFromContext();
    if (detectedLocationId) {
      state.locationId = detectedLocationId;
      console.log('[CC360 Widget] Using auto-detected location ID:', state.locationId);
    } else {
      console.error('[CC360 Widget] ❌ Could not auto-detect location ID from GHL UserContext');
      console.error('[CC360 Widget] ❌ Widget initialization STOPPED - no location ID');
      return;
    }
    
    await window.CC360Widget.fetchConfig();
    
    if (!state.customersApiConfigured) {
      console.error('[CC360 Widget] ❌ CC360_CUSTOMERS_API_KEY is NOT configured');
      console.error('[CC360 Widget] ❌ Widget initialization STOPPED - API key required');
      return;
    }
    
    if (state.widgetLocationFilter) {
      if (state.locationId !== state.widgetLocationFilter) {
        console.log('[CC360 Widget] 🚫 Location pre-filter mismatch - widget will not show');
        console.log('[CC360 Widget] Current location:', state.locationId);
        console.log('[CC360 Widget] Allowed location:', state.widgetLocationFilter);
        console.log('[CC360 Widget] Widget initialization STOPPED (skipping API call)');
        return;
      }
      console.log('[CC360 Widget] ✅ Location pre-filter check passed');
    }
    
    console.log('[CC360 Widget] 🔍 Verifying location authorization via API...');
    try {
      const response = await fetch(`${state.apiBase}/api/location/verify?locationId=${state.locationId}`);
      if (!response.ok) {
        console.error('[CC360 Widget] ❌ API verification request failed (HTTP', response.status, ')');
        console.error('[CC360 Widget] ❌ Widget initialization STOPPED');
        return;
      }
      
      const result = await response.json();
      
      if (result.authorized === true) {
        console.log('[CC360 Widget] ✅ Location authorized by API');
        if (result.customer) {
          console.log('[CC360 Widget] Customer:', result.customer.name || result.customer.locationId);
          
          const subscriptionStatus = result.customer.subscriptionStatus;
          const customerCreatedAt = result.customer.createdAt ? new Date(result.customer.createdAt) : null;
          const daysSinceCreation = customerCreatedAt ? (Date.now() - customerCreatedAt.getTime()) / (1000 * 60 * 60 * 24) : Infinity;
          const isTrialing = subscriptionStatus === 'trialing';
          
          console.log('[CC360 Widget] Subscription status:', subscriptionStatus, '| Days since creation:', Math.round(daysSinceCreation));
          
          if (!isTrialing || daysSinceCreation > 30) {
            console.log('[CC360 Widget] Widget NOT shown - subscription is not trialing or account is older than 30 days');
            return;
          }
        }
      } else {
        console.log('[CC360 Widget] ❌ Location NOT authorized by API');
        console.log('[CC360 Widget] Reason:', result.error || 'Location not found');
        console.log('[CC360 Widget] Widget initialization STOPPED');
        return;
      }
    } catch (error) {
      console.error('[CC360 Widget] ❌ API verification failed:', error.message);
      console.error('[CC360 Widget] ❌ Widget initialization STOPPED');
      return;
    }
    
    console.log('[CC360 Widget] ✅ All checks passed - proceeding with initialization');
    
    window.CC360Widget.startSessionTracking();
    
    const installed = await window.CC360Widget.checkInstallation();
    
    if (!installed) {
      console.log('[CC360 Widget] Not authorized or token expired');
      const errorMessage = window.cc360WidgetError || null;
      window.CC360Widget.showNotAuthorized(errorMessage);
    } else {
      console.log('[CC360 Widget] Authorized, checking survey completion status...');
      
      const shouldShow = await window.CC360Widget.fetchStatus();
      if (shouldShow && state.currentStatus) {
        console.log('[CC360 Widget] Decision logic - surveyCompleted:', state.currentStatus.surveyCompleted);
        if (!state.currentStatus.surveyCompleted) {
          console.log('[CC360 Widget] Survey not completed - showing survey modal first');
          window.CC360Widget.showSurveyModal();
        } else {
          console.log('[CC360 Widget] Survey completed - showing checklist');
          await window.CC360Widget.initializeChecklist();
          
          console.log('[CC360 Widget] 🎯 Calling initUserpilot...');
          await window.CC360Widget.initUserpilot();
          console.log('[CC360 Widget] ✅ initUserpilot completed');
          
          console.log('[CC360 Widget] 🎯 Calling initSegment...');
          await window.CC360Widget.initSegment();
          console.log('[CC360 Widget] ✅ initSegment completed');
        }
      } else {
        console.log('[CC360 Widget] Could not fetch status or widget should not be shown');
        
        if (state.currentStatus && state.currentStatus.allTasksCompleted && !state.currentStatus.bookingCancelled) {
          console.log('[CC360 Widget] All tasks completed - checking if booking modal should show');
          await window.CC360Widget.checkAndShowBookingModal();
        }
      }
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
    const state = window.CC360Widget.state;
    if (state.eventSource) {
      state.eventSource.close();
    }
  });

  console.log('[CC360 Widget] Core module loaded');
})();
