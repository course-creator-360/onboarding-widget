(function() {
  'use strict';

  window.CC360Widget = window.CC360Widget || {};

  window.CC360Widget.getWidgetStyles = function() {
    return `
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
      .cc360-dialog-overlay--high {
        z-index: 100003;
      }
      .cc360-dialog--wide {
        max-width: 420px;
        text-align: center;
        position: relative;
      }
      .cc360-dialog-close {
        position: absolute;
        top: 16px;
        right: 16px;
        background: transparent;
        border: none;
        font-size: 28px;
        color: #6b7280;
        cursor: pointer;
        width: 32px;
        height: 32px;
        border-radius: 6px;
        transition: all 0.2s ease;
        line-height: 1;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .cc360-dialog-close:hover {
        background: #f3f4f6;
        color: #374151;
      }
      .cc360-dialog-btn-danger {
        background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
        color: white;
      }
      .cc360-dialog-btn-danger:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);
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
    `;
  };

  window.CC360Widget.getStartScreenStyles = function() {
    return `
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
    `;
  };

  console.log('[CC360 Widget] Styles module loaded');
})();

(function() {
  'use strict';

  window.CC360Widget = window.CC360Widget || {};

  window.CC360Widget.initUserpilot = async function() {
    var state = window.CC360Widget.state;
    if (!state.userpilotToken) {
      console.log('[Userpilot] Skipping - no token available');
      return;
    }

    if (!state.locationId) {
      console.log('[Userpilot] Skipping - no location ID');
      return;
    }

    console.log('[Userpilot] Initializing with token:', state.userpilotToken.substring(0, 8) + '...');

    try {
      if (typeof window.userpilot !== 'undefined') {
        console.log('[Userpilot] SDK already loaded');
      } else {
        console.log('[Userpilot] Loading SDK...');
        await new Promise(function(resolve, reject) {
          var script = document.createElement('script');
          script.src = 'https://js.userpilot.io/sdk/latest.js';
          script.async = true;
          script.onload = function() {
            console.log('[Userpilot] SDK loaded successfully');
            resolve();
          };
          script.onerror = function(e) {
            console.error('[Userpilot] SDK load failed:', e);
            reject(e);
          };
          document.head.appendChild(script);
        });

        await new Promise(function(resolve) { setTimeout(resolve, 100); });
      }

      if (typeof window.userpilot === 'undefined') {
        console.error('[Userpilot] SDK not available after loading');
        return;
      }

      window.userpilot.init(state.userpilotToken);

      var ghlUser = state.ghlUser || {};
      var customer = state.customer || {};

      var userData = {
        id: state.locationId,
        email: ghlUser.email || customer.email || (state.locationId + '@placeholder.com'),
        name: ghlUser.name || customer.name || state.locationId,
        company: customer.locationId || state.locationId,
        location_id: state.locationId,
        onboarding_status: state.currentStatus?.allTasksCompleted ? 'completed' : 'active',
        domain_connected: state.currentStatus?.domainConnected || false,
        course_created: state.currentStatus?.courseCreated || false,
        payment_integrated: state.currentStatus?.paymentIntegrated || false
      };

      console.log('[Userpilot] Identifying user:', userData.id);
      window.userpilot.identify(userData.id, userData);
      console.log('[Userpilot] identify() called successfully');

    } catch (error) {
      console.error('[Userpilot] Failed to initialize:', error);
    }
  };

  window.CC360Widget.initSegment = async function() {
    var state = window.CC360Widget.state;
    if (!state.segmentWriteKey) {
      console.log('[Segment] Skipping - no write key available');
      return;
    }

    if (!state.locationId) {
      console.log('[Segment] Skipping - no location ID');
      return;
    }

    console.log('[Segment] Initializing with write key:', state.segmentWriteKey.substring(0, 8) + '...');

    try {
      if (typeof window.analytics !== 'undefined' && window.analytics.initialized) {
        console.log('[Segment] Analytics already initialized');
      } else {
        var analytics = window.analytics = window.analytics || [];
        if (!analytics.initialize) {
          if (analytics.invoked) {
            console.error('[Segment] Snippet included twice');
          } else {
            analytics.invoked = true;
            analytics.methods = ["trackSubmit","trackClick","trackLink","trackForm","pageview","identify","reset","group","track","ready","alias","debug","page","once","off","on","addSourceMiddleware","addIntegrationMiddleware","setAnonymousId","addDestinationMiddleware"];
            analytics.factory = function(e) {
              return function() {
                var t = Array.prototype.slice.call(arguments);
                t.unshift(e);
                analytics.push(t);
                return analytics;
              };
            };
            for (var i = 0; i < analytics.methods.length; i++) {
              var key = analytics.methods[i];
              analytics[key] = analytics.factory(key);
            }
            analytics.load = function(key, e) {
              var t = document.createElement("script");
              t.type = "text/javascript";
              t.async = true;
              t.src = "https://cdn.segment.com/analytics.js/v1/" + key + "/analytics.min.js";
              var n = document.getElementsByTagName("script")[0];
              n.parentNode.insertBefore(t, n);
              analytics._loadOptions = e;
            };
            analytics._writeKey = state.segmentWriteKey;
            analytics.SNIPPET_VERSION = "4.15.3";
            analytics.load(state.segmentWriteKey);
            console.log('[Segment] Analytics.js loading...');
          }
        }

        await new Promise(function(resolve) { setTimeout(resolve, 500); });
      }

      var ghlUser = state.ghlUser || {};
      var customer = state.customer || {};

      var userId = ghlUser.id || state.locationId;
      var userEmail = ghlUser.email || customer.email || '';
      var userName = ghlUser.name || customer.name || '';
      var firstName = ghlUser.firstName || '';
      var lastName = ghlUser.lastName || '';
      var userRole = ghlUser.role || '';
      var locationId = state.locationId;
      var customerName = customer.name || '';
      var subscriptionStatus = customer.subscriptionStatus || '';
      var customerCreatedAt = customer.createdAt || '';

      if (window.analytics && typeof window.analytics.identify === 'function') {
        window.analytics.identify(userId, {
          user_id: userId,
          email: userEmail,
          name: userName,
          first_name: firstName,
          last_name: lastName,
          company: {
            id: locationId,
            name: customerName,
            subscription_status: subscriptionStatus,
            created_at: customerCreatedAt
          },
          platform: 'cc360-app',
          environment: 'production',
          role: userRole
        });
        console.log('[Segment] Called analytics.identify() for', userId);
      }

      if (window.analytics && typeof window.analytics.page === 'function') {
        window.analytics.page('Onboarding Widget', {
          locationId: locationId,
          onboardingStatus: state.currentStatus?.allTasksCompleted ? 'completed' : 'active'
        });
        console.log('[Segment] Tracked page view');
      }

    } catch (error) {
      console.error('[Segment] Failed to initialize:', error);
    }
  };

  window.CC360Widget.initProfitWell = async function() {
    var state = window.CC360Widget.state;
    if (!state.profitWellAuthToken) {
      console.log('[ProfitWell] Skipping - no auth token available');
      return;
    }

    var stripeCustomerId = state.customer && state.customer.stripeCustomerId;
    if (!stripeCustomerId) {
      console.log('[ProfitWell] Skipping - no Stripe customer ID available');
      return;
    }

    console.log('[ProfitWell] Initializing...');

    try {
      if (typeof window.profitwell !== 'undefined') {
        console.log('[ProfitWell] SDK already loaded');
      } else {
        await new Promise(function(resolve, reject) {
          var script = document.createElement('script');
          script.id = 'profitwell-js';
          script.src = 'https://public.profitwell.com/js/profitwell.js?auth=' + state.profitWellAuthToken;
          script.async = true;
          script.setAttribute('data-pw-auth', state.profitWellAuthToken);
          script.onload = function() {
            console.log('[ProfitWell] SDK loaded successfully');
            resolve();
          };
          script.onerror = function(e) {
            console.error('[ProfitWell] SDK load failed:', e);
            reject(e);
          };
          document.head.appendChild(script);
        });

        await new Promise(function(resolve) { setTimeout(resolve, 200); });
      }

      if (typeof window.profitwell === 'undefined') {
        console.error('[ProfitWell] SDK not available after loading');
        return;
      }

      window.profitwell('start', { user_id: stripeCustomerId });
      console.log('[ProfitWell] Started with Stripe customer:', stripeCustomerId);

    } catch (error) {
      console.error('[ProfitWell] Failed to initialize:', error);
    }
  };

  window.CC360Widget.trackSegmentEvent = function(eventName, properties) {
    var state = window.CC360Widget.state;
    if (!window.analytics || typeof window.analytics.track !== 'function') {
      console.warn('[Segment] Analytics not available for tracking:', eventName);
      return;
    }

    var eventProperties = Object.assign({ location_id: state.locationId }, properties || {});
    window.analytics.track(eventName, eventProperties);
    console.log('[Segment] Tracked event:', eventName, eventProperties);
  };

  console.log('[CC360 Widget] Analytics module loaded');
})();

