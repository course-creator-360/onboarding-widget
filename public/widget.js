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
    eventSource: null,
    pollInterval: null,
    sseConnected: false,
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

  const moduleFiles = [
    'widget-styles.js',
    'widget-analytics.js',
    'widget-ui.js',
    'widget-core.js'
  ];

  let loadedModules = 0;

  function loadModule(filename) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = scriptBasePath + filename;
      script.async = false;
      script.onload = () => {
        loadedModules++;
        console.log(`[CC360 Widget] Module loaded: ${filename} (${loadedModules}/${moduleFiles.length})`);
        resolve();
      };
      script.onerror = (err) => {
        console.error(`[CC360 Widget] Failed to load module: ${filename}`, err);
        reject(err);
      };
      document.head.appendChild(script);
    });
  }

  async function loadAllModules() {
    console.log('[CC360 Widget] Loading modules...');
    
    for (const file of moduleFiles) {
      await loadModule(file);
    }
    
    console.log('[CC360 Widget] All modules loaded successfully');
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
