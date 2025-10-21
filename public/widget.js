(function() {
  'use strict';

  // Get configuration from script tag
  const currentScript = document.currentScript || document.querySelector('script[src*="widget.js"]');
  const locationId = currentScript?.getAttribute('data-location');
  const apiBase = currentScript?.getAttribute('data-api') || 'http://localhost:4002';

  if (!locationId) {
    console.error('[CC360 Widget] Missing data-location attribute');
    return;
  }

  console.log('[CC360 Widget] Initializing for location:', locationId);

  // Widget state
  let currentStatus = null;
  let eventSource = null;
  let widgetElement = null;
  let isInstalled = false;
  let shouldShowWidget = true;
  let ghlAppBaseUrl = 'https://app.coursecreator360.com'; // Default, will be fetched from backend

  // Fetch configuration from backend
  async function fetchConfig() {
    try {
      const response = await fetch(`${apiBase}/api/config`);
      if (response.ok) {
        const config = await response.json();
        if (config.ghlAppBaseUrl) {
          ghlAppBaseUrl = config.ghlAppBaseUrl;
          console.log('[CC360 Widget] Using GHL base URL:', ghlAppBaseUrl);
        }
      }
    } catch (error) {
      console.warn('[CC360 Widget] Could not fetch config, using default GHL base URL:', error);
    }
  }

  // Dashboard URL builder
  function buildDashboardUrl(path) {
    return `${ghlAppBaseUrl}/v2/location/${locationId}/${path}`;
  }

  // Widget state
  let isMinimized = false;
  let isDragging = false;
  let isResizing = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let widgetStartX = 0;
  let widgetStartY = 0;
  let resizeStartY = 0;
  let widgetStartHeight = 0;
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
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
          z-index: 99999;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          user-select: none;
        }
        #cc360-onboarding-widget.dragging {
          transition: none;
          cursor: grabbing;
        }
        #cc360-onboarding-widget.resizing {
          transition: none;
        }
        #cc360-onboarding-widget.hidden {
          transform: translateY(120%);
        }
        #cc360-onboarding-widget.minimized {
          width: auto;
          max-width: 250px;
          height: 48px;
          min-height: 48px;
          border-radius: 24px;
          cursor: grab;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        }
        #cc360-onboarding-widget.minimized:active {
          cursor: grabbing;
        }
        #cc360-onboarding-widget.minimized:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
        }
        #cc360-onboarding-widget.minimized .cc360-widget-full {
          display: none;
        }
        #cc360-onboarding-widget.minimized .cc360-widget-minimized {
          display: flex !important;
        }
        .cc360-widget-minimized {
          display: none;
          align-items: center;
          justify-content: center;
          flex-direction: row;
          height: 48px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          gap: 10px;
          padding: 0 18px;
          text-align: center;
          border-radius: 24px;
          overflow: hidden;
        }
        .cc360-widget-minimized.complete {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        }
        .cc360-widget-minimized-icon {
          font-size: 20px;
          line-height: 1;
        }
        .cc360-widget-minimized-text {
          font-size: 12px;
          line-height: 1.3;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 150px;
        }
        .cc360-widget-minimized-count {
          font-size: 13px;
          font-weight: 700;
          background: rgba(255, 255, 255, 0.2);
          padding: 2px 8px;
          border-radius: 10px;
        }
        .cc360-widget-full {
          display: block;
        }
        .cc360-resize-handle {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 8px;
          cursor: ns-resize;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .cc360-resize-handle::after {
          content: '';
          width: 40px;
          height: 3px;
          background: rgba(0, 0, 0, 0.1);
          border-radius: 2px;
          transition: background 0.2s;
        }
        .cc360-resize-handle:hover::after {
          background: rgba(0, 0, 0, 0.2);
        }
        .cc360-widget-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 16px 18px;
          cursor: grab;
          position: relative;
        }
        .cc360-widget-header:active {
          cursor: grabbing;
        }
        .cc360-widget-title {
          font-size: 15px;
          font-weight: 600;
          margin: 0;
          letter-spacing: -0.2px;
        }
        .cc360-widget-footer {
          padding: 14px 18px;
          background: #f8f9fa;
          text-align: center;
        }
        .cc360-dismiss-btn {
          background: white;
          border: none;
          color: #495057;
          padding: 8px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s;
          width: 100%;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        .cc360-dismiss-btn:hover {
          background: #f8f9fa;
          transform: translateY(-1px);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
        }
        .cc360-widget-body {
          padding: 18px;
          overflow-y: auto;
          overflow-x: hidden;
          max-height: calc(90vh - 200px);
        }
        .cc360-checklist-item {
          display: flex;
          align-items: center;
          padding: 14px;
          margin-bottom: 8px;
          background: white;
          border-radius: 10px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          text-decoration: none;
          color: inherit;
          cursor: pointer;
          border: 1.5px solid #e9ecef;
        }
        .cc360-checklist-item:hover {
          border-color: #667eea;
          transform: translateX(3px);
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1);
        }
        .cc360-checklist-item.completed {
          background: #f8fdf9;
          border-color: #d4edda;
        }
        .cc360-checklist-item.completed:hover {
          border-color: #28a745;
        }
        .cc360-checkbox {
          width: 22px;
          height: 22px;
          border: 2px solid #cbd5e0;
          border-radius: 50%;
          margin-right: 12px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .cc360-checklist-item:hover .cc360-checkbox {
          border-color: #667eea;
        }
        .cc360-checklist-item.completed .cc360-checkbox {
          background: #10b981;
          border-color: #10b981;
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
        }
        .cc360-checklist-title {
          font-size: 14px;
          font-weight: 500;
          margin: 0;
          color: #1a202c;
        }
        .cc360-progress {
          margin-bottom: 16px;
          padding: 0;
        }
        .cc360-progress-text {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.9);
          margin-bottom: 8px;
          font-weight: 500;
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
          box-shadow: 0 0 8px rgba(255, 255, 255, 0.3);
        }
      </style>
      <div class="cc360-widget-minimized" id="cc360-widget-minimized">
        <div class="cc360-widget-minimized-icon" id="cc360-minimized-icon">🚀</div>
        <div class="cc360-widget-minimized-text" id="cc360-minimized-text">Start Onboarding!</div>
        <div class="cc360-widget-minimized-count" id="cc360-minimized-count">0/3</div>
      </div>
      <div class="cc360-widget-full">
        <div class="cc360-resize-handle" id="cc360-resize-handle"></div>
        <div class="cc360-widget-header" id="cc360-drag-handle">
          <div class="cc360-progress">
            <div class="cc360-progress-text"><span id="cc360-progress-count">0/3</span> tasks completed</div>
            <div class="cc360-progress-bar-bg">
              <div class="cc360-progress-bar" id="cc360-progress-bar" style="width: 0%"></div>
            </div>
          </div>
        </div>
        <div class="cc360-widget-body">
          <div id="cc360-checklist"></div>
        </div>
        <div class="cc360-widget-footer">
          <button class="cc360-dismiss-btn" onclick="window.cc360Widget.dismiss()">Minimize</button>
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
        key: 'paymentIntegrated',
        title: 'Connect Payments',
        url: 'payments/integrations/',
        completed: status.paymentIntegrated
      },
      {
        key: 'courseCreated',
        title: 'Create a Course',
        url: 'memberships/courses/products-v2',
        completed: status.courseCreated
      },
      {
        key: 'domainConnected',
        title: 'Connect a Domain',
        url: 'settings/domain',
        completed: status.domainConnected
      }
    ];

    const completedCount = items.filter(item => item.completed).length;
    const progressPercent = (completedCount / items.length) * 100;
    
    // Check if all tasks are completed - hide widget if so
    const allCompleted = status.domainConnected && status.courseCreated && status.paymentIntegrated;
    if (allCompleted) {
      console.log('[CC360 Widget] All tasks completed! Hiding widget...');
      if (widgetElement) {
        widgetElement.remove();
        widgetElement = null;
      }
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      return;
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
        minimizedTextEl.textContent = 'In Progress';
        minimizedIconEl.textContent = '⚡';
        if (minimizedWidget) minimizedWidget.classList.remove('complete');
      }
    }
    
    const progressBarEl = document.getElementById('cc360-progress-bar');
    if (progressBarEl) progressBarEl.style.width = `${progressPercent}%`;

    // Render items (minimal - no descriptions)
    checklistContainer.innerHTML = items.map(item => `
      <a 
        href="${buildDashboardUrl(item.url)}" 
        class="cc360-checklist-item ${item.completed ? 'completed' : ''}"
        target="_blank"
      >
        <div class="cc360-checkbox"></div>
        <div class="cc360-checklist-content">
          <div class="cc360-checklist-title">${item.title}</div>
        </div>
      </a>
    `).join('');
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
    const dragHandle = document.getElementById('cc360-drag-handle');
    const resizeHandle = document.getElementById('cc360-resize-handle');
    const minimizedWidget = document.querySelector('.cc360-widget-minimized');
    
    if (!widget) return;

    // Load saved position and height from localStorage
    restoreWidgetPosition();
    
    // Drag functionality for full widget header
    if (dragHandle) {
      dragHandle.addEventListener('mousedown', startDragging);
      dragHandle.addEventListener('touchstart', startDragging);
    }
    
    // Drag functionality for minimized widget
    if (minimizedWidget) {
      minimizedWidget.addEventListener('mousedown', startDraggingMinimized);
      minimizedWidget.addEventListener('touchstart', startDraggingMinimized);
    }
    
    // Resize functionality
    if (resizeHandle) {
      resizeHandle.addEventListener('mousedown', startResizing);
      resizeHandle.addEventListener('touchstart', startResizing);
    }
    
    function startDragging(e) {
      if (isMinimized) return; // Don't drag when minimized
      
      isDragging = true;
      hasDragged = false; // Reset drag flag
      widget.classList.add('dragging');
      
      const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
      const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
      
      dragStartX = clientX;
      dragStartY = clientY;
      
      const rect = widget.getBoundingClientRect();
      widgetStartX = rect.left;
      widgetStartY = rect.top;
      
      e.preventDefault();
    }
    
    function startDraggingMinimized(e) {
      // Only drag if minimized, don't expand on drag start
      if (!isMinimized) return;
      
      isDragging = true;
      hasDragged = false; // Reset drag flag
      widget.classList.add('dragging');
      
      const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
      const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
      
      dragStartX = clientX;
      dragStartY = clientY;
      
      const rect = widget.getBoundingClientRect();
      widgetStartX = rect.left;
      widgetStartY = rect.top;
      
      e.preventDefault();
      e.stopPropagation(); // Prevent the expand click event
    }
    
    function startResizing(e) {
      if (isMinimized) return;
      
      isResizing = true;
      widget.classList.add('resizing');
      
      const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
      resizeStartY = clientY;
      widgetStartHeight = widget.offsetHeight;
      
      e.preventDefault();
      e.stopPropagation();
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
          
          // Constrain Y position (keep fully visible)
          const minY = margin;
          const maxY = window.innerHeight - widgetHeight - margin;
          newY = Math.max(minY, Math.min(newY, maxY));
          
          // Temporarily position the widget while dragging
          widget.style.left = newX + 'px';
          widget.style.top = newY + 'px';
          widget.style.bottom = 'auto';
          widget.style.right = 'auto';
        }
      } else if (isResizing) {
        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
        const deltaY = clientY - resizeStartY;
        
        // Resize from top (decrease deltaY increases height)
        const newHeight = widgetStartHeight - deltaY;
        const minHeight = 200;
        const maxHeight = window.innerHeight * 0.9;
        
        // Constrain height
        if (newHeight >= minHeight && newHeight <= maxHeight) {
          widget.style.height = newHeight + 'px';
          
          // Adjust top position to keep bottom fixed while resizing
          const rect = widget.getBoundingClientRect();
          const currentBottom = window.innerHeight - rect.bottom;
          widget.style.top = (window.innerHeight - newHeight - currentBottom) + 'px';
        }
      }
    }
    
    function onMouseUp(e) {
      if (isDragging) {
        widget.classList.remove('dragging');
        
        // If user was in minimized mode and didn't drag, expand the widget
        if (isMinimized && !hasDragged) {
          console.log('[CC360 Widget] Click detected (not drag) - expanding in place');
          isDragging = false;
          hasDragged = false;
          // Don't reposition - just expand in place
          expandWidget();
          return;
        }
        
        // If in expanded mode and didn't drag, just ignore (was a click on header)
        if (!isMinimized && !hasDragged) {
          console.log('[CC360 Widget] Click detected on header (not drag) - no action');
          isDragging = false;
          hasDragged = false;
          return;
        }
        
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
          
          // Get current widget height (minimized = 48px, expanded = actual height)
          const widgetHeight = isMinimized ? 48 : widget.offsetHeight;
          const maxBottom = window.innerHeight - widgetHeight - margin;
          const minBottom = margin;
          
          // Constrain bottom position to keep widget fully visible
          bottomPos = Math.max(minBottom, Math.min(bottomPos, maxBottom));
          
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
        hasDragged = false;
      } else if (isResizing) {
        widget.classList.remove('resizing');
        
        // Save the new height
        const position = getWidgetPosition();
        saveWidgetPosition(position.isRight, position.bottom, widget.style.height);
        
        isResizing = false;
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
    try {
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
  async function fetchStatus() {
    try {
      const response = await fetch(`${apiBase}/api/status?locationId=${locationId}`);
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

  // Connect to SSE for real-time updates
  function connectSSE() {
    if (eventSource) {
      eventSource.close();
    }

    eventSource = new EventSource(`${apiBase}/api/events?locationId=${locationId}`);
    
    eventSource.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'status' && data.payload) {
          console.log('[CC360 Widget] Status update:', data.payload);
          currentStatus = data.payload;
          
          // Check if widget should still be shown
          shouldShowWidget = currentStatus.shouldShowWidget !== false;
          
          if (!shouldShowWidget) {
            console.log('[CC360 Widget] Widget should no longer be shown, removing...');
            if (widgetElement) {
              widgetElement.remove();
              widgetElement = null;
            }
            if (eventSource) {
              eventSource.close();
              eventSource = null;
            }
            return;
          }
          
          // Update checklist with new data
          renderChecklist(currentStatus);
          
          // If dismissed via API/webhook, minimize the widget
          if (currentStatus.dismissed && !isMinimized) {
            console.log('[CC360 Widget] Received dismissed status, minimizing widget');
            dismissWidget();
          }
        }
      } catch (error) {
        console.error('[CC360 Widget] Error parsing SSE data:', error);
      }
    });

    eventSource.addEventListener('ping', () => {
      console.log('[CC360 Widget] Heartbeat received');
    });

    eventSource.onerror = (error) => {
      console.error('[CC360 Widget] SSE error:', error);
      // Reconnect after 5 seconds
      setTimeout(() => {
        console.log('[CC360 Widget] Reconnecting SSE...');
        connectSSE();
      }, 5000);
    };
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
        }
        .cc360-start-subtitle {
          font-size: 14px;
          color: #6c757d;
          margin: 0 0 32px 0;
          line-height: 1.5;
        }
        .cc360-start-button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
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

  // Dismiss widget (minimizes it and marks as dismissed in database)
  async function dismissWidget() {
    if (!widgetElement) return;
    
    // Minimize the widget
    isMinimized = true;
    widgetElement.classList.add('minimized');
    
    // Save minimized state to localStorage
    try {
      localStorage.setItem('cc360_widget_minimized', 'true');
    } catch (e) {}
    
    // Mark as dismissed in database (optional - for analytics/tracking)
    try {
      await fetch(`${apiBase}/api/dismiss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId })
      });
    } catch (error) {
      console.error('[CC360 Widget] Error marking as dismissed:', error);
    }
    
    console.log('[CC360 Widget] Widget minimized and marked as dismissed');
  }
  
  // Expand widget from minimized state
  function expandWidget() {
    if (!widgetElement) return;
    
    isMinimized = false;
    widgetElement.classList.remove('minimized');
    
    // Use multiple checks to ensure accurate positioning after expansion
    const checkAndAdjustPosition = () => {
      const widget = document.getElementById('cc360-onboarding-widget');
      if (!widget) return;
      
      const rect = widget.getBoundingClientRect();
      const margin = 24;
      let adjusted = false;
      
      // Get current position
      const currentBottom = parseInt(widget.style.bottom) || margin;
      const widgetHeight = rect.height;
      
      // Calculate safe bounds
      const minBottom = margin;
      const maxBottom = window.innerHeight - widgetHeight - margin;
      
      // Determine the best position
      let newBottom = currentBottom;
      
      // If widget goes off bottom, move it up
      if (rect.bottom > window.innerHeight - margin) {
        const overflow = rect.bottom - (window.innerHeight - margin);
        newBottom = currentBottom + overflow;
        adjusted = true;
        console.log('[CC360 Widget] Adjusted up by', overflow, 'px - was going off bottom');
      }
      
      // If widget goes off top, move it down  
      if (rect.top < margin) {
        const overflow = margin - rect.top;
        newBottom = currentBottom - overflow;
        adjusted = true;
        console.log('[CC360 Widget] Adjusted down by', overflow, 'px - was going off top');
      }
      
      // Apply final constraints
      newBottom = Math.max(minBottom, Math.min(newBottom, maxBottom));
      
      if (adjusted || newBottom !== currentBottom) {
        widget.style.bottom = newBottom + 'px';
        widget.style.top = 'auto';
        
        // Verify final position
        const finalRect = widget.getBoundingClientRect();
        console.log('[CC360 Widget] Final position:', {
          top: finalRect.top,
          bottom: finalRect.bottom,
          height: finalRect.height,
          bottomStyle: newBottom
        });
        
        // Save the adjusted position
        const position = getWidgetPosition();
        saveWidgetPosition(position.isRight, newBottom, widget.style.height);
      }
    };
    
    // Check immediately after expansion
    setTimeout(checkAndAdjustPosition, 50);
    
    // Double-check after render is complete (accounts for content loading)
    setTimeout(checkAndAdjustPosition, 150);
    
    // Final safety check to force widget into view if needed
    setTimeout(() => forceWidgetIntoView(), 200);
    
    // Save expanded state
    try {
      localStorage.setItem('cc360_widget_minimized', 'false');
    } catch (e) {}
    
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
    
    // Restore minimized state (from localStorage OR dismissed status)
    // If database says dismissed, start minimized
    if (currentStatus.dismissed) {
      console.log('[CC360 Widget] Widget was dismissed, showing in minimized state');
      isMinimized = true;
      widgetElement.classList.add('minimized');
      localStorage.setItem('cc360_widget_minimized', 'true');
    } else {
      // Otherwise check localStorage
      restoreMinimizedState();
    }
    
    // Safety check after initialization to ensure widget is visible
    setTimeout(() => forceWidgetIntoView(), 150);
    
    // Connect SSE for real-time updates
    connectSSE();
  }

  // Show not authorized message
  function showNotAuthorized(errorMessage) {
    widgetElement = document.createElement('div');
    widgetElement.id = 'cc360-onboarding-widget';
    document.body.appendChild(widgetElement);

    const message = errorMessage || 'Agency administrator needs to authorize this app. Please contact your agency admin.';
    const isExpired = errorMessage && errorMessage.includes('expired');

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
        }
        .cc360-not-authorized {
          padding: 40px;
          text-align: center;
        }
        .cc360-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }
        .cc360-title {
          font-size: 18px;
          font-weight: 600;
          color: #2c3e50;
          margin: 0 0 8px 0;
        }
        .cc360-message {
          font-size: 14px;
          color: #6c757d;
          margin: 0;
          line-height: 1.5;
        }
      </style>
      <div class="cc360-not-authorized">
        <div class="cc360-icon">${isExpired ? '⏰' : '🔒'}</div>
        <h3 class="cc360-title">${isExpired ? 'Authorization Expired' : 'Setup Required'}</h3>
        <p class="cc360-message">
          ${message}
        </p>
      </div>
    `;
  }

  // Initialize widget
  async function init() {
    console.log('[CC360 Widget] Initializing...');
    
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
    }
  }

  // Restore minimized state from localStorage
  function restoreMinimizedState() {
    try {
      const saved = localStorage.getItem('cc360_widget_minimized');
      if (saved === 'true') {
        isMinimized = true;
        if (widgetElement) {
          widgetElement.classList.add('minimized');
        }
      }
    } catch (e) {}
  }

  // Expose functions globally
  window.cc360Widget = {
    dismiss: dismissWidget,
    expand: expandWidget,
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
      console.log('  window.cc360Widget.resetPosition() - Reset widget position');
      console.log('  window.cc360Widget.forceIntoView() - Force widget into viewport');
      console.log('  window.cc360Widget.reload() - Reload widget');
      console.log('===========================');
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


