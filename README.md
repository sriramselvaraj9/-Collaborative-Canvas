# Collaborative Canvas

A real-time collaborative drawing application where multiple users can draw together on a shared canvas.

## 🌐 Live Demo

**https://collaborative-canvas-gvxg.onrender.com**

Open in two browser windows to test real-time collaboration!

## Features

- **Real-time Drawing**: See others draw as they draw, not after they finish
- **Multi-user Support**: Multiple users can draw simultaneously  
- **User Indicators**: See where other users' cursors are on the canvas
- **Drawing Tools**: Brush and eraser with customizable colors and stroke width
- **Undo/Redo**: Global undo/redo that works per-user without affecting others' work
- **Responsive Design**: Works on desktop and mobile devices
- **Touch Support**: Draw with touch on tablets and phones

## Tech Stack

- **Frontend**: Vanilla JavaScript with HTML5 Canvas API
- **Backend**: Node.js with Express
- **Real-time Communication**: Socket.io
- **Styling**: Pure CSS (no frameworks)

## Setup Instructions

### Prerequisites

- Node.js v18 or higher
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd collaborative-canvas
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Open your browser and navigate to:
```
http://localhost:3000
```

### Testing with Multiple Users

1. Open the application in two or more browser windows/tabs
2. Each window will automatically connect as a different user
3. Draw in one window and see it appear in real-time in other windows
4. Test the cursor tracking by moving your mouse in one window
5. Try the undo/redo functionality - it only affects your own strokes

## Project Structure

```
collaborative-canvas/
├── client/
│   ├── index.html           # Main HTML structure
│   ├── style.css            # All styles and responsive design
│   ├── canvas.js            # Canvas drawing logic and coordinate handling
│   ├── websocket.js         # Socket.io client wrapper
│   └── main.js              # Application initialization and UI controls
├── server/
│   ├── server.js            # Express + Socket.io server setup
│   ├── rooms.js             # Room management for user sessions
│   └── state-manager.js     # Drawing history and undo/redo logic
├── package.json
├── README.md
└── ARCHITECTURE.md
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| B | Select Brush tool |
| E | Select Eraser tool |
| Ctrl + Z | Undo last stroke |
| Ctrl + Y | Redo last undone stroke |
| Ctrl + Shift + Z | Redo (alternative) |

## Known Limitations

- Canvas state is not persisted to database (clears on server restart)
- No user authentication (anonymous users with random names)
- Large canvas with many strokes may experience performance issues
- Mobile toolbar requires improvement for better UX

## Time Spent

Approximately 4-5 hours including:
- Project setup and architecture planning: 30 min
- Server-side implementation: 1 hour
- Canvas drawing logic: 1.5 hours
- WebSocket integration: 1 hour
- UI/UX and styling: 1 hour
- Testing and bug fixes: 30 min

## Future Improvements

- Add room system for multiple isolated canvases
- Implement canvas persistence with database storage
- Add shape tools (rectangles, circles, lines)
- Text tool for adding annotations
- Export canvas as image
- Replay drawing history

## License

MIT License

## Deployment

### Option 1: Railway (Recommended for WebSockets)

1. Create account at [Railway](https://railway.app)
2. Connect your GitHub repository
3. Railway will auto-detect Node.js and deploy
4. Your app will be live at the provided URL

### Option 2: Render

1. Create account at [Render](https://render.com)
2. Create a new Web Service
3. Connect your GitHub repository
4. Set build command: `npm install`
5. Set start command: `npm start`
6. Deploy

### Option 3: Heroku

1. Install Heroku CLI
2. Run:
```bash
heroku create your-app-name
git push heroku main
```

### Option 4: Local Deployment

For local testing, just run:
```bash
npm install
npm start
```

Then open `http://localhost:3000` in multiple browser windows.
