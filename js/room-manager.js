/**
 * Room Manager
 * Handles room creation, peer discovery, and signaling using WebRTC data channels
 * Uses a simple signaling mechanism through shared room identifiers
 */

export class RoomManager {
    constructor() {
        this.roomId = null;
        this.userId = null;
        this.username = null;
        this.peers = new Set(); // Known peer IDs
        this.signalingConnections = new Map(); // peerId -> WebSocket-like connection
    }

    /**
     * Generate a unique room ID
     */
    static generateRoomId() {
        return Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15);
    }

    /**
     * Join a room - sets up room identifier
     */
    joinRoom(roomId, userId, username) {
        this.roomId = roomId;
        this.userId = userId;
        this.username = username;
        
        // Store room info in sessionStorage for reconnection
        sessionStorage.setItem('wisphergrid_room', roomId);
        sessionStorage.setItem('wisphergrid_user', userId);
        sessionStorage.setItem('wisphergrid_username', username);
    }

    /**
     * Leave the current room
     */
    leaveRoom() {
        this.roomId = null;
        this.userId = null;
        this.username = null;
        this.peers.clear();
        this.signalingConnections.forEach(conn => conn.close());
        this.signalingConnections.clear();
        
        sessionStorage.removeItem('wisphergrid_room');
        sessionStorage.removeItem('wisphergrid_user');
        sessionStorage.removeItem('wisphergrid_username');
    }

    /**
     * Get room info from sessionStorage
     */
    static getStoredRoomInfo() {
        return {
            roomId: sessionStorage.getItem('wisphergrid_room'),
            userId: sessionStorage.getItem('wisphergrid_user'),
            username: sessionStorage.getItem('wisphergrid_username')
        };
    }

    /**
     * Create a signaling connection for peer discovery
     * This is a simplified approach using BroadcastChannel API for same-origin peers
     * and WebRTC data channels for cross-origin connections
     */
    initializeSignaling(onPeerJoined, onPeerLeft, onSignal) {
        if (!this.roomId) throw new Error('No room joined');

        // Use BroadcastChannel for same-tab/window signaling (for demo purposes)
        // In production, you might use WebSocket or other signaling servers
        const channelName = `wisphergrid_${this.roomId}`;
        
        try {
            this.broadcastChannel = new BroadcastChannel(channelName);
            
            this.broadcastChannel.onmessage = (event) => {
                const { type, from, data } = event.data;
                
                if (from === this.userId) return; // Ignore own messages
                
                switch (type) {
                    case 'join':
                        this.handlePeerJoin(from, data, onPeerJoined);
                        break;
                    case 'leave':
                        this.handlePeerLeave(from, onPeerLeft);
                        break;
                    case 'offer':
                    case 'answer':
                    case 'ice-candidate':
                        onSignal?.(from, type, data);
                        break;
                    default:
                        console.warn('Unknown signaling message type:', type);
                }
            };

            // Announce presence
            this.broadcastChannel.postMessage({
                type: 'join',
                from: this.userId,
                data: {
                    username: this.username,
                    timestamp: Date.now()
                }
            });

            // Periodic presence ping
            this.presenceInterval = setInterval(() => {
                this.broadcastChannel.postMessage({
                    type: 'ping',
                    from: this.userId,
                    data: { timestamp: Date.now() }
                });
            }, 5000);

        } catch (error) {
            console.error('BroadcastChannel not supported, using fallback:', error);
            // Fallback: use URL hash for simple signaling
            this.useHashSignaling(onSignal);
        }
    }

    /**
     * Handle peer joining
     */
    handlePeerJoin(peerId, data, onPeerJoined) {
        if (!this.peers.has(peerId)) {
            this.peers.add(peerId);
            onPeerJoined?.(peerId, data);
            
            // Respond with our own join info
            setTimeout(() => {
                this.broadcastChannel.postMessage({
                    type: 'join',
                    from: this.userId,
                    data: {
                        username: this.username,
                        timestamp: Date.now()
                    }
                });
            }, 100);
        }
    }

    /**
     * Handle peer leaving
     */
    handlePeerLeave(peerId, onPeerLeft) {
        if (this.peers.has(peerId)) {
            this.peers.delete(peerId);
            onPeerLeft?.(peerId);
        }
    }

    /**
     * Send signaling message to peer
     */
    sendSignal(peerId, type, data) {
        if (this.broadcastChannel) {
            this.broadcastChannel.postMessage({
                type,
                from: this.userId,
                to: peerId,
                data
            });
        }
    }

    /**
     * Fallback signaling using URL hash (for same-page sharing)
     */
    useHashSignaling(onSignal) {
        // For cross-origin or when BroadcastChannel isn't available
        // We'll use a different approach - URL-based signaling
        console.log('Using URL-based signaling fallback');
        
        // Monitor URL hash for signaling messages
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.substring(1);
            if (hash) {
                try {
                    const message = JSON.parse(decodeURIComponent(hash));
                    if (message.from !== this.userId) {
                        onSignal?.(message.from, message.type, message.data);
                    }
                } catch (error) {
                    // Invalid hash, ignore
                }
            }
        });
    }

    /**
     * Cleanup signaling
     */
    cleanupSignaling() {
        if (this.broadcastChannel) {
            this.broadcastChannel.postMessage({
                type: 'leave',
                from: this.userId
            });
            this.broadcastChannel.close();
        }
        
        if (this.presenceInterval) {
            clearInterval(this.presenceInterval);
        }
        
        this.signalingConnections.forEach(conn => conn.close());
        this.signalingConnections.clear();
    }

    /**
     * Get room URL for sharing
     */
    getRoomUrl() {
        const baseUrl = window.location.origin + window.location.pathname;
        return `${baseUrl}#room/${this.roomId}`;
    }

    /**
     * Parse room from URL
     */
    static parseRoomFromUrl() {
        const hash = window.location.hash.substring(1);
        const match = hash.match(/^room\/(.+)$/);
        return match ? match[1] : null;
    }

    /**
     * Get current room info
     */
    getRoomInfo() {
        return {
            roomId: this.roomId,
            userId: this.userId,
            username: this.username,
            peerCount: this.peers.size
        };
    }
}

