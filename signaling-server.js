/**
 * Simple WebSocket Signaling Server for WispherGrid
 * Run with: node signaling-server.js
 * 
 * This server handles WebRTC signaling (offers, answers, ICE candidates)
 * between peers in the same room.
 */

const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

const rooms = new Map(); // roomId -> Set of connections

console.log(`WispherGrid Signaling Server running on port ${PORT}`);
console.log(`Connect to: ws://localhost:${PORT}`);

wss.on('connection', (ws, req) => {
    console.log('New client connected');
    
    let currentRoom = null;
    let userId = null;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            switch (data.type) {
                case 'join':
                    currentRoom = data.roomId;
                    userId = data.userId;
                    
                    // Add to room
                    if (!rooms.has(currentRoom)) {
                        rooms.set(currentRoom, new Set());
                    }
                    rooms.get(currentRoom).add(ws);
                    
                    console.log(`User ${userId} joined room ${currentRoom}`);
                    
                    // Store userId with connection for tracking
                    ws.userId = userId;
                    ws.username = data.username || 'Unknown';
                    
                    // Send list of existing peers to new joiner
                    const existingPeers = [];
                    rooms.get(currentRoom).forEach(peer => {
                        if (peer !== ws && peer.readyState === WebSocket.OPEN && peer.userId) {
                            existingPeers.push({
                                userId: peer.userId,
                                username: peer.username || 'Unknown'
                            });
                        }
                    });
                    
                    if (existingPeers.length > 0) {
                        ws.send(JSON.stringify({
                            type: 'existing-peers',
                            peers: existingPeers
                        }));
                    }
                    
                    // Broadcast join to other peers in room
                    broadcastToRoom(currentRoom, ws, {
                        type: 'peer-joined',
                        userId: userId,
                        username: data.username || 'Unknown'
                    });
                    break;
                    
                case 'signal':
                    // Forward signaling message (offer, answer, ice-candidate) to target peer
                    if (data.to && currentRoom) {
                        forwardToPeer(currentRoom, data.to, {
                            type: data.signalType,
                            from: userId,
                            data: data.data
                        });
                    }
                    break;
                    
                case 'broadcast-signal':
                    // Broadcast signal to all peers (for mesh networking)
                    if (currentRoom) {
                        broadcastToRoom(currentRoom, ws, {
                            type: data.signalType,
                            from: userId,
                            data: data.data
                        });
                    }
                    break;
                    
                case 'broadcast':
                    // Broadcast message to all peers in room
                    if (currentRoom) {
                        broadcastToRoom(currentRoom, ws, {
                            type: data.messageType,
                            from: userId,
                            data: data.data
                        });
                    }
                    break;
                    
                default:
                    console.warn('Unknown message type:', data.type);
            }
        } catch (error) {
            console.error('Error handling message:', error);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        
        if (currentRoom && rooms.has(currentRoom)) {
            rooms.get(currentRoom).delete(ws);
            
            // Broadcast leave
            broadcastToRoom(currentRoom, null, {
                type: 'peer-left',
                userId: userId
            });
            
            // Clean up empty rooms
            if (rooms.get(currentRoom).size === 0) {
                rooms.delete(currentRoom);
            }
        }
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

/**
 * Broadcast message to all peers in room except sender
 */
function broadcastToRoom(roomId, excludeWs, message) {
    const room = rooms.get(roomId);
    if (!room) return;
    
    room.forEach(ws => {
        if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    });
}

/**
 * Forward message to specific peer
 */
function forwardToPeer(roomId, targetUserId, message) {
    const room = rooms.get(roomId);
    if (!room) return;
    
    // Find target peer by userId
    let found = false;
    room.forEach(peer => {
        if (peer.userId === targetUserId && peer.readyState === WebSocket.OPEN) {
            peer.send(JSON.stringify(message));
            found = true;
        }
    });
    
    // If not found, broadcast (fallback for compatibility)
    if (!found) {
        broadcastToRoom(roomId, null, message);
    }
}

