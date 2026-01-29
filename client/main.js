/**
 * Main Application Entry Point
 * Initializes and connects all modules together
 */

// Global instances
let canvasManager = null;
let wsClient = null;
let users = new Map();
let strokeHistory = [];

// Throttle function for cursor updates
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

/**
 * Main initialization function
 */
function initializeApp() {
    // Get canvas element
    const canvas = document.getElementById('drawingCanvas');
    
    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }
    
    // Initialize canvas manager
    canvasManager = new CanvasManager(canvas);
    canvasManager.clearCanvas();
    
    // Initialize WebSocket client
    wsClient = new WebSocketClient();
    
    // Setup canvas callbacks
    setupCanvasCallbacks();
    
    // Setup WebSocket callbacks
    setupWebSocketCallbacks();
    
    // Setup UI controls
    setupUIControls();
    
    // Connect to server
    wsClient.connect();
    
    // Start cursor rendering loop
    startCursorRenderLoop();
    
    console.log('Application initialized');
}

/**
 * Setup canvas event callbacks
 */
function setupCanvasCallbacks() {
    // When user draws, send to server
    canvasManager.onDrawStep = (data) => {
        wsClient.emitDrawingStep(data);
    };
    
    // When stroke is complete, save to server
    canvasManager.onStrokeComplete = (data) => {
        wsClient.emitStrokeComplete(data);
    };
    
    // Throttled cursor movement
    canvasManager.onCursorMove = throttle((coords) => {
        wsClient.emitCursorMove(coords.x, coords.y);
    }, 50); // Send cursor updates every 50ms max
}

/**
 * Setup WebSocket event callbacks
 */
function setupWebSocketCallbacks() {
    // Connection established
    wsClient.on('connect', () => {
        updateConnectionStatus(true);
        showNotification('Connected to server');
    });
    
    // Connection lost
    wsClient.on('disconnect', () => {
        updateConnectionStatus(false);
        showNotification('Disconnected - attempting to reconnect...');
    });
    
    // Reconnecting
    wsClient.on('reconnecting', (attemptNumber) => {
        updateConnectionStatus(false, `Reconnecting (${attemptNumber})...`);
    });
    
    // Reconnection failed
    wsClient.on('reconnectFailed', () => {
        updateConnectionStatus(false, 'Connection failed');
        showNotification('Could not reconnect to server. Please refresh the page.');
    });
    
    // Initial data received
    wsClient.on('init', (data) => {
        // Update user info display
        updateUserInfo(data.username, data.userColor);
        
        // Store existing users
        for (const user of data.users) {
            if (user.id !== data.userId) {
                users.set(user.id, user);
            }
        }
        updateUsersList();
        
        // Draw existing strokes
        strokeHistory = data.strokes || [];
        canvasManager.redrawAllStrokes(strokeHistory);
    });
    
    // New user joined
    wsClient.on('userJoined', (data) => {
        users.set(data.id, data);
        updateUsersList();
        showNotification(`${data.username} joined the canvas`);
    });
    
    // User left
    wsClient.on('userLeft', (data) => {
        users.delete(data.userId);
        canvasManager.removeRemoteCursor(data.userId);
        updateUsersList();
        showNotification(`${data.username} left the canvas`);
    });
    
    // Receive drawing from another user
    wsClient.on('drawingStep', (data) => {
        canvasManager.drawRemoteSegment(data);
    });
    
    // Cursor update from another user
    wsClient.on('cursorUpdate', (data) => {
        canvasManager.updateRemoteCursor(data.userId, data);
    });
    
    // Undo event
    wsClient.on('undoStroke', (data) => {
        strokeHistory = data.allStrokes || [];
        canvasManager.redrawAllStrokes(strokeHistory);
    });
    
    // Redo event
    wsClient.on('redoStroke', (data) => {
        strokeHistory = data.allStrokes || [];
        canvasManager.redrawAllStrokes(strokeHistory);
    });
    
    // Canvas cleared
    wsClient.on('canvasCleared', (data) => {
        strokeHistory = [];
        canvasManager.clearCanvas();
        showNotification(`${data.username} cleared the canvas`);
    });
}

/**
 * Setup UI control elements
 */
