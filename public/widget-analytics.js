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
