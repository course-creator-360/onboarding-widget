(function() {
  'use strict';

  window.CC360Widget = window.CC360Widget || {};

  window.CC360Widget.initUserpilot = async function() {
    const state = window.CC360Widget.state;
    if (!state.userpilotToken) {
      console.log('[Userpilot] ⏭️ Skipping - no token available');
      return;
    }
    
    if (!state.locationId) {
      console.log('[Userpilot] ⏭️ Skipping - no location ID');
      return;
    }
    
    console.log('[Userpilot] 🚀 Initializing with token:', state.userpilotToken.substring(0, 8) + '...');
    
    try {
      if (typeof window.userpilot !== 'undefined') {
        console.log('[Userpilot] ✅ SDK already loaded');
      } else {
        console.log('[Userpilot] 📥 Loading SDK...');
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://js.userpilot.io/sdk/latest.js';
          script.async = true;
          script.onload = () => {
            console.log('[Userpilot] ✅ SDK loaded successfully');
            resolve();
          };
          script.onerror = (e) => {
            console.error('[Userpilot] ❌ SDK load failed:', e);
            reject(e);
          };
          document.head.appendChild(script);
        });
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (typeof window.userpilot === 'undefined') {
        console.error('[Userpilot] ❌ SDK not available after loading');
        return;
      }
      
      console.log('[Userpilot] 🔧 Calling userpilot.init()...');
      window.userpilot.init(state.userpilotToken);
      console.log('[Userpilot] ✅ init() called');
      
      let context = {};
      if (typeof window._GHL_CONTEXT !== 'undefined') {
        context = window._GHL_CONTEXT;
        console.log('[Userpilot] Using GHL context:', context);
      }
      
      const userData = {
        id: state.locationId,
        email: context.email || `${state.locationId}@placeholder.com`,
        name: context.name || state.locationId,
        company: context.companyId || state.locationId,
        location_id: state.locationId,
        onboarding_status: state.currentStatus?.allTasksCompleted ? 'completed' : 'active',
        domain_connected: state.currentStatus?.domainConnected || false,
        course_created: state.currentStatus?.courseCreated || false,
        payment_integrated: state.currentStatus?.paymentIntegrated || false
      };
      
      console.log('[Userpilot] 👤 Identifying user:', userData.id);
      console.log('[Userpilot] User data:', userData);
      
      window.userpilot.identify(userData.id, userData);
      console.log('[Userpilot] ✅ identify() called successfully');
      
    } catch (error) {
      console.error('[Userpilot] ❌ Failed to initialize:', error);
      console.error('[Userpilot] Error details:', error.message || error);
    }
  };

  window.CC360Widget.initSegment = async function() {
    const state = window.CC360Widget.state;
    if (!state.segmentWriteKey) {
      console.log('[Segment] ⏭️ Skipping - no write key available');
      return;
    }
    
    if (!state.locationId) {
      console.log('[Segment] ⏭️ Skipping - no location ID');
      return;
    }
    
    console.log('[Segment] 🚀 Initializing with write key:', state.segmentWriteKey.substring(0, 8) + '...');
    
    try {
      if (typeof window.analytics !== 'undefined' && window.analytics.initialized) {
        console.log('[Segment] ✅ Analytics already initialized');
      } else {
        console.log('[Segment] 📥 Loading Analytics.js...');
        
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
            console.log('[Segment] ✅ Analytics.js loading...');
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      let context = {};
      if (typeof window._GHL_CONTEXT !== 'undefined') {
        context = window._GHL_CONTEXT;
        console.log('[Segment] Using GHL context:', context);
      }
      
      const userTraits = {
        name: context.name,
        email: context.email,
        phone: context.phone,
        website: context.website,
        address: {
          city: context.city,
          state: context.state,
          country: context.country
        },
        company: {
          id: context.companyId,
          name: context.name
        },
        onboardingStatus: state.currentStatus?.allTasksCompleted ? 'completed' : 'active',
        domainConnected: state.currentStatus?.domainConnected || false,
        courseCreated: state.currentStatus?.courseCreated || false,
        paymentIntegrated: state.currentStatus?.paymentIntegrated || false,
        timezone: context.timezone
      };
      
      console.log('[Segment] 👤 Identifying user:', state.locationId);
      console.log('[Segment] User traits:', userTraits);
      
      if (window.analytics && typeof window.analytics.identify === 'function') {
        window.analytics.identify(state.locationId, userTraits);
        console.log('[Segment] ✅ Called analytics.identify()');
      }
      
      if (window.analytics && typeof window.analytics.group === 'function' && context.companyId) {
        const groupTraits = {
          name: context.name,
          website: context.website,
          address: {
            city: context.city,
            state: context.state,
            country: context.country
          },
          timezone: context.timezone
        };
        window.analytics.group(context.companyId, groupTraits);
        console.log('[Segment] ✅ Called analytics.group() with companyId:', context.companyId);
      }
      
      if (window.analytics && typeof window.analytics.page === 'function') {
        window.analytics.page('Onboarding Widget', {
          locationId: state.locationId,
          onboardingStatus: state.currentStatus?.allTasksCompleted ? 'completed' : 'active'
        });
        console.log('[Segment] ✅ Tracked page view');
      }
      
    } catch (error) {
      console.error('[Segment] ❌ Failed to initialize:', error);
      console.error('[Segment] Error details:', error.message || error);
    }
  };

  window.CC360Widget.trackSegmentEvent = function(eventName, properties = {}) {
    const state = window.CC360Widget.state;
    if (!window.analytics || typeof window.analytics.track !== 'function') {
      console.warn('[Segment] ⚠️ Analytics not available for tracking:', eventName);
      return;
    }
    
    const eventProperties = {
      location_id: state.locationId,
      ...properties
    };
    
    window.analytics.track(eventName, eventProperties);
    console.log('[Segment] 📊 Tracked event:', eventName, eventProperties);
  };

  console.log('[CC360 Widget] Analytics module loaded');
})();
