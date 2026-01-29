# Architecture Documentation

## Overview

This document describes the technical architecture of the Collaborative Canvas application, including data flow, WebSocket protocol, and key design decisions.

## System Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Browser A     │     │   Node.js       │     │   Browser B     │
│   (Client)      │◄───►│   Server        │◄───►│   (Client)      │
│                 │     │   (Socket.io)   │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  CanvasManager  │     │  StateManager   │     │  CanvasManager  │
│  WebSocketClient│     │  RoomManager    │     │  WebSocketClient│
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Data Flow Diagram

### Drawing Flow

```
User A draws          Server receives       Server broadcasts      User B receives
     │                      │                      │                     │
     ▼                      ▼                      ▼                     ▼
┌──────────┐          ┌──────────┐          ┌──────────┐          ┌──────────┐
│ Mouse    │          │ Parse    │          │ Emit to  │          │ Draw on  │
│ Event    │───────►  │ Event    │───────►  │ Room     │───────►  │ Canvas   │
└──────────┘          └──────────┘          └──────────┘          └──────────┘
     │                                             │
     ▼                                             ▼
┌──────────┐                               ┌──────────┐
│ Local    │                               │ Store in │
│ Draw     │                               │ History  │
└──────────┘                               └──────────┘
```

### Connection Flow

```
1. Client connects to server
2. Server assigns userId, username, color
3. Server sends existing canvas state (strokes array)
4. Server broadcasts 'user_joined' to other clients
5. Client renders existing strokes
6. Client starts drawing/receiving events
```

## WebSocket Protocol

### Events from Client to Server

| Event | Payload | Description |
|-------|---------|-------------|
| `drawing_step` | `{start, end, color, width, tool}` | Real-time drawing segment |
| `stroke_complete` | `{points[], color, width, tool}` | Complete stroke for history |
| `cursor_move` | `{x, y}` | Cursor position update |
| `undo` | - | Request to undo last user stroke |
| `redo` | - | Request to redo last undone stroke |
| `clear_canvas` | - | Request to clear entire canvas |

### Events from Server to Client

| Event | Payload | Description |
|-------|---------|-------------|
| `init` | `{userId, username, userColor, strokes[], users[]}` | Initial state |
| `user_joined` | `{id, username, color}` | New user notification |
| `user_left` | `{userId, username}` | User disconnect notification |
| `drawing_step` | `{start, end, color, width, userId}` | Remote drawing segment |
| `stroke_saved` | `{stroke, userId}` | Stroke added to history |
| `cursor_update` | `{userId, x, y, color, username}` | Remote cursor position |
| `undo_stroke` | `{strokeId, userId, allStrokes[]}` | Undo confirmation |
| `redo_stroke` | `{stroke, userId, allStrokes[]}` | Redo confirmation |
| `canvas_cleared` | `{userId, username}` | Canvas clear notification |

## Data Structures

### Stroke Object
```javascript
{
    id: "stroke_1706000000_1",     // Unique identifier
    userId: "socket_abc123",       // Creator's socket ID
    username: "HappyArtist42",     // Creator's display name
    points: [                      // Array of coordinates
        { x: 100, y: 150 },
        { x: 102, y: 153 },
        // ... more points
    ],
    color: "#e74c3c",              // Stroke color
    width: 5,                      // Stroke width in pixels
    tool: "brush",                 // Tool used (brush/eraser)
    timestamp: 1706000000000,      // Creation timestamp
    createdAt: 1706000000000       // Same as timestamp
}
```

### Drawing Step (Real-time)
```javascript
{
    start: { x: 100, y: 150 },     // Start point
    end: { x: 102, y: 153 },       // End point
    color: "#e74c3c",              // Stroke color
    width: 5,                      // Stroke width
    tool: "brush",                 // Tool type
    userId: "socket_abc123",       // Sender ID
    timestamp: 1706000000000       // Event time
}
```

## Undo/Redo Strategy

### Design Decision

The undo/redo system is designed to be **user-specific** - each user can only undo/redo their own strokes without affecting other users' work.

### How It Works

1. **Server-side History**: All strokes are stored in order on the server
2. **Per-user Redo Stack**: Each user has their own redo stack
3. **Undo Process**:
   - Find the last stroke by the requesting user (reverse search)
   - Remove it from main history
   - Add to user's redo stack
   - Broadcast new state to all clients
4. **Redo Process**:
   - Pop from user's redo stack
   - Add back to main history
   - Clear redo stack if user makes new stroke
   - Broadcast new state to all clients

### Conflict Resolution

```
Time    User A          User B          Server State
─────────────────────────────────────────────────────
T1      Draw stroke1    -               [A:stroke1]
T2      -               Draw stroke2    [A:stroke1, B:stroke2]
T3      Undo            -               [B:stroke2]
T4      -               Undo            []
T5      Redo            -               [A:stroke1]
```

**Key Point**: User A's undo removes only their stroke, leaving User B's stroke intact.

## Canvas Coordinate Handling

### Problem
CSS styling can scale the canvas differently from its internal resolution.

### Solution
```javascript
function getCanvasCoordinates(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY
    };
}
```

This ensures accurate drawing regardless of canvas CSS sizing.

## Performance Optimizations

### 1. Event Throttling
Cursor movement events are throttled to 50ms intervals to prevent network flooding:
```javascript
canvasManager.onCursorMove = throttle((coords) => {
    wsClient.emitCursorMove(coords.x, coords.y);
}, 50);
```

### 2. Path Batching
Instead of sending individual pixels, we send line segments (start→end points), reducing message frequency by ~10x.

### 3. Local Drawing First
Drawing appears immediately on the local canvas before network roundtrip, providing responsive feel:
```
User draws → Local render (0ms) → Send to server → Others receive (~50-100ms)
```

### 4. Efficient Redraw
For undo/redo, we redraw all strokes instead of trying to "remove" pixels:
```javascript
redrawAllStrokes(strokes) {
    this.clearCanvas();
    for (const stroke of strokes) {
        this.drawStroke(stroke);
    }
}
```

## Room Isolation

The `RoomManager` class handles multiple drawing sessions:

- Each room has its own set of users
- Each room has its own stroke history
- Users in Room A don't see Room B's drawings
- Rooms are automatically cleaned up when empty

Currently, the default room "main" is used for all users.

## Error Handling

### Network Disconnection
- Connection status indicator updates
- Local drawing continues to work
- Reconnection attempts automatic via Socket.io
- State sync on reconnection

### Invalid Events
- Server validates all incoming events
- Malformed events are logged and ignored
- No crash on invalid data

## Security Considerations

1. **No Authentication**: Current implementation uses anonymous users
2. **Input Validation**: Server validates event structure
3. **No Persistence**: Data is memory-only, lost on restart
4. **CORS**: Configured for development (should be restricted in production)

## Scaling Considerations

For scaling to 1000+ concurrent users:

1. **Redis Adapter**: Use Socket.io Redis adapter for multi-server
2. **Sharding by Room**: Distribute rooms across servers
3. **Event Compression**: Compress stroke data
4. **Canvas Snapshots**: Periodically save canvas images instead of all strokes
5. **Rate Limiting**: Prevent abuse with message rate limits
6. **CDN for Static Files**: Offload client files to CDN