function setupUIControls() {
    // Color picker
    const colorPicker = document.getElementById('colorPicker');
    if (colorPicker) {
        colorPicker.addEventListener('input', (e) => {
            canvasManager.setColor(e.target.value);
            setActiveTool('brush');
        });
    }
    
    // Color preset buttons
    const colorPresets = document.querySelectorAll('.color-preset');
    colorPresets.forEach(preset => {
        preset.addEventListener('click', () => {
            const color = preset.dataset.color;
            canvasManager.setColor(color);
            if (colorPicker) colorPicker.value = color;
            setActiveTool('brush');
        });
    });
    
    // Stroke width slider
    const strokeSlider = document.getElementById('strokeWidth');
    const strokeValue = document.getElementById('strokeValue');
    if (strokeSlider) {
        strokeSlider.addEventListener('input', (e) => {
            const width = parseInt(e.target.value);
            canvasManager.setStrokeWidth(width);
            if (strokeValue) strokeValue.textContent = width + 'px';
        });
    }
    
    // Brush tool button
    const brushBtn = document.getElementById('brushTool');
    if (brushBtn) {
        brushBtn.addEventListener('click', () => {
            setActiveTool('brush');
        });
    }
    
    // Eraser tool button
    const eraserBtn = document.getElementById('eraserTool');
    if (eraserBtn) {
        eraserBtn.addEventListener('click', () => {
            setActiveTool('eraser');
        });
    }
    
    // Undo button
    const undoBtn = document.getElementById('undoBtn');
    if (undoBtn) {
        undoBtn.addEventListener('click', () => {
            wsClient.emitUndo();
        });
    }
    
    // Redo button
    const redoBtn = document.getElementById('redoBtn');
    if (redoBtn) {
        redoBtn.addEventListener('click', () => {
            wsClient.emitRedo();
        });
    }
    
    // Clear canvas button
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear the canvas? This action cannot be undone.')) {
                wsClient.emitClearCanvas();
            }
        });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl+Z for undo
        if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            wsClient.emitUndo();
        }
        
        // Ctrl+Shift+Z or Ctrl+Y for redo
        if ((e.ctrlKey && e.shiftKey && e.key === 'z') || (e.ctrlKey && e.key === 'y')) {
            e.preventDefault();
            wsClient.emitRedo();
        }
        
        // B for brush
        if (e.key === 'b' && !e.ctrlKey) {
            setActiveTool('brush');
        }
        
        // E for eraser
        if (e.key === 'e' && !e.ctrlKey) {
            setActiveTool('eraser');
        }
    });
}

/**
 * Set active drawing tool
 */
function setActiveTool(tool) {
    canvasManager.setTool(tool);
    
    // Update UI
    const brushBtn = document.getElementById('brushTool');
    const eraserBtn = document.getElementById('eraserTool');
    
    if (brushBtn && eraserBtn) {
        brushBtn.classList.toggle('active', tool === 'brush');
        eraserBtn.classList.toggle('active', tool === 'eraser');
    }
    
    // Update cursor style
    const canvas = document.getElementById('drawingCanvas');
    if (canvas) {
        canvas.style.cursor = tool === 'eraser' ? 'cell' : 'crosshair';
    }
}

/**
 * Update connection status indicator
 */
function updateConnectionStatus(connected, customMessage) {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    
    if (statusDot) {
        statusDot.className = 'status-dot ' + (connected ? 'connected' : 'disconnected');
    }
    
    if (statusText) {
        if (customMessage) {
            statusText.textContent = customMessage;
        } else {
            statusText.textContent = connected ? 'Connected' : 'Disconnected';
        }
    }
}

/**
 * Update user info display
 */
function updateUserInfo(username, color) {
    const usernameEl = document.getElementById('username');
    const userColorEl = document.getElementById('userColor');
    
    if (usernameEl) {
        usernameEl.textContent = username;
    }
    
    if (userColorEl) {
        userColorEl.style.backgroundColor = color;
    }
}

/**
 * Update the list of online users
 */
function updateUsersList() {
    const usersListEl = document.getElementById('usersList');
    if (!usersListEl) return;
    
    usersListEl.innerHTML = '';
    
    users.forEach((user, id) => {
        const userEl = document.createElement('div');
        userEl.className = 'user-item';
        userEl.innerHTML = `
            <span class="user-color" style="background-color: ${user.color}"></span>
            <span class="user-name">${user.username}</span>
        `;
        usersListEl.appendChild(userEl);
    });
}

/**
 * Show notification message
 */
function showNotification(message) {
    const container = document.getElementById('notifications');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    container.appendChild(notification);
    
    // Animate in
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

/**
 * Render remote cursors overlay
 */
function startCursorRenderLoop() {
    const cursorsContainer = document.getElementById('cursorsContainer');
    if (!cursorsContainer) return;
    
    function renderCursors() {
        cursorsContainer.innerHTML = '';
        
        const cursors = canvasManager.getRemoteCursors();
        
        for (const [userId, cursor] of cursors) {
            const cursorEl = document.createElement('div');
            cursorEl.className = 'remote-cursor';
            cursorEl.style.left = cursor.x + 'px';
            cursorEl.style.top = cursor.y + 'px';
            cursorEl.style.borderColor = cursor.color;
            
            const labelEl = document.createElement('span');
            labelEl.className = 'cursor-label';
            labelEl.style.backgroundColor = cursor.color;
            labelEl.textContent = cursor.username;
            
            cursorEl.appendChild(labelEl);
            cursorsContainer.appendChild(cursorEl);
        }
        
        requestAnimationFrame(renderCursors);
    }
    
    requestAnimationFrame(renderCursors);
}
