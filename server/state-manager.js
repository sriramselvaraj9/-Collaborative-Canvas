/**
 * State Manager - Manages drawing history and undo/redo operations
 * Handles the global state synchronization across all clients
 */

class StateManager {
    constructor() {
        // Map of roomId -> array of strokes
        this.roomStrokes = new Map();
        
        // Map of roomId -> Map of userId -> redo stack
        this.redoStacks = new Map();
        
        // Counter for generating unique stroke IDs
        this.strokeIdCounter = 0;
    }
    
    /**
     * Generate unique stroke ID
     */
    generateStrokeId() {
        this.strokeIdCounter++;
        return `stroke_${Date.now()}_${this.strokeIdCounter}`;
    }
    
    /**
     * Initialize room if needed
     */
    initRoom(roomId) {
        if (!this.roomStrokes.has(roomId)) {
            this.roomStrokes.set(roomId, []);
            this.redoStacks.set(roomId, new Map());
        }
    }
    
    /**
     * Add a completed stroke to history
     */
    addStroke(roomId, strokeData) {
        this.initRoom(roomId);
        
        const stroke = {
            id: this.generateStrokeId(),
            ...strokeData,
            createdAt: Date.now()
        };
        
        this.roomStrokes.get(roomId).push(stroke);
        
        // Clear redo stack for this user when they make a new action
        const redoStack = this.redoStacks.get(roomId);
        if (redoStack.has(strokeData.userId)) {
            redoStack.set(strokeData.userId, []);
        }
        
        console.log(`Stroke added to room ${roomId} by user ${strokeData.userId}`);
        return stroke;
    }
    
    /**
     * Get all strokes for a room
     */
    getStrokes(roomId) {
        this.initRoom(roomId);
        return this.roomStrokes.get(roomId);
    }
    
    /**
     * Undo the last stroke made by a specific user
     * Returns the undone stroke or null if nothing to undo
     */
    undoStroke(roomId, userId) {
        this.initRoom(roomId);
        
        const strokes = this.roomStrokes.get(roomId);
        const redoStack = this.redoStacks.get(roomId);
        
        // Find the last stroke by this user (reverse search)
        for (let i = strokes.length - 1; i >= 0; i--) {
            if (strokes[i].userId === userId) {
                // Remove stroke from history
                const [undoneStroke] = strokes.splice(i, 1);
                
                // Add to redo stack for this user
                if (!redoStack.has(userId)) {
                    redoStack.set(userId, []);
                }
                redoStack.get(userId).push(undoneStroke);
                
                console.log(`Stroke undone in room ${roomId} by user ${userId}`);
                return undoneStroke;
            }
        }
        
        return null;
    }
    
    /**
     * Redo the last undone stroke for a specific user
     * Returns the redone stroke or null if nothing to redo
     */
    redoStroke(roomId, userId) {
        this.initRoom(roomId);
        
        const strokes = this.roomStrokes.get(roomId);
        const redoStack = this.redoStacks.get(roomId);
        
        if (!redoStack.has(userId) || redoStack.get(userId).length === 0) {
            return null;
        }
        
        // Get the last undone stroke
        const stroke = redoStack.get(userId).pop();
        
        // Add it back to the strokes
        strokes.push(stroke);
        
        console.log(`Stroke redone in room ${roomId} by user ${userId}`);
        return stroke;
    }
    
    /**
     * Clear all strokes in a room
     */
    clearStrokes(roomId) {
        this.initRoom(roomId);
        this.roomStrokes.set(roomId, []);
        this.redoStacks.set(roomId, new Map());
        console.log(`Canvas cleared in room ${roomId}`);
    }
    
    /**
     * Remove a specific stroke by ID
     */
    removeStroke(roomId, strokeId) {
        this.initRoom(roomId);
        
        const strokes = this.roomStrokes.get(roomId);
        const index = strokes.findIndex(s => s.id === strokeId);
        
        if (index !== -1) {
            strokes.splice(index, 1);
            return true;
        }
        return false;
    }
    
    /**
     * Get stroke count for a room
     */
    getStrokeCount(roomId) {
        this.initRoom(roomId);
        return this.roomStrokes.get(roomId).length;
    }
    
    /**
     * Clean up user's redo history when they disconnect
     */
    cleanupUserHistory(roomId, userId) {
        if (this.redoStacks.has(roomId)) {
            this.redoStacks.get(roomId).delete(userId);
        }
    }
    
    /**
     * Get strokes by a specific user
     */
    getUserStrokes(roomId, userId) {
        this.initRoom(roomId);
        return this.roomStrokes.get(roomId).filter(s => s.userId === userId);
    }
}

module.exports = StateManager;
