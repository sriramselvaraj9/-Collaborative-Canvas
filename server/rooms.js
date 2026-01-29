/**
 * Room Manager - Handles user sessions in different drawing rooms
 * Each room is an isolated drawing session with its own users and canvas state
 */

class RoomManager {
    constructor() {
        // Map of roomId -> Map of userId -> userData
        this.rooms = new Map();
    }
    
    /**
     * Create a new room if it doesn't exist
     */
    createRoom(roomId) {
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, new Map());
            console.log(`Room created: ${roomId}`);
        }
        return this.rooms.get(roomId);
    }
    
    /**
     * Add user to a room
     */
    addUser(roomId, userData) {
        if (!this.rooms.has(roomId)) {
            this.createRoom(roomId);
        }
        
        const room = this.rooms.get(roomId);
        room.set(userData.id, userData);
        
        console.log(`User ${userData.username} joined room ${roomId}`);
        return room;
    }
    
    /**
     * Remove user from room
     */
    removeUser(roomId, userId) {
        if (!this.rooms.has(roomId)) return false;
        
        const room = this.rooms.get(roomId);
        const user = room.get(userId);
        
        if (user) {
            room.delete(userId);
            console.log(`User ${user.username} left room ${roomId}`);
            
            // Clean up empty rooms
            if (room.size === 0) {
                this.rooms.delete(roomId);
                console.log(`Room ${roomId} deleted (empty)`);
            }
            return true;
        }
        return false;
    }
    
    /**
     * Get all users in a room
     */
    getUsers(roomId) {
        if (!this.rooms.has(roomId)) {
            return [];
        }
        return Array.from(this.rooms.get(roomId).values());
    }
    
    /**
     * Get specific user from room
     */
    getUser(roomId, userId) {
        if (!this.rooms.has(roomId)) return null;
        return this.rooms.get(roomId).get(userId) || null;
    }
    
    /**
     * Update user data in room
     */
    updateUser(roomId, userId, updates) {
        if (!this.rooms.has(roomId)) return false;
        
        const room = this.rooms.get(roomId);
        const user = room.get(userId);
        
        if (user) {
            const updated = { ...user, ...updates };
            room.set(userId, updated);
            return true;
        }
        return false;
    }
    
    /**
     * Get count of users in room
     */
    getUserCount(roomId) {
        if (!this.rooms.has(roomId)) return 0;
        return this.rooms.get(roomId).size;
    }
    
    /**
     * Check if room exists
     */
    roomExists(roomId) {
        return this.rooms.has(roomId);
    }
    
    /**
     * Get all room IDs
     */
    getAllRooms() {
        return Array.from(this.rooms.keys());
    }
}

module.exports = RoomManager;
