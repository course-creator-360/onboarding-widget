# Widget Drag & Resize Feature

## Overview
The onboarding widget now supports dragging and resizing functionality, making it more flexible and user-friendly.

## Features

### 1. Draggable Widget
- **Drag Handle**: Click and drag the widget header (the purple gradient section) to move the widget around
  - Works in **both expanded and minimized states**
  - In minimized state: drag the compact pill to reposition it
  - Click without dragging on minimized widget to expand it
- **Smart Snapping**: The widget automatically snaps to either the **left** or **right** side of the screen based on where you drop it
  - If you drop it closer to the left half of the screen, it snaps to the left side
  - If you drop it closer to the right half of the screen, it snaps to the right side
- **Viewport Boundaries**: The widget is constrained to stay within the viewport
  - Cannot be dragged off-screen (top, bottom boundaries enforced with 24px margin)
  - Horizontal constraint keeps at least 100px visible when dragging
  - Automatically adjusts position when expanding from minimized state if it would go off-screen
  - Repositions automatically on browser window resize to stay in bounds
- **Robust Click Detection**: Distinguishes between clicks and drags with 8px threshold
  - Uses Euclidean distance calculation for accurate movement detection
  - Widget doesn't move at all until drag threshold is exceeded
  - Prevents accidental repositioning on clicks
  - Click on minimized widget expands it in place without repositioning
  - Click on expanded header does nothing (only drags reposition)
- **Position Persistence**: The widget remembers its position (left/right and vertical placement) across page reloads using localStorage
  - Saved positions are validated on restore to ensure they're still within viewport bounds

### 2. Adjustable Height
- **Resize Handle**: A subtle handle at the top of the widget (visible on hover)
- **Drag to Resize**: Click and drag the resize handle up or down to adjust the widget height
- **Height Constraints**:
  - Minimum height: 200px
  - Maximum height: 90% of viewport height
- **Height Persistence**: The widget remembers its height across page reloads

### 3. Touch Support
- Full support for touch devices (mobile/tablet)
- Touch gestures work the same as mouse interactions

### 4. Visual Feedback
- **Drag State**: The cursor changes to "grabbing" while dragging
- **Smooth Animations**: Smooth transitions when snapping to sides
- **Resize Indicator**: The resize handle becomes more visible on hover
- **Minimized State**: Compact pill design (max-width 250px) with rounded corners, perfect for staying out of the way

## Usage

### For Users
1. **To Move the Widget**:
   - Click and hold the purple header
   - Drag to your desired position
   - Release to snap to the nearest side (left or right)

2. **To Resize the Widget**:
   - Hover over the top of the widget to see the resize handle
   - Click and drag the handle up (to increase height) or down (to decrease height)
   - Release to set the new height

3. **To Reset Position**:
   - Open browser console
   - Run: `window.cc360Widget.resetPosition()`

### For Developers

#### API Methods
```javascript
// Reset widget position to default (right side, 24px from bottom)
window.cc360Widget.resetPosition();

// Force widget into viewport (safety function if widget goes off-screen)
window.cc360Widget.forceIntoView();

// Dismiss (minimize) the widget
window.cc360Widget.dismiss();

// Expand the minimized widget
window.cc360Widget.expand();

// Reload the widget
window.cc360Widget.reload();
```

#### LocalStorage Keys
- `cc360_widget_position`: Stores position and height data
  ```json
  {
    "isRight": true,
    "bottom": 24,
    "height": "450px"
  }
  ```
- `cc360_widget_minimized`: Stores minimized state (`"true"` or `"false"`)

## Technical Details

### Implementation
- Pure vanilla JavaScript (no dependencies)
- Uses CSS transforms and positioning
- Event listeners for mouse and touch events
- LocalStorage for persistence
- Responsive to viewport changes

### Boundary Protection System
The widget uses a multi-layered approach to ensure it never goes off-screen:

1. **Real-time Constraints**: During drag, widget position is constrained within viewport bounds
2. **Post-Drag Validation**: After releasing drag, position is recalculated and constrained
3. **Expand Protection**: When expanding from minimized, multiple checks ensure widget fits
   - Initial check at 50ms
   - Secondary check at 150ms (after content loads)
   - Final safety check at 200ms
4. **Restore Validation**: Saved positions are validated against current viewport on load
   - Initial validation at 10ms
   - Secondary validation at 100ms
5. **Window Resize Handler**: Automatically repositions widget if window shrinks (debounced 100ms)
6. **Force Into View**: Safety function that can be called manually or automatically

### Edge Case Handling
- Widget dimensions checked after CSS rendering completes
- Multiple timeout checks to account for async content loading
- Comprehensive console logging for debugging:
  - `[CC360 Widget] Click detected (not drag) - expanding in place`
  - `[CC360 Widget] Drag detected - movement: Xpx`
  - `[CC360 Widget] Drag completed - repositioning and snapping to side`
  - `[CC360 Widget] Snapped to left/right side at bottom: Xpx`
  - Position adjustment messages with before/after values
- Automatic correction and re-saving of invalid positions

### CSS Classes
- `.dragging`: Applied during drag operation
- `.resizing`: Applied during resize operation
- `.minimized`: Applied when widget is minimized

### Performance
- Event listeners are properly managed
- Smooth 60fps animations using CSS transitions
- Minimal DOM manipulation during drag/resize

## Browser Compatibility
- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile browsers: ✅ Full support with touch events

## Future Enhancements
Potential improvements:
- [ ] Snap to corners (top-left, top-right, bottom-left, bottom-right)
- [ ] Remember vertical position as percentage for better responsive behavior
- [ ] Drag preview/ghost element
- [ ] Keyboard shortcuts for positioning
- [ ] Animation on snap

