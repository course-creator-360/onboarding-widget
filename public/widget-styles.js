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

  window.CC360Widget.getNotAuthorizedStyles = function() {
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
      .cc360-auth-screen {
        padding: 40px;
        text-align: center;
      }
      .cc360-auth-icon {
        font-size: 64px;
        margin-bottom: 20px;
      }
      .cc360-auth-title {
        font-size: 20px;
        font-weight: 600;
        color: #2c3e50;
        margin: 0 0 12px 0;
        font-family: 'Helvetica Now', 'Helvetica Neue', Helvetica, Arial, sans-serif;
      }
      .cc360-auth-subtitle {
        font-size: 14px;
        color: #6c757d;
        margin: 0;
        line-height: 1.5;
      }
      .cc360-auth-close {
        position: absolute;
        top: 12px;
        right: 12px;
        background: transparent;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #6c757d;
        padding: 4px 8px;
        line-height: 1;
      }
      .cc360-auth-close:hover {
        color: #343a40;
      }
    `;
  };

  console.log('[CC360 Widget] Styles module loaded');
})();
