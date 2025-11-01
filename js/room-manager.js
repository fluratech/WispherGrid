/**
 * Room Manager
 * Handles room creation, peer discovery, and signaling
 * Uses WebSocket for cross-device, BroadcastChannel as fallback
 */

import { WebSocketSignaling } from './signaling-websocket.js';

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
     * Tries WebSocket first (for cross-device), falls back to BroadcastChannel (same-origin)
     */
    initializeSignaling(onPeerJoined, onPeerLeft, onSignal) {
        if (!this.roomId) throw new Error('No room joined');

        // Try WebSocket signaling first (for cross-device support)
        const wsUrl = this.getSignalingServerUrl();
        this.wsSignaling = new WebSocketSignaling(wsUrl);
        
        const wsConnected = this.wsSignaling.connect(this.roomId, this.userId, (message) => {
            this.handleWebSocketMessage(message, onPeerJoined, onPeerLeft, onSignal);
        });

        if (wsConnected) {
            this.useWebSocket = true;
            console.log('Using WebSocket signaling (cross-device support)');
            return;
        }

        // Fallback to BroadcastChannel (same-origin only)
        console.log('WebSocket unavailable, using BroadcastChannel (same-device only)');
        this.useWebSocket = false;
        this.initializeBroadcastChannel(onPeerJoined, onPeerLeft, onSignal);
    }

    /**
     * Get signaling server URL
     */
    getSignalingServerUrl() {
        // Check for custom server URL in URL params or localStorage
        const urlParams = new URLSearchParams(window.location.search);
        const customUrl = urlParams.get('ws') || localStorage.getItem('wisphergrid_ws_url');
        
        if (customUrl) {
            return customUrl;
        }

        // For GitHub Pages: Return null (will use BroadcastChannel fallback)
        // User needs to deploy signaling server separately and set URL
        if (window.location.hostname.includes('github.io') || 
            window.location.hostname.includes('github.com')) {
            console.warn('GitHub Pages detected - signaling server needed for cross-device. Set ?ws=wss://your-server.com');
            return null; // Will fallback to BroadcastChannel
        }

        // Local development: try same host, port 8080
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname;
        return `${protocol}//${host}:8080`;
    }

    /**
     * Handle WebSocket messages
     */
    handleWebSocketMessage(message, onPeerJoined, onPeerLeft, onSignal) {
        const { type, from, data } = message;
        
        if (from === this.userId) return;
        
        switch (type) {
            case 'peer-joined':
                this.handlePeerJoin(from, data || {}, onPeerJoined);
                break;
            case 'peer-left':
                this.handlePeerLeave(from, onPeerLeft);
                break;
            case 'existing-peers':
                // Handle list of existing peers when joining
                if (data && data.peers && Array.isArray(data.peers)) {
                    data.peers.forEach(peer => {
                        if (peer.userId !== this.userId) {
                            this.handlePeerJoin(peer.userId, { username: peer.username }, onPeerJoined);
                        }
                    });
                }
                break;
            case 'offer':
            case 'answer':
            case 'ice-candidate':
                onSignal?.(from, type, data);
                break;
            default:
                break;
        }
    }

    /**
     * Initialize BroadcastChannel (fallback for same-origin)
     */
    initializeBroadcastChannel(onPeerJoined, onPeerLeft, onSignal) {
        const channelName = `wisphergrid_${this.roomId}`;
        
        try {
            this.broadcastChannel = new BroadcastChannel(channelName);
            
            this.broadcastChannel.onmessage = (event) => {
                const { type, from, data } = event.data;
                
                if (from === this.userId) return;
                
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
                    case 'ping':
                        break;
                    default:
                        break;
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
            console.error('BroadcastChannel not supported:', error);
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
        if (this.useWebSocket && this.wsSignaling) {
            // Send via WebSocket
            this.wsSignaling.send({
                type: 'signal',
                to: peerId,
                signalType: type,
                data: data
            });
        } else if (this.broadcastChannel) {
            // Send via BroadcastChannel
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
        if (this.wsSignaling) {
            this.wsSignaling.disconnect();
            this.wsSignaling = null;
        }
        
        if (this.broadcastChannel) {
            this.broadcastChannel.postMessage({
                type: 'leave',
                from: this.userId
            });
            this.broadcastChannel.close();
            this.broadcastChannel = null;
        }
        
        if (this.presenceInterval) {
            clearInterval(this.presenceInterval);
            this.presenceInterval = null;
        }
        
        this.useWebSocket = false;
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

