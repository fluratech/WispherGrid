/**
 * WebSocket Signaling Manager
 * Handles cross-device signaling via WebSocket server
 */

export class WebSocketSignaling {
    constructor(wsUrl = null) {
        this.wsUrl = wsUrl || this.getDefaultSignalingUrl();
        this.ws = null;
        this.roomId = null;
        this.userId = null;
        this.username = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.onMessageCallback = null;
    }

    /**
     * Get username from session storage
     */
    getUsername() {
        return sessionStorage.getItem('wisphergrid_username') || 'User';
    }

    /**
     * Get default signaling URL (using public WebSocket server or local)
     */
    getDefaultSignalingUrl() {
        // Try to use wss://echo.websocket.org or a similar service
        // For production, you'd want your own signaling server
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        
        // Try local first, then fallback to public echo server
        // Note: echo.websocket.org doesn't support custom messages, so we need a real signaling server
        // For now, we'll use a free WebSocket test server or prompt for server URL
        return `${protocol}//${host.replace(/:\d+$/, '')}:8080`; // Default to port 8080
    }

    /**
     * Connect to signaling server
     */
    connect(roomId, userId, onMessage) {
        this.roomId = roomId;
        this.userId = userId;
        this.onMessageCallback = onMessage;

        // If no WebSocket URL provided, use BroadcastChannel fallback
        if (!this.wsUrl || this.wsUrl.includes('undefined')) {
            console.warn('No WebSocket server configured, using BroadcastChannel (same-device only)');
            return false; // Will use BroadcastChannel instead
        }

        try {
            this.ws = new WebSocket(this.wsUrl);

            this.ws.onopen = () => {
                console.log('WebSocket connected to signaling server');
                this.reconnectAttempts = 0;
                
                // Join room with username
                const username = this.getUsername();
                this.send({
                    type: 'join',
                    roomId: roomId,
                    userId: userId,
                    username: username
                });
            };

            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    
                    // Ignore own messages
                    if (message.from === this.userId) return;
                    
                    // Forward to callback
                    if (this.onMessageCallback) {
                        this.onMessageCallback(message);
                    }
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };

            this.ws.onclose = () => {
                console.log('WebSocket closed');
                this.attemptReconnect();
            };

            return true;
        } catch (error) {
            console.error('WebSocket connection failed:', error);
            return false;
        }
    }

    /**
     * Attempt to reconnect
     */
    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts && this.roomId) {
            this.reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
            
            console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`);
            setTimeout(() => {
                this.connect(this.roomId, this.userId, this.onMessageCallback);
            }, delay);
        }
    }

    /**
     * Send message via WebSocket
     */
    send(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                ...message,
                from: this.userId,
                roomId: this.roomId
            }));
            return true;
        }
        return false;
    }

    /**
     * Disconnect
     */
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.roomId = null;
        this.userId = null;
    }
}

