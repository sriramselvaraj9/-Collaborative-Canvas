/**
 * Canvas Drawing Module
 * Handles all canvas operations including drawing, coordinate mapping, and rendering
 */

class CanvasManager {
    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');
        
        // Drawing state
        this.isDrawing = false;
        this.lastX = 0;
        this.lastY = 0;
        this.currentPath = [];
        
        // Drawing settings
        this.strokeColor = '#000000';
        this.strokeWidth = 3;
        this.tool = 'brush'; // brush or eraser
        
        // Store other users' cursors
        this.remoteCursors = new Map();
        
        // Current stroke being drawn
        this.currentStroke = null;
        
        // Callback functions
        this.onDrawStep = null;
        this.onStrokeComplete = null;
        this.onCursorMove = null;
        
        this.setupCanvas();
        this.bindEvents();
    }
    
    /**
     * Setup canvas dimensions to match container
     */
    setupCanvas() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    /**
     * Resize canvas to fit container while maintaining quality
     */
    resizeCanvas() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        
        // Store current content
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        
        // Set canvas size
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        
        // Restore content
        this.ctx.putImageData(imageData, 0, 0);
        
        // Reset context settings after resize
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
    }
    
    /**
     * Get accurate canvas coordinates from mouse/touch event
     */
    getCanvasCoordinates(event) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        let clientX, clientY;
        
        // Handle touch events
        if (event.touches && event.touches.length > 0) {
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        } else {
            clientX = event.clientX;
            clientY = event.clientY;
        }
        
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }
    
    /**
     * Bind mouse and touch events for drawing
     */
    bindEvents() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        this.canvas.addEventListener('mouseup', () => this.stopDrawing());
        this.canvas.addEventListener('mouseout', () => this.stopDrawing());
        
        // Touch events for mobile support
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.startDrawing(e);
        });
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.draw(e);
        });
        this.canvas.addEventListener('touchend', () => this.stopDrawing());
        this.canvas.addEventListener('touchcancel', () => this.stopDrawing());
        
        // Track cursor position for other users
        this.canvas.addEventListener('mousemove', (e) => {
            const coords = this.getCanvasCoordinates(e);
            if (this.onCursorMove) {
                this.onCursorMove(coords);
            }
        });
    }
    
    /**
     * Start drawing operation
     */
    startDrawing(event) {
        this.isDrawing = true;
        const coords = this.getCanvasCoordinates(event);
        this.lastX = coords.x;
        this.lastY = coords.y;
        
        // Initialize current stroke
        this.currentPath = [{ x: coords.x, y: coords.y }];
        this.currentStroke = {
            points: this.currentPath,
            color: this.tool === 'eraser' ? '#ffffff' : this.strokeColor,
            width: this.tool === 'eraser' ? this.strokeWidth * 3 : this.strokeWidth,
            tool: this.tool
        };
    }
    
    /**
     * Draw on canvas as mouse moves
     */
    draw(event) {
        if (!this.isDrawing) return;
        
        const coords = this.getCanvasCoordinates(event);
        
        // Draw line segment
        this.drawLineSegment(
            this.lastX, this.lastY,
            coords.x, coords.y,
            this.currentStroke.color,
            this.currentStroke.width
        );
        
        // Add point to current path
        this.currentPath.push({ x: coords.x, y: coords.y });
        
        // Emit drawing step to server
        if (this.onDrawStep) {
            this.onDrawStep({
                start: { x: this.lastX, y: this.lastY },
                end: { x: coords.x, y: coords.y },
                color: this.currentStroke.color,
                width: this.currentStroke.width,
                tool: this.tool
            });
        }
        
        // Update last position
        this.lastX = coords.x;
        this.lastY = coords.y;
    }
    
    /**
     * Stop drawing and save stroke
     */
    stopDrawing() {
        if (!this.isDrawing) return;
        
        this.isDrawing = false;
        
        // Only save if we have a meaningful stroke
        if (this.currentPath.length > 1 && this.onStrokeComplete) {
            this.onStrokeComplete({
                points: [...this.currentPath],
                color: this.currentStroke.color,
                width: this.currentStroke.width,
                tool: this.currentStroke.tool
            });
        }
        
        // Reset current stroke
        this.currentPath = [];
        this.currentStroke = null;
    }
    
    /**
     * Draw a line segment on canvas
     */
    drawLineSegment(x1, y1, x2, y2, color, width) {
        this.ctx.beginPath();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = width;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
    }
    
    /**
     * Draw a complete stroke from points array
     */
    drawStroke(stroke) {
        if (!stroke.points || stroke.points.length < 2) return;
        
        this.ctx.beginPath();
        this.ctx.strokeStyle = stroke.color;
        this.ctx.lineWidth = stroke.width;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        this.ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        
        for (let i = 1; i < stroke.points.length; i++) {
            this.ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        
        this.ctx.stroke();
    }
    
    /**
     * Draw remote user's stroke segment
     */
    drawRemoteSegment(data) {
        this.drawLineSegment(
            data.start.x, data.start.y,
            data.end.x, data.end.y,
            data.color,
            data.width
        );
    }
    
    /**
     * Redraw all strokes - used after undo/redo
     */
    redrawAllStrokes(strokes) {
        this.clearCanvas();
        
        for (const stroke of strokes) {
            this.drawStroke(stroke);
        }
    }
    
    /**
     * Clear the entire canvas
     */
    clearCanvas() {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    /**
     * Update remote cursor position
     */
    updateRemoteCursor(userId, data) {
        this.remoteCursors.set(userId, {
            x: data.x,
            y: data.y,
            color: data.color,
            username: data.username
        });
    }
    
    /**
     * Remove remote cursor
     */
    removeRemoteCursor(userId) {
        this.remoteCursors.delete(userId);
    }
    
    /**
     * Get remote cursors for rendering
     */
    getRemoteCursors() {
        return Array.from(this.remoteCursors.entries());
    }
    
    /**
     * Set drawing color
     */
    setColor(color) {
        this.strokeColor = color;
    }
    
    /**
     * Set stroke width
     */
    setStrokeWidth(width) {
        this.strokeWidth = width;
    }
    
    /**
     * Set current tool
     */
    setTool(tool) {
        this.tool = tool;
    }
}

// Export for use in main.js
window.CanvasManager = CanvasManager;
