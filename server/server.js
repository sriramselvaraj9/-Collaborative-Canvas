const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const RoomManager = require('./rooms');
const StateManager = require('./state-manager');

const app = express();
const server = http.createServer(app);

// Get allowed origins from environment or use defaults
const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ["http://localhost:3000", "http://127.0.0.1:3000"];

// Initialize Socket.io with CORS settings
const io = new Server(server, {
    cors: {
        origin: process.env.NODE_ENV === 'production' ? allowedOrigins : "*",
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling']
});

// Serve static files from client directory
app.use(express.static(path.join(__dirname, '../client')));

// Initialize managers
const roomManager = new RoomManager();
const stateManager = new StateManager();

// Generate random color for new users
function generateUserColor() {
    const colors = [
        '#e74c3c', '#3498db', '#2ecc71', '#9b59b6', 
        '#f39c12', '#1abc9c', '#e91e63', '#00bcd4',
        '#ff5722', '#795548', '#607d8b', '#8bc34a'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Generate random username
function generateUsername() {
    const adjectives = ['Happy', 'Swift', 'Clever', 'Brave', 'Calm', 'Eager', 'Gentle', 'Kind'];
    const nouns = ['Artist', 'Painter', 'Creator', 'Drawer', 'Designer', 'Maker'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 100);
    return `${adj}${noun}${num}`;
}

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    
    // Assign user properties
    const userData = {
        id: socket.id,
        username: generateUsername(),
        color: generateUserColor(),
        cursorX: 0,
        cursorY: 0,
        isDrawing: false
    };
    
    // Default room
    const defaultRoom = 'main';
    
    // Join room and store user
    socket.join(defaultRoom);
    roomManager.addUser(defaultRoom, userData);
    
    // Send current state to new user
    socket.emit('init', {
        userId: socket.id,
        username: userData.username,
        userColor: userData.color,
        strokes: stateManager.getStrokes(defaultRoom),
        users: roomManager.getUsers(defaultRoom)
    });
    
    // Notify others about new user
    socket.to(defaultRoom).emit('user_joined', userData);
    
    // Handle drawing events
    socket.on('drawing_step', (data) => {
        // Add user info to stroke data
        const strokeData = {
            ...data,
            userId: socket.id,
            timestamp: Date.now()
        };
        
        // Broadcast to other users in the room
        socket.to(defaultRoom).emit('drawing_step', strokeData);
    });
    
    // Handle stroke completion - save to history
    socket.on('stroke_complete', (data) => {
        const strokeData = {
            ...data,
            userId: socket.id,
            username: userData.username,
            timestamp: Date.now()
        };
        
        // Save stroke to state manager
        stateManager.addStroke(defaultRoom, strokeData);
        
        // Broadcast to all including sender for sync
        io.to(defaultRoom).emit('stroke_saved', strokeData);
    });
    
    // Handle cursor movement
    socket.on('cursor_move', (data) => {
        userData.cursorX = data.x;
        userData.cursorY = data.y;
        
        socket.to(defaultRoom).emit('cursor_update', {
            userId: socket.id,
            username: userData.username,
            color: userData.color,
            x: data.x,
            y: data.y
        });
    });
    
    // Handle undo request
    socket.on('undo', () => {
        const undoneStroke = stateManager.undoStroke(defaultRoom, socket.id);
        
        if (undoneStroke) {
            // Broadcast undo to all clients
            io.to(defaultRoom).emit('undo_stroke', {
                strokeId: undoneStroke.id,
                userId: socket.id,
                allStrokes: stateManager.getStrokes(defaultRoom)
            });
        }
    });
    
    // Handle redo request
    socket.on('redo', () => {
        const redoneStroke = stateManager.redoStroke(defaultRoom, socket.id);
        
        if (redoneStroke) {
            // Broadcast redo to all clients
            io.to(defaultRoom).emit('redo_stroke', {
                stroke: redoneStroke,
                userId: socket.id,
                allStrokes: stateManager.getStrokes(defaultRoom)
            });
        }
    });
    
    // Handle clear canvas request
    socket.on('clear_canvas', () => {
        stateManager.clearStrokes(defaultRoom);
        io.to(defaultRoom).emit('canvas_cleared', {
            userId: socket.id,
            username: userData.username
        });
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        roomManager.removeUser(defaultRoom, socket.id);
        stateManager.cleanupUserHistory(defaultRoom, socket.id);
        
        socket.to(defaultRoom).emit('user_left', {
            userId: socket.id,
            username: userData.username
        });
    });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
});
