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
