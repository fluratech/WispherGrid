/**
 * Signaling Manager
 * Handles cross-device signaling using copy-paste or QR codes
 * Works without centralized servers
 */

export class SignalingManager {
    constructor() {
        this.roomId = null;
        this.userId = null;
        this.pendingOffers = new Map(); // Store pending offers for copy-paste
        this.onSignalCallback = null;
    }

    /**
     * Initialize signaling for a room
     */
    initialize(roomId, userId, onSignal) {
        this.roomId = roomId;
        this.userId = userId;
        this.onSignalCallback = onSignal;

        // Try BroadcastChannel first (same-origin tabs)
        this.tryBroadcastChannel(roomId, userId, onSignal);
        
        // Also set up copy-paste signaling UI
        this.setupManualSignaling();
    }

    /**
     * Try BroadcastChannel for same-origin signaling
     */
    tryBroadcastChannel(roomId, userId, onSignal) {
        try {
            const channelName = `wisphergrid_${roomId}`;
            this.broadcastChannel = new BroadcastChannel(channelName);
            
            this.broadcastChannel.onmessage = (event) => {
                const { type, from, data } = event.data;
                if (from === userId) return;
                
                if (type === 'join' || type === 'offer' || type === 'answer' || type === 'ice-candidate') {
                    onSignal?.(from, type, data);
                }
            };

            // Announce presence
            this.broadcastChannel.postMessage({
                type: 'join',
                from: userId,
                data: { timestamp: Date.now() }
            });
        } catch (error) {
            console.log('BroadcastChannel not available');
        }
    }

    /**
     * Setup manual signaling UI (copy-paste)
     */
    setupManualSignaling() {
        // This will be called from UI manager to show signaling UI
    }

    /**
     * Send signal via BroadcastChannel if available
     */
    sendSignal(peerId, type, data) {
        if (this.broadcastChannel) {
            this.broadcastChannel.postMessage({
                type,
                from: this.userId,
                to: peerId,
                data
            });
            return true;
        }
        return false; // Need manual signaling
    }

    /**
     * Process manually pasted offer/answer
     */
    processManualSignal(signalData) {
        try {
            const parsed = JSON.parse(signalData);
            if (parsed.type && parsed.data) {
                this.onSignalCallback?.(parsed.peerId || 'manual', parsed.type, parsed.data);
                return true;
            }
        } catch (error) {
            console.error('Invalid signal data:', error);
        }
        return false;
    }

    /**
     * Generate signal for copy (offer/answer)
     */
    generateSignalForCopy(peerId, type, data) {
        return JSON.stringify({
            roomId: this.roomId,
            peerId: peerId || this.userId,
            type,
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Cleanup
     */
    cleanup() {
        if (this.broadcastChannel) {
            this.broadcastChannel.close();
            this.broadcastChannel = null;
        }
        this.pendingOffers.clear();
    }
}

