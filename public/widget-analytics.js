(function() {
  'use strict';

  window.CC360Widget = window.CC360Widget || {};

  window.CC360Widget.initUserpilot = async function() {
    const state = window.CC360Widget.state;
    if (!state.userpilotToken || !state.locationId) return;

    try {
      if (typeof window.userpilot === 'undefined') {
        await new Promise(function(resolve, reject) {
          const script = document.createElement('script');
          script.src = 'https://js.userpilot.io/sdk/latest.js';
          script.async = true;
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
        await new Promise(function(resolve) { setTimeout(resolve, 100); });
      }

      if (typeof window.userpilot === 'undefined') return;

      window.userpilot.init(state.userpilotToken);

      const ghlUser = state.ghlUser || {};
      const customer = state.customer || {};

      const userData = {
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

      window.userpilot.identify(userData.id, userData);
    } catch (error) {
      console.error('[Userpilot] Init failed:', error.message);
    }
  };

  window.CC360Widget.initSegment = async function() {
    const state = window.CC360Widget.state;
    if (!state.segmentWriteKey || !state.locationId) return;

    try {
      if (typeof window.analytics !== 'undefined' && window.analytics.initialized) {
      } else {
        const analytics = window.analytics = window.analytics || [];
        if (!analytics.initialize) {
          if (analytics.invoked) {
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
          }
        }

        await new Promise(function(resolve) { setTimeout(resolve, 500); });
      }

      const ghlUser = state.ghlUser || {};
      const customer = state.customer || {};

      const userId = ghlUser.id || state.locationId;
      const userEmail = ghlUser.email || customer.email || '';
      const userName = ghlUser.name || customer.name || '';
      const firstName = ghlUser.firstName || '';
      const lastName = ghlUser.lastName || '';
      const userRole = ghlUser.role || '';
      const locationId = state.locationId;
      const customerName = customer.name || '';
      const subscriptionStatus = customer.subscriptionStatus || '';
      const customerCreatedAt = customer.createdAt || '';

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
      }

      if (window.analytics && typeof window.analytics.page === 'function') {
        window.analytics.page('Onboarding Widget', {
          locationId: locationId,
          onboardingStatus: state.currentStatus?.allTasksCompleted ? 'completed' : 'active'
        });
      }
    } catch (error) {
      console.error('[Segment] Init failed:', error.message);
    }
  };

  window.CC360Widget.initProfitWell = async function() {
    const state = window.CC360Widget.state;
    if (!state.profitWellAuthToken) return;

    const stripeCustomerId = state.customer && state.customer.stripeCustomerId;
    if (!stripeCustomerId) return;

    try {
      if (typeof window.profitwell === 'undefined') {
        await new Promise(function(resolve, reject) {
          const script = document.createElement('script');
          script.id = 'profitwell-js';
          script.src = 'https://public.profitwell.com/js/profitwell.js?auth=' + state.profitWellAuthToken;
          script.async = true;
          script.setAttribute('data-pw-auth', state.profitWellAuthToken);
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
        await new Promise(function(resolve) { setTimeout(resolve, 200); });
      }

      if (typeof window.profitwell === 'undefined') return;

      window.profitwell('start', { user_id: stripeCustomerId });
    } catch (error) {
      console.error('[ProfitWell] Init failed:', error.message);
    }
  };

  window.CC360Widget.trackSegmentEvent = function(eventName, properties) {
    const state = window.CC360Widget.state;
    if (!window.analytics || typeof window.analytics.track !== 'function') return;

    const eventProperties = Object.assign({ location_id: state.locationId }, properties || {});
    window.analytics.track(eventName, eventProperties);
  };

})();