(function() {
  'use strict';

  window.CC360Widget = window.CC360Widget || {};

  window.CC360Widget.createWidget = function() {
    const container = document.createElement('div');
    container.id = 'cc360-onboarding-widget';
    container.innerHTML = `
      <style>${window.CC360Widget.getWidgetStyles()}</style>
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
  };

  window.CC360Widget.renderChecklist = function(status) {
    const state = window.CC360Widget.state;
    const checklistContainer = document.getElementById('cc360-checklist');
    if (!checklistContainer) return;

    const allItems = [
      {
        key: 'accountCreated',
        title: 'Sign in to your Account',
        url: '#',
        completed: status.locationVerified,
        isStatic: true
      },
      {
        key: 'paymentIntegrated',
        title: 'Connect Payments',
        url: 'payments/integrations/?userpilot=ZXhwZXJpZW5jZTpmQXRoSHhaVDlt',
        completed: status.paymentIntegrated,
        featureFlag: 'connectPaymentsEnabled'
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
        completed: status.domainConnected,
        featureFlag: 'connectDomainEnabled'
      }
    ];

    const items = allItems.filter(item => {
      if (!item.featureFlag) return true;
      return state.featureFlags[item.featureFlag] !== false;
    });

    const completedCount = items.filter(item => item.completed).length;
    const progressPercent = (completedCount / items.length) * 100;
    
    const allCompleted = status.courseCreated && 
      (!state.featureFlags.connectPaymentsEnabled || status.paymentIntegrated) &&
      (!state.featureFlags.connectDomainEnabled || status.domainConnected);
    if (allCompleted && !state.hasShownCompletionDialog) {
      console.log('[CC360 Widget] All tasks completed! Showing completion dialog...');
      
      window.CC360Widget.trackSegmentEvent('Onboarding Completed', {
        completedSteps: [
          status.courseCreated && 'course_created',
          status.paymentIntegrated && 'payment_integrated',
          status.domainConnected && 'domain_connected'
        ].filter(Boolean),
        totalSteps: items.length,
        completedCount: completedCount
      });
      
      window.CC360Widget.showCompletionDialog();
      state.hasShownCompletionDialog = true;
    }

    const progressCountEl = document.getElementById('cc360-progress-count');
    const minimizedCountEl = document.getElementById('cc360-minimized-count');
    const minimizedTextEl = document.getElementById('cc360-minimized-text');
    const minimizedIconEl = document.getElementById('cc360-minimized-icon');
    const minimizedWidget = document.querySelector('.cc360-widget-minimized');
    
    if (progressCountEl) progressCountEl.textContent = `${completedCount}/${items.length}`;
    if (minimizedCountEl) minimizedCountEl.textContent = `${completedCount}/${items.length}`;
    
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
        minimizedTextEl.textContent = 'Onboarding In Progress';
        minimizedIconEl.textContent = '⚡';
        if (minimizedWidget) minimizedWidget.classList.remove('complete');
      }
    }
    
    const progressBarEl = document.getElementById('cc360-progress-bar');
    if (progressBarEl) progressBarEl.style.width = `${progressPercent}%`;

    let foundFirstIncomplete = false;
    const itemsWithState = items.map(item => {
      let isDisabled = false;
      
      if (item.completed) {
        isDisabled = false;
      } else {
        if (foundFirstIncomplete) {
          isDisabled = true;
        } else {
          foundFirstIncomplete = true;
          isDisabled = false;
        }
      }
      
      return { ...item, isDisabled };
    });
    
    checklistContainer.innerHTML = itemsWithState.map(item => {
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
      
      return `
        <a 
          href="${window.CC360Widget.buildDashboardUrl(item.url)}" 
          class="cc360-checklist-item ${item.completed ? 'completed' : ''} ${item.isDisabled ? 'disabled' : ''}"
          target="_blank"
          data-step-id="${item.key}"
          data-step-title="${item.title}"
          data-step-completed="${item.completed}"
        >
          <div class="cc360-checkbox"></div>
          <div class="cc360-checklist-content">
            <div class="cc360-checklist-title">${item.title}</div>
          </div>
          ${item.isDisabled ? '<div class="cc360-lock-icon">🔒</div>' : '<div class="cc360-chevron-icon">›</div>'}
        </a>
      `;
    }).join('');
    
    const checklistLinks = checklistContainer.querySelectorAll('a.cc360-checklist-item');
    checklistLinks.forEach(link => {
      link.addEventListener('click', () => {
        const stepId = link.getAttribute('data-step-id');
        const stepTitle = link.getAttribute('data-step-title');
        const stepCompleted = link.getAttribute('data-step-completed') === 'true';
        
        window.CC360Widget.trackSegmentEvent('Onboarding Step Clicked', {
          stepId: stepId,
          stepTitle: stepTitle,
          stepCompleted: stepCompleted,
          stepUrl: link.href
        });
      });
    });
  };

  window.CC360Widget.initChecklistAndAnalytics = function() {
    return window.CC360Widget.initializeChecklist().then(function() {
      window.CC360Widget.initUserpilot().catch(function() {});
      window.CC360Widget.initSegment().catch(function() {});
      window.CC360Widget.initProfitWell().catch(function() {});
    });
  };

  window.CC360Widget.showStartScreen = function() {
    const state = window.CC360Widget.state;
    if (!state.widgetElement) {
      state.widgetElement = document.createElement('div');
      state.widgetElement.id = 'cc360-onboarding-widget';
      document.body.appendChild(state.widgetElement);
    }

    state.widgetElement.innerHTML = `
      <style>${window.CC360Widget.getStartScreenStyles()}</style>
      <div class="cc360-start-screen">
        <div class="cc360-start-icon">🚀</div>
        <h3 class="cc360-start-title">Welcome to CourseCreator360!</h3>
        <p class="cc360-start-subtitle">
          Let's get you set up in just a few steps. Click below to begin your onboarding journey.
        </p>
        <button class="cc360-start-button" onclick="window.CC360Widget.startOnboarding()">
          Start Onboarding
        </button>
      </div>
    `;
  };

  window.CC360Widget.showCompletionDialog = function() {
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
    
    document.getElementById('cc360-dialog-ok').addEventListener('click', async () => {
      overlay.remove();
      
      console.log('[CC360 Widget] All tasks completed - dismissing widget permanently');
      await window.CC360Widget.dismissWidgetPermanently();
      
      const state = window.CC360Widget.state;
      if (state.currentStatus && !state.currentStatus.bookingCancelled) {
        await window.CC360Widget.checkAndShowBookingModal();
      }
    });
    
    overlay.addEventListener('click', async (e) => {
      if (e.target === overlay) {
        overlay.remove();
        
        console.log('[CC360 Widget] All tasks completed (overlay click) - dismissing widget permanently');
        await window.CC360Widget.dismissWidgetPermanently();
        
        const state = window.CC360Widget.state;
        if (state.currentStatus && !state.currentStatus.bookingCancelled) {
          await window.CC360Widget.checkAndShowBookingModal();
        }
      }
    });
  };

  window.CC360Widget.showDismissDialog = function() {
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
    
    document.getElementById('cc360-dialog-keep').addEventListener('click', () => {
      overlay.remove();
    });
    
    document.getElementById('cc360-dialog-discard').addEventListener('click', () => {
      overlay.remove();
      window.CC360Widget.dismissWidgetPermanently();
    });
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });
  };

  window.CC360Widget.showBookingCancelDialog = function(bookingOverlay) {
    const state = window.CC360Widget.state;
    const confirmOverlay = document.createElement('div');
    confirmOverlay.className = 'cc360-dialog-overlay cc360-dialog-overlay--high';
    
    const dialogContent = document.createElement('div');
    dialogContent.className = 'cc360-dialog cc360-dialog--wide';
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.className = 'cc360-dialog-close';
    dialogContent.innerHTML = `
      <h3 class="cc360-dialog-title">Remove Booking Reminder?</h3>
      <p class="cc360-dialog-message">
        Are you sure you want to remove the booking reminder? You won't see it again, but you can always book a call later from your dashboard.
      </p>
      <div class="cc360-dialog-buttons">
        <button id="cc360-booking-cancel-dismiss" class="cc360-dialog-btn cc360-dialog-btn-secondary">Dismiss</button>
        <button id="cc360-booking-cancel-remove" class="cc360-dialog-btn cc360-dialog-btn-danger">Remove Forever</button>
      </div>
    `;
    
    closeBtn.onclick = () => {
      confirmOverlay.remove();
      bookingOverlay.remove();
      console.log('[CC360 Widget] Booking modal dismissed (X button) - showing widget (will show again on refresh)');
      window.CC360Widget.initChecklistAndAnalytics();
    };
    
    dialogContent.appendChild(closeBtn);
    confirmOverlay.appendChild(dialogContent);
    document.body.appendChild(confirmOverlay);
    
    document.getElementById('cc360-booking-cancel-dismiss').addEventListener('click', () => {
      confirmOverlay.remove();
      bookingOverlay.remove();
      window.CC360Widget.trackSegmentEvent('Booking Modal Dismissed', { 
        permanentRemoval: false,
        reason: 'temporary_dismiss'
      });
      console.log('[CC360 Widget] Booking modal dismissed - showing widget (will show again on refresh)');
      window.CC360Widget.initChecklistAndAnalytics();
    });
    
    document.getElementById('cc360-booking-cancel-remove').addEventListener('click', async () => {
      confirmOverlay.remove();
      bookingOverlay.remove();
      
      window.CC360Widget.trackSegmentEvent('Booking Cancelled', { 
        permanentRemoval: true,
        reason: 'user_requested'
      });
      
      try {
        console.log('[CC360 Widget] Cancelling booking permanently...');
        const response = await fetch(`${state.apiBase}/api/booking/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locationId: state.locationId })
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const updatedStatus = await response.json();
        console.log('[CC360 Widget] ✅ Booking cancelled permanently');
        
        state.currentStatus = updatedStatus;
        
        console.log('[CC360 Widget] Showing onboarding widget...');
        window.CC360Widget.initChecklistAndAnalytics();
      } catch (error) {
        console.error('[CC360 Widget] ❌ Error cancelling booking:', error);
        window.CC360Widget.initChecklistAndAnalytics();
      }
    });
    
    confirmOverlay.addEventListener('click', (e) => {
      if (e.target === confirmOverlay) {
        confirmOverlay.remove();
        bookingOverlay.remove();
        console.log('[CC360 Widget] Booking modal dismissed (overlay click) - showing widget (will show again on refresh)');
        window.CC360Widget.initChecklistAndAnalytics();
      }
    });
  };

  window.CC360Widget.checkAndShowBookingModal = async function() {
    const state = window.CC360Widget.state;
    try {
      console.log('[CC360 Widget] Checking if booking data exists...');
      const response = await fetch(`${state.apiBase}/api/booking/check?locationId=${state.locationId}`);
      
      if (!response.ok) {
        console.error('[CC360 Widget] ❌ Error checking booking data:', response.status);
        window.CC360Widget.showBookingModal();
        return;
      }
      
      const result = await response.json();
      console.log('[CC360 Widget] Booking check result:', result);
      
      if (!result.hasBookingData) {
        console.log('[CC360 Widget] ✅ No booking data found, showing booking modal');
        window.CC360Widget.showBookingModal();
      } else {
        console.log('[CC360 Widget] ⚠️ Booking data already exists, skipping booking modal');
      }
    } catch (error) {
      console.error('[CC360 Widget] ❌ Error checking booking data:', error);
      window.CC360Widget.showBookingModal();
    }
  };

  window.CC360Widget.showBookingModal = function() {
    const state = window.CC360Widget.state;
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
    
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 24px;
      text-align: center;
      border-bottom: 1px solid #e5e7eb;
      position: relative;
      z-index: 10;
    `;
    
    const logo = document.createElement('img');
    logo.src = 'https://cc360-pages.s3.us-west-2.amazonaws.com/course-creator-360-logo.webp';
    logo.alt = 'Course Creator 360';
    logo.style.cssText = 'height: 36px; width: auto; margin-bottom: 16px;';
    
    header.appendChild(logo);
    
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
    
    const calendarContent = document.createElement('div');
    calendarContent.id = 'cc360-booking-calendar';
    calendarContent.style.cssText = 'padding: 0; max-height: 700px; overflow-y: auto; display: none; position: relative;';
    
    scheduleBtn.onclick = () => {
      initialContent.style.display = 'none';
      calendarContent.style.display = 'block';
      header.style.display = 'none';
      window.CC360Widget.loadSlotPicker(calendarContent, bookingOverlay);
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
      console.log('[CC360 Widget] Maybe later button clicked - showing confirmation dialog');
      window.CC360Widget.showBookingCancelDialog(bookingOverlay);
    };
    
    initialContent.appendChild(scheduleBtn);
    initialContent.appendChild(skipBtn);
    
    bookingModal.appendChild(header);
    bookingModal.appendChild(initialContent);
    bookingModal.appendChild(calendarContent);
    
    bookingOverlay.appendChild(bookingModal);
    document.body.appendChild(bookingOverlay);
    
    bookingOverlay.addEventListener('click', (e) => {
      if (e.target === bookingOverlay) {
        window.CC360Widget.showBookingCancelDialog(bookingOverlay);
      }
    });
    
    console.log('[CC360 Widget] Booking modal opened');
  };

  // ---------------------------------------------------------------------------
  // Native slot-picker for booking (replaces the old iframe approach)
  // ---------------------------------------------------------------------------
  window.CC360Widget.loadSlotPicker = async function(container, bookingOverlay) {
    const state = window.CC360Widget.state;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    container.innerHTML = '';

    const backBtn = document.createElement('button');
    backBtn.innerHTML = '← Back';
    backBtn.style.cssText = 'position:sticky;top:0;left:0;background:#f3f4f6;border:none;padding:8px 16px;border-radius:6px;font-size:0.9rem;color:#374151;cursor:pointer;transition:all 0.2s;z-index:10;margin:16px;';
    backBtn.onmouseover = () => { backBtn.style.background = '#e5e7eb'; };
    backBtn.onmouseout = () => { backBtn.style.background = '#f3f4f6'; };
    backBtn.onclick = () => {
      container.style.display = 'none';
      const init = document.getElementById('cc360-booking-initial');
      const hdr = container.parentElement.querySelector('div[style*="border-bottom"]');
      if (init) init.style.display = 'block';
      if (hdr) hdr.style.display = 'block';
    };
    container.appendChild(backBtn);

    const wrap = document.createElement('div');
    wrap.style.cssText = 'padding:0 20px 20px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';
    container.appendChild(wrap);

    const ONBOARDING_CALENDAR_ID = 'k0yrAymNvet7hUvzBxTh';

    wrap.innerHTML = '<p style="text-align:center;color:#6b7280;padding:24px 0;">Loading available times...</p>';

    const today = new Date();
    const twoWeeksOut = new Date(today);
    twoWeeksOut.setDate(twoWeeksOut.getDate() + 14);
    const fmtDate = (d) => d.toISOString().split('T')[0];

    let selectedCalendarId = ONBOARDING_CALENDAR_ID;
    let selectedSlot = null;

    wrap.innerHTML = '';

    // Slots container
    const slotsWrap = document.createElement('div');
    slotsWrap.id = 'cc360-slots-wrap';
    wrap.appendChild(slotsWrap);

    // Confirmation area (hidden until slot selected)
    const confirmWrap = document.createElement('div');
    confirmWrap.id = 'cc360-confirm-wrap';
    confirmWrap.style.cssText = 'display:none;margin-top:16px;border-top:1px solid #e5e7eb;padding-top:16px;';
    wrap.appendChild(confirmWrap);

    async function loadSlots() {
      slotsWrap.innerHTML = '<p style="text-align:center;color:#6b7280;padding:16px 0;">Loading available times...</p>';
      confirmWrap.style.display = 'none';
      selectedSlot = null;

      try {
        const qs = new URLSearchParams({
          calendarId: selectedCalendarId,
          startDate: fmtDate(today),
          endDate: fmtDate(twoWeeksOut),
          timezone: tz
        });
        const resp = await fetch(`${state.apiBase}/api/booking/slots?${qs}`);
        const data = await resp.json();
        const slots = data.slots || data;
        renderSlots(slots);
      } catch (e) {
        console.error('[CC360 Widget] Failed to fetch slots:', e);
        slotsWrap.innerHTML = '<p style="text-align:center;color:#dc2626;padding:16px 0;">Failed to load times. Please try again.</p>';
      }
    }

    function renderSlots(slots) {
      slotsWrap.innerHTML = '';

      const slotsHeader = document.createElement('div');
      slotsHeader.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;';
      const slotsTitle = document.createElement('p');
      slotsTitle.textContent = 'Available Slots';
      slotsTitle.style.cssText = 'font-size:0.875rem;font-weight:500;color:#374151;';
      const refreshBtn = document.createElement('button');
      refreshBtn.textContent = 'Refresh';
      refreshBtn.style.cssText = 'background:transparent;border:none;font-size:0.75rem;color:#6b7280;cursor:pointer;padding:4px 8px;border-radius:6px;';
      refreshBtn.onmouseover = () => { refreshBtn.style.background = '#f3f4f6'; };
      refreshBtn.onmouseout = () => { refreshBtn.style.background = 'transparent'; };
      refreshBtn.onclick = loadSlots;
      slotsHeader.appendChild(slotsTitle);
      slotsHeader.appendChild(refreshBtn);
      slotsWrap.appendChild(slotsHeader);

      const dateKeys = Object.keys(slots).sort();
      if (!dateKeys.length) {
        const empty = document.createElement('p');
        empty.textContent = 'No available slots in this period.';
        empty.style.cssText = 'text-align:center;color:#9ca3af;font-size:0.875rem;padding:16px 0;';
        slotsWrap.appendChild(empty);
        return;
      }

      const scrollArea = document.createElement('div');
      scrollArea.style.cssText = 'max-height:320px;overflow-y:auto;padding-right:4px;';

      dateKeys.forEach(dateStr => {
        const timeslots = slots[dateStr];
        if (!timeslots || !timeslots.length) return;

        const dayBlock = document.createElement('div');
        dayBlock.style.cssText = 'margin-bottom:16px;';

        const dayLabel = document.createElement('p');
        const d = new Date(dateStr + 'T12:00:00');
        dayLabel.textContent = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        dayLabel.style.cssText = 'font-size:0.7rem;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;';
        dayBlock.appendChild(dayLabel);

        const grid = document.createElement('div');
        grid.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;';

        timeslots.forEach(isoStr => {
          const t = new Date(isoStr);
          const label = t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz });

          const btn = document.createElement('button');
          btn.type = 'button';
          btn.textContent = label;
          btn.dataset.slot = isoStr;
          btn.style.cssText = 'border-radius:6px;padding:6px 10px;font-size:0.75rem;font-weight:500;border:1px solid #e5e7eb;background:#fff;color:#374151;cursor:pointer;transition:all 0.15s;';
          btn.onmouseover = () => { if (selectedSlot !== isoStr) { btn.style.borderColor = '#818cf8'; btn.style.background = '#eef2ff'; } };
          btn.onmouseout = () => { if (selectedSlot !== isoStr) { btn.style.borderColor = '#e5e7eb'; btn.style.background = '#fff'; } };
          btn.onclick = () => {
            selectedSlot = isoStr;
            scrollArea.querySelectorAll('button[data-slot]').forEach(b => {
              b.style.borderColor = '#e5e7eb'; b.style.background = '#fff'; b.style.color = '#374151';
            });
            btn.style.borderColor = '#4f46e5';
            btn.style.background = '#4f46e5';
            btn.style.color = '#fff';
            showConfirm(isoStr);
          };
          grid.appendChild(btn);
        });

        dayBlock.appendChild(grid);
        scrollArea.appendChild(dayBlock);
      });

      slotsWrap.appendChild(scrollArea);
    }

    function showConfirm(slotIso) {
      const t = new Date(slotIso);
      const pretty = t.toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz });

      confirmWrap.style.display = 'block';
      confirmWrap.innerHTML = `
        <p style="font-size:0.875rem;font-weight:500;color:#111827;margin-bottom:8px;">Confirm Booking</p>
        <p style="font-size:0.8rem;color:#6b7280;margin-bottom:16px;">${pretty} (${tz})</p>
      `;

      const bookBtn = document.createElement('button');
      bookBtn.textContent = 'Book This Time';
      bookBtn.style.cssText = 'width:100%;padding:12px;font-size:0.95rem;font-weight:600;background:linear-gradient(135deg,#0E325E,#0475FF);color:#fff;border:none;border-radius:8px;cursor:pointer;transition:all 0.2s;box-shadow:0 4px 14px rgba(4,117,255,0.3);';
      bookBtn.onmouseover = () => { bookBtn.style.transform = 'translateY(-1px)'; bookBtn.style.boxShadow = '0 6px 18px rgba(4,117,255,0.4)'; };
      bookBtn.onmouseout = () => { bookBtn.style.transform = 'translateY(0)'; bookBtn.style.boxShadow = '0 4px 14px rgba(4,117,255,0.3)'; };
      bookBtn.onclick = () => bookAppointment(slotIso, bookBtn);
      confirmWrap.appendChild(bookBtn);
    }

    async function bookAppointment(slotIso, btn) {
      btn.disabled = true;
      btn.textContent = 'Booking...';
      btn.style.opacity = '0.7';

      try {
        const resp = await fetch(`${state.apiBase}/api/booking/book`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            calendarId: selectedCalendarId,
            selectedSlot: slotIso,
            selectedTimezone: tz,
            title: 'CC360 Onboarding Call',
            locationId: state.locationId
          })
        });

        if (!resp.ok) throw new Error(`API error: ${resp.status}`);

        const data = await resp.json();
        console.log('[CC360 Widget] ✅ Appointment booked:', data);

        window.CC360Widget.trackSegmentEvent('Booking Completed', {
          calendarId: selectedCalendarId,
          selectedSlot: slotIso,
          timezone: tz
        });

        confirmWrap.innerHTML = `
          <div style="text-align:center;padding:16px 0;">
            <div style="font-size:2.5rem;margin-bottom:12px;">🎉</div>
            <p style="font-size:1.1rem;font-weight:600;color:#111827;margin-bottom:8px;">You're all set!</p>
            <p style="font-size:0.875rem;color:#6b7280;">Your onboarding call has been booked. Check your email for confirmation details.</p>
          </div>
        `;

        setTimeout(() => {
          bookingOverlay.remove();
          window.CC360Widget.initChecklistAndAnalytics();
        }, 3000);
      } catch (e) {
        console.error('[CC360 Widget] ❌ Booking failed:', e);
        btn.disabled = false;
        btn.textContent = 'Book This Time';
        btn.style.opacity = '1';

        const err = document.createElement('p');
        err.textContent = 'Booking failed. Please try again.';
        err.style.cssText = 'color:#dc2626;font-size:0.8rem;margin-top:8px;text-align:center;';
        confirmWrap.appendChild(err);
        setTimeout(() => err.remove(), 4000);
      }
    }

    loadSlots();
  };

  window.CC360Widget.showSurveyModal = function() {
    const state = window.CC360Widget.state;
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
    
    const closeSurvey = () => {
      console.log('[CC360 Widget] Survey dismissed by user');
      if (surveyOverlay._escKeyHandler) {
        document.removeEventListener('keydown', surveyOverlay._escKeyHandler);
      }
      surveyOverlay.remove();
      window.CC360Widget.initChecklistAndAnalytics();
    };
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = `
      position: absolute;
      top: 12px;
      right: 12px;
      background: transparent;
      border: none;
      font-size: 28px;
      color: #9ca3af;
      cursor: pointer;
      width: 36px;
      height: 36px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      z-index: 99999;
      line-height: 1;
      padding: 0;
      pointer-events: auto;
    `;
    closeBtn.onmouseover = () => { closeBtn.style.background = '#f3f4f6'; closeBtn.style.color = '#374151'; };
    closeBtn.onmouseout = () => { closeBtn.style.background = 'transparent'; closeBtn.style.color = '#9ca3af'; };
    closeBtn.onclick = closeSurvey;
    
    surveyContainer.appendChild(closeBtn);
    
    const surveyContent = document.createElement('div');
    surveyContent.id = 'cc360-survey-root';
    surveyContainer.appendChild(surveyContent);
    
    surveyOverlay.appendChild(surveyContainer);
    document.body.appendChild(surveyOverlay);
    
    surveyOverlay.addEventListener('click', (e) => {
      if (e.target === surveyOverlay) {
        closeSurvey();
      }
    });
    
    const escKeyHandler = (e) => {
      if (e.key === 'Escape' && document.getElementById('cc360-survey-overlay')) {
        closeSurvey();
      }
    };
    document.addEventListener('keydown', escKeyHandler);
    
    surveyOverlay._escKeyHandler = escKeyHandler;
    
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
    
    Promise.all([
      window.React ? Promise.resolve() : loadScript('https://unpkg.com/react@18/umd/react.production.min.js'),
      window.ReactDOM ? Promise.resolve() : loadScript('https://unpkg.com/react-dom@18/umd/react-dom.production.min.js'),
      window.Babel ? Promise.resolve() : loadScript('https://unpkg.com/@babel/standalone/babel.min.js')
    ]).then(() => {
      renderSurvey();
    }).catch(err => {
      console.error('[CC360 Widget] Failed to load survey dependencies:', err);
      surveyContent.innerHTML = `
        <div style="text-align: center; padding: 40px;">
          <h2 style="color: #dc2626; margin-bottom: 16px;">Error Loading Survey</h2>
          <p style="color: #6b7280; margin-bottom: 24px;">Failed to load survey dependencies. Please refresh the page.</p>
          <button onclick="window.location.reload()" style="padding: 12px 24px; background: #0475FF; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">Refresh Page</button>
        </div>
      `;
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
        
        const handleNext = async () => {
          if (step < totalSteps - 1) {
            setStep(step + 1);
          } else {
            setSubmitted(true);
            console.log("Survey submitted with data:", formData);
            
            try {
              console.log('[CC360 Widget] Submitting survey to API...');
              const response = await fetch(`${state.apiBase}/api/survey/complete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  locationId: state.locationId,
                  surveyResponses: {
                    reason: formData.reason,
                    profession: formData.profession,
                    hasDomain: formData.hasDomain,
                    domain: formData.domain || '',
                    courseIdea: formData.courseIdea || '',
                    completedAt: new Date().toISOString()
                  }
                })
              });
              
              if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
              }
              
              const updatedStatus = await response.json();
              console.log('[CC360 Widget] ✅ Survey completed and saved to database');
              
              state.currentStatus = updatedStatus;
              
              if (window.userpilot) {
                try {
                  console.log('[Userpilot] 📊 Tracking event: survey_completed');
                  window.userpilot.track('survey_completed', {
                    location_id: state.locationId,
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
              }
              
              window.CC360Widget.trackSegmentEvent('Survey Completed', {
                reason: formData.reason,
                profession: formData.profession,
                has_domain: formData.hasDomain,
                domain: formData.domain || '',
                course_idea: formData.courseIdea || '',
                completed_at: new Date().toISOString()
              });
              
              setTimeout(() => {
                if (surveyOverlay._escKeyHandler) {
                  document.removeEventListener('keydown', surveyOverlay._escKeyHandler);
                }
                surveyOverlay.remove();
                
                console.log('[CC360 Widget] Survey completed - showing widget checklist');
                window.CC360Widget.initChecklistAndAnalytics();
              }, 2000);
            } catch (error) {
              console.error('[CC360 Widget] ❌ Error submitting survey:', error);
              setSubmitted(false);
              alert('Failed to submit survey. Please try again. If the problem persists, refresh the page.');
            }
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
              return formData.courseIdea.trim().length < 10;
            default:
              return false;
          }
        };
        
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
        
        const renderStep = () => {
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
                React.createElement('p', { style: { ...styles.counter, color: formData.courseIdea.trim().length < 10 ? '#ef4444' : '#9ca3af' } }, 
                  formData.courseIdea.trim().length < 10 
                    ? `${10 - formData.courseIdea.trim().length} more characters needed (minimum 10)` 
                    : `${formData.courseIdea.trim().length} characters`
                )
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
                  'Your onboarding checklist is loading...'
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
  };

  window.CC360Widget.showNotAuthorized = function(errorMessage) {
    const state = window.CC360Widget.state;
    state.widgetElement = document.createElement('div');
    state.widgetElement.id = 'cc360-onboarding-widget';
    state.widgetElement.classList.add('minimized', 'setup-required');
    document.body.appendChild(state.widgetElement);

    if (errorMessage) {
      console.error('[CC360 Widget] Setup error:', errorMessage);
    }

    state.widgetElement.innerHTML = `
      <style>
        #cc360-onboarding-widget.setup-required {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: auto;
          max-width: 340px;
          height: auto;
          min-height: 56px;
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05) inset;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          z-index: 99999;
          overflow: hidden;
          cursor: default;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(12px);
        }
        #cc360-onboarding-widget.setup-required:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08) inset;
          border-color: rgba(148, 163, 184, 0.3);
        }
        .cc360-setup-required-content {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 20px;
          color: white;
          position: relative;
        }
        .cc360-setup-icon {
          flex-shrink: 0;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
        }
        .cc360-setup-icon svg {
          width: 14px;
          height: 14px;
          color: white;
        }
        .cc360-setup-content-text {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .cc360-setup-title {
          font-size: 14px;
          font-weight: 600;
          color: #f1f5f9;
          line-height: 1.4;
          letter-spacing: -0.01em;
        }
        .cc360-setup-subtitle {
          font-size: 12px;
          font-weight: 400;
          color: #94a3b8;
          line-height: 1.3;
        }
      </style>
      <div class="cc360-setup-required-content">
        <div class="cc360-setup-icon">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C9.243 2 7 4.243 7 7v3H6c-1.103 0-2 .897-2 2v8c0 1.103.897 2 2 2h12c1.103 0 2-.897 2-2v-8c0-1.103-.897-2-2-2h-1V7c0-2.757-2.243-5-5-5zm3 8H9V7c0-1.654 1.346-3 3-3s3 1.346 3 3v3z" fill="currentColor"/>
          </svg>
        </div>
        <div class="cc360-setup-content-text">
          <div class="cc360-setup-title">Setup Required</div>
          <div class="cc360-setup-subtitle">Contact Admin to Enable</div>
        </div>
      </div>
    `;
  };

  window.CC360Widget.forceWidgetIntoView = function() {
    const widget = document.getElementById('cc360-onboarding-widget');
    if (!widget) return;
    
    const rect = widget.getBoundingClientRect();
    const margin = 24;
    let adjusted = false;
    
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
      const position = window.CC360Widget.getWidgetPosition();
      window.CC360Widget.saveWidgetPosition(position.isRight, parseInt(widget.style.bottom), widget.style.height);
    }
    
    return adjusted;
  };

  console.log('[CC360 Widget] UI module loaded');
})();

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
    const state = window.CC360Widget.state;
    if (state.eventSource) {
      state.eventSource.close();
    }
  });

  console.log('[CC360 Widget] Core module loaded');
})();
