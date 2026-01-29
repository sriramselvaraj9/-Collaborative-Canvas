/**
 * WebSocket Client Module
 * Handles all real-time communication with the server
 */

class WebSocketClient {
    constructor() {
        this.socket = null;
        this.userId = null;
        this.username = null;
        this.userColor = null;
        this.connected = false;
        
        // Event callbacks
        this.callbacks = {
            onConnect: null,
            onDisconnect: null,
            onInit: null,
            onUserJoined: null,
            onUserLeft: null,
            onDrawingStep: null,
            onStrokeSaved: null,
            onCursorUpdate: null,
            onUndoStroke: null,
            onRedoStroke: null,
            onCanvasCleared: null
        };
    }
    
    /**
     * Connect to the WebSocket server
     */
    connect() {
        // Use Socket.io client
        this.socket = io();
        
        this.setupEventListeners();
    }
    
    /**
     * Setup all socket event listeners
     */
    setupEventListeners() {
        // Connection established
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.connected = true;
            if (this.callbacks.onConnect) {
                this.callbacks.onConnect();
            }
        });
        
        // Connection lost
        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.connected = false;
            if (this.callbacks.onDisconnect) {
                this.callbacks.onDisconnect();
            }
        });
        
        // Initial data from server
        this.socket.on('init', (data) => {
            this.userId = data.userId;
            this.username = data.username;
            this.userColor = data.userColor;
            
            console.log(`Initialized as ${this.username} with color ${this.userColor}`);
            
            if (this.callbacks.onInit) {
                this.callbacks.onInit(data);
            }
        });
        
        // New user joined
        this.socket.on('user_joined', (data) => {
            console.log(`User joined: ${data.username}`);
            if (this.callbacks.onUserJoined) {
                this.callbacks.onUserJoined(data);
            }
        });
        
        // User left
        this.socket.on('user_left', (data) => {
            console.log(`User left: ${data.username}`);
            if (this.callbacks.onUserLeft) {
                this.callbacks.onUserLeft(data);
            }
        });
        
        // Receive drawing step from another user
        this.socket.on('drawing_step', (data) => {
            if (this.callbacks.onDrawingStep) {
                this.callbacks.onDrawingStep(data);
            }
        });
        
        // Stroke saved confirmation
        this.socket.on('stroke_saved', (data) => {
            if (this.callbacks.onStrokeSaved) {
                this.callbacks.onStrokeSaved(data);
            }
        });
        
        // Cursor update from another user
        this.socket.on('cursor_update', (data) => {
            if (this.callbacks.onCursorUpdate) {
                this.callbacks.onCursorUpdate(data);
            }
        });
        
        // Undo stroke event
        this.socket.on('undo_stroke', (data) => {
            if (this.callbacks.onUndoStroke) {
                this.callbacks.onUndoStroke(data);
            }
        });
        
        // Redo stroke event
        this.socket.on('redo_stroke', (data) => {
            if (this.callbacks.onRedoStroke) {
                this.callbacks.onRedoStroke(data);
            }
        });
        
        // Canvas cleared event
        this.socket.on('canvas_cleared', (data) => {
            if (this.callbacks.onCanvasCleared) {
                this.callbacks.onCanvasCleared(data);
            }
        });
    }
    
    /**
     * Emit drawing step to server
     */
    emitDrawingStep(data) {
        if (!this.connected) return;
        this.socket.emit('drawing_step', data);
    }
    
    /**
     * Emit completed stroke to server
     */
    emitStrokeComplete(data) {
        if (!this.connected) return;
        this.socket.emit('stroke_complete', data);
    }
    
    /**
     * Emit cursor position to server
     */
    emitCursorMove(x, y) {
        if (!this.connected) return;
        this.socket.emit('cursor_move', { x, y });
    }
    
    /**
     * Request undo operation
     */
    emitUndo() {
        if (!this.connected) return;
        this.socket.emit('undo');
    }
    
    /**
     * Request redo operation
     */
    emitRedo() {
        if (!this.connected) return;
        this.socket.emit('redo');
    }
    
    /**
     * Request canvas clear
     */
    emitClearCanvas() {
        if (!this.connected) return;
        this.socket.emit('clear_canvas');
    }
    
    /**
     * Set callback function
     */
    on(event, callback) {
        if (this.callbacks.hasOwnProperty('on' + event.charAt(0).toUpperCase() + event.slice(1))) {
            this.callbacks['on' + event.charAt(0).toUpperCase() + event.slice(1)] = callback;
        }
    }
    
    /**
     * Check if connected
     */
    isConnected() {
        return this.connected;
    }
    
    /**
     * Get current user info
     */
    getUserInfo() {
        return {
            id: this.userId,
            username: this.username,
            color: this.userColor
        };
    }
}

// Export for use in main.js
window.WebSocketClient = WebSocketClient;
