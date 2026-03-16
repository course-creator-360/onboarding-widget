(function() {
  'use strict';

  // Initialize CC360Widget namespace and state BEFORE loading modules
  // This ensures state object exists even if modules try to access it early
  window.CC360Widget = window.CC360Widget || {};
  window.CC360Widget.state = window.CC360Widget.state || {
    locationId: null,
    apiBase: '',
    ghlAppBaseUrl: 'https://app.gohighlevel.com',
    currentStatus: null,
    widgetElement: null,
    isMinimized: false,
    shouldShowWidget: true,
    pollInterval: null,
    hasShownCompletionDialog: false,
    userpilotToken: null,
    segmentWriteKey: null,
    customersApiConfigured: false,
    widgetLocationFilter: null,
    featureFlags: { connectPaymentsEnabled: true, connectDomainEnabled: true },
    skipApiChecks: false
  };

  // Calculate module base path and API base from current script location
  const currentScript = document.currentScript || document.querySelector('script[src*="widget.js"]');
  const scriptSrc = currentScript ? currentScript.src : '';
  // Use URL API for robust path handling across different embedding scenarios
  let scriptBasePath = '';
  let detectedApiBase = currentScript?.getAttribute('data-api') || '';
  
  if (scriptSrc) {
    try {
      const scriptUrl = new URL(scriptSrc);
      scriptBasePath = scriptUrl.href.substring(0, scriptUrl.href.lastIndexOf('/') + 1);
      // Auto-detect API base from script origin if not provided
      if (!detectedApiBase) {
        detectedApiBase = scriptUrl.origin;
      }
    } catch (e) {
      // Fallback for relative URLs
      scriptBasePath = scriptSrc.substring(0, scriptSrc.lastIndexOf('/') + 1);
    }
  }
  
  // Set API base in state before modules load
  window.CC360Widget.state.apiBase = detectedApiBase || 'http://localhost:4002';

  // Preconnect to API origin so DNS/TLS is warm before init fires
  if (detectedApiBase) {
    var link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = detectedApiBase;
    document.head.appendChild(link);
  }

  const moduleFiles = [
    'widget-styles.js',
    'widget-analytics.js',
    'widget-ui.js',
    'widget-core.js'
  ];

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function loadAllModules() {
    console.log('[CC360 Widget] Loading modules...');
    
    try {
      await loadScript(scriptBasePath + 'widget-bundle.js');
      console.log('[CC360 Widget] Bundle loaded (1 request)');
    } catch (e) {
      console.log('[CC360 Widget] Bundle not available, loading individual modules...');
      await Promise.all(moduleFiles.map(file => loadScript(scriptBasePath + file)));
      console.log('[CC360 Widget] All modules loaded (4 requests)');
    }
  }

  async function bootstrap() {
    try {
      await loadAllModules();

      window.cc360Widget = {
        init: window.CC360Widget.init,
        showDismissDialog: window.CC360Widget.showDismissDialog,
        minimizeWidget: window.CC360Widget.minimizeWidget,
        expandWidget: window.CC360Widget.expandWidget,
        dismissWidgetPermanently: window.CC360Widget.dismissWidgetPermanently,
        showSurveyModal: window.CC360Widget.showSurveyModal,
        showBookingModal: window.CC360Widget.showBookingModal,
        showCompletionDialog: window.CC360Widget.showCompletionDialog,
        startOnboarding: window.CC360Widget.startOnboarding,
        trackSegmentEvent: window.CC360Widget.trackSegmentEvent
      };

      console.log('[CC360 Widget] Bootstrap complete - starting initialization...');

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', window.CC360Widget.init);
      } else {
        window.CC360Widget.init();
      }
    } catch (error) {
      console.error('[CC360 Widget] Failed to bootstrap:', error);
    }
  }

  bootstrap();
})();
