/**
 * WispherGrid - Main Application
 * Orchestrates WebRTC connections, room management, and UI
 */

import { WebRTCManager } from './webrtc-manager.js';
import { RoomManager } from './room-manager.js';
import { UIManager } from './ui.js';

class WispherGrid {
    constructor() {
        this.webrtc = new WebRTCManager();
        this.room = new RoomManager();
        this.ui = new UIManager();
        this.username = '';
        this.connectedPeers = new Map(); // peerId -> { username, connectedAt }
        
        this.initialize();
    }

    /**
     * Initialize the application
     */
    initialize() {
        // Setup WebRTC event handlers
        this.setupWebRTCHandlers();
        
        // Setup room event handlers
        this.setupRoomHandlers();
        
        // Setup UI
        this.ui.initialize(
            (roomId, username) => this.joinRoom(roomId, username),
            () => this.leaveRoom(),
            (message) => this.sendMessage(message),
            (enabled) => this.toggleVideo(enabled),
            (enabled) => this.toggleAudio(enabled),
            () => this.startVideoCall(),
            () => this.endVideoCall()
        );

        // Setup file and connection callbacks
        this.ui.setFileCallbacks(
            (file) => this.handleFileSelected(file),
            () => this.showConnectionStatus(),
            () => this.copyConnectionInfo(),
            (signalData) => this.processManualSignal(signalData)
        );

        // Setup video call button
        this.ui.setVideoCallHandlers(
            () => this.startVideoCall(),
            () => this.endVideoCall()
        );

        // Check for room in URL
        const urlRoomId = RoomManager.parseRoomFromUrl();
        if (urlRoomId) {
            document.getElementById('room-input').value = urlRoomId;
        }

        // Check for stored room info (for reconnection)
        const stored = RoomManager.getStoredRoomInfo();
        if (stored.roomId && stored.userId && stored.username) {
            // Could auto-reconnect here if desired
        }
    }

    /**
     * Setup WebRTC event handlers
     */
    setupWebRTCHandlers() {
        this.webrtc.onRemoteStream = (peerId, stream) => {
            const peerInfo = this.connectedPeers.get(peerId);
            this.ui.addRemoteVideo(peerId, stream, peerInfo?.username || 'Peer');
        };

        this.webrtc.onConnectionStateChange = (peerId, state) => {
            console.log(`Peer ${peerId} connection state: ${state}`);
            
            if (state === 'connected') {
                this.ui.showToast('Peer connected', 'success');
                // Update peer connection status
                const peerInfo = this.connectedPeers.get(peerId);
                if (peerInfo) {
                    peerInfo.connected = true;
                }
            } else if (state === 'disconnected') {
                // Don't immediately remove - wait a bit in case of temporary disconnection
                const peerInfo = this.connectedPeers.get(peerId);
                if (peerInfo && !peerInfo.disconnectTimer) {
                    peerInfo.disconnectTimer = setTimeout(() => {
                        if (this.connectedPeers.has(peerId)) {
                            const pInfo = this.connectedPeers.get(peerId);
                            this.ui.displaySystemMessage(`${pInfo.username} left`);
                            this.ui.removeRemoteVideo(peerId);
                            this.connectedPeers.delete(peerId);
                            this.updatePeerCount();
                        }
                    }, 3000); // Wait 3 seconds before considering disconnected
                }
            } else if (state === 'failed') {
                // Only remove on hard failure
                const peerInfo = this.connectedPeers.get(peerId);
                if (peerInfo) {
                    this.ui.displaySystemMessage(`${peerInfo.username} disconnected`);
                    this.ui.removeRemoteVideo(peerId);
                    this.webrtc.closePeerConnection(peerId);
                    this.connectedPeers.delete(peerId);
                    this.updatePeerCount();
                }
            } else if (state === 'connecting') {
                // Reset disconnect timer if reconnecting
                const peerInfo = this.connectedPeers.get(peerId);
                if (peerInfo && peerInfo.disconnectTimer) {
                    clearTimeout(peerInfo.disconnectTimer);
                    peerInfo.disconnectTimer = null;
                }
            }
        };

        this.webrtc.onDataChannelOpen = (peerId) => {
            console.log(`Data channel opened with peer ${peerId}`);
        };

        this.webrtc.onDataChannelClose = (peerId) => {
            console.log(`Data channel closed with peer ${peerId}`);
        };

        this.webrtc.onMessage = (peerId, message) => {
            this.handleIncomingMessage(peerId, message);
        };

        this.webrtc.onIceCandidate = (peerId, candidate) => {
            if (candidate) {
                this.room.sendSignal(peerId, 'ice-candidate', candidate);
            }
        };
    }

    /**
     * Setup room signaling handlers
     */
    setupRoomHandlers() {
        // Will be set up when joining a room
    }

    /**
     * Join a room
     */
    async joinRoom(roomId, username) {
        try {
            this.username = username;
            const userId = this.generateUserId();
            
            // Join room
            this.room.joinRoom(roomId, userId, username);
            
            // Don't initialize media yet - wait for video call button
            this.videoCallActive = false;
            this.pendingOffers = new Map(); // Track pending offers
            this.pendingAnswers = new Map(); // Track pending answers
            
            // Setup signaling
            this.room.initializeSignaling(
                (peerId, data) => this.handlePeerJoin(peerId, data),
                (peerId) => this.handlePeerLeave(peerId),
                (peerId, type, data) => this.handleSignaling(peerId, type, data)
            );
            
            // Show chat screen
            this.ui.showChatScreen(roomId);
            this.ui.showVideoContainer(false); // Hide video container initially
            this.ui.displaySystemMessage(`Joined room: ${roomId}`);
            
            // Update URL
            window.history.pushState(null, '', `#room/${roomId}`);
            
        } catch (error) {
            console.error('Error joining room:', error);
            this.ui.showToast('Error joining room', 'error');
        }
    }

    /**
     * Start video call
     */
    async startVideoCall() {
        if (this.videoCallActive) return;

        try {
            this.videoCallActive = true;
            this.ui.showVideoContainer(true);
            
            // Request media permissions
            const videoEnabled = this.ui.settings.enableVideo;
            const audioEnabled = this.ui.settings.enableAudio;
            
            try {
                const localStream = await this.webrtc.initializeLocalStream(videoEnabled, audioEnabled);
                this.ui.setLocalVideo(localStream);
                
                // Add media tracks to all existing peer connections
                this.connectedPeers.forEach((peerInfo, peerId) => {
                    const peer = this.webrtc.peers.get(peerId);
                    if (peer && peer.pc) {
                        const pcState = peer.pc.signalingState;
                        if (pcState !== 'closed' && pcState !== 'have-local-offer') {
                            // Add tracks to existing connection
                            localStream.getTracks().forEach(track => {
                                const sender = peer.pc.getSenders().find(s => 
                                    s.track && s.track.kind === track.kind
                                );
                                if (sender) {
                                    sender.replaceTrack(track);
                                } else {
                                    peer.pc.addTrack(track, localStream);
                                }
                            });
                            
                            // If connection is stable, renegotiate
                            if (pcState === 'stable' && peer.pc.localDescription === null) {
                                this.webrtc.createOffer(peerId).then(offer => {
                                    this.room.sendSignal(peerId, 'offer', offer);
                                }).catch(err => console.error('Error renegotiating:', err));
                            }
                        }
                    }
                });
                
                this.ui.showToast('Video call started', 'success');
            } catch (error) {
                console.error('Error accessing media:', error);
                this.ui.showToast('Could not access camera/microphone', 'error');
                this.videoCallActive = false;
                this.ui.showVideoContainer(false);
            }
        } catch (error) {
            console.error('Error starting video call:', error);
            this.videoCallActive = false;
        }
    }

    /**
     * End video call
     */
    endVideoCall() {
        if (!this.videoCallActive) return;
        
        this.videoCallActive = false;
        this.webrtc.stopLocalStream();
        this.ui.showVideoContainer(false);
        this.ui.showToast('Video call ended', 'info');
    }

    /**
     * Leave the current room
     */
    leaveRoom() {
        this.webrtc.closeAllConnections();
        this.room.leaveRoom();
        this.connectedPeers.clear();
        this.ui.clearMessages();
        this.ui.showHomeScreen();
        this.ui.updatePeerCount(0);
        
        // Clear URL
        window.history.pushState(null, '', window.location.pathname);
        
        this.ui.showToast('Left room', 'info');
    }

    /**
     * Handle peer joining via signaling
     */
    async handlePeerJoin(peerId, data) {
        if (this.connectedPeers.has(peerId) || peerId === this.room.userId) {
            return; // Already connected or is self
        }

        console.log(`Peer joining: ${peerId}`, data);
        
        // Store peer info immediately
        this.connectedPeers.set(peerId, {
            username: data.username || 'Unknown',
            connectedAt: Date.now(),
            connected: false
        });

        this.ui.displaySystemMessage(`${data.username || 'Someone'} joined`);
        this.updatePeerCount();

        // Create peer connection for data channel (text messaging)
        // Media will be added when video call starts
        const isInitiator = this.room.userId.localeCompare(peerId) > 0;
        
        try {
            await this.webrtc.createPeerConnection(peerId, isInitiator);

            if (isInitiator) {
                // We initiate - create offer
                const offer = await this.webrtc.createOffer(peerId);
                this.room.sendSignal(peerId, 'offer', offer);
            }
            // If not initiator, wait for offer
        } catch (error) {
            console.error('Error creating peer connection:', error);
            this.ui.showToast('Failed to connect to peer', 'error');
        }
    }

    /**
     * Handle peer leaving
     */
    handlePeerLeave(peerId) {
        if (this.connectedPeers.has(peerId)) {
            const peerInfo = this.connectedPeers.get(peerId);
            this.ui.displaySystemMessage(`${peerInfo.username} left`);
            this.ui.removeRemoteVideo(peerId);
            this.webrtc.closePeerConnection(peerId);
            this.connectedPeers.delete(peerId);
            this.updatePeerCount();
        }
    }

    /**
     * Handle signaling messages (offer, answer, ice-candidate)
     */
    async handleSignaling(peerId, type, data) {
        try {
            switch (type) {
                case 'offer':
                    // Receive offer, create answer
                    let existingPeer = this.webrtc.peers.get(peerId);
                    if (!existingPeer) {
                        // Create connection if it doesn't exist
                        await this.webrtc.createPeerConnection(peerId, false);
                        existingPeer = this.webrtc.peers.get(peerId);
                    }
                    
                    if (existingPeer && existingPeer.pc) {
                        const pcState = existingPeer.pc.signalingState;
                        if (pcState === 'stable' || pcState === 'have-local-offer') {
                            // Can accept offer
                            const answer = await this.webrtc.createAnswer(peerId, data);
                            this.room.sendSignal(peerId, 'answer', answer);
                        } else {
                            // Store offer for later
                            this.pendingOffers.set(peerId, data);
                        }
                    }
                    break;
                    
                case 'answer':
                    // Receive answer
                    const peer = this.webrtc.peers.get(peerId);
                    if (peer && peer.pc) {
                        const pcState = peer.pc.signalingState;
                        if (pcState === 'have-local-offer' || pcState === 'have-remote-offer') {
                            await this.webrtc.setRemoteDescription(peerId, data);
                        } else {
                            // Store answer for later
                            this.pendingAnswers.set(peerId, data);
                        }
                    }
                    break;
                    
                case 'ice-candidate':
                    // Add ICE candidate
                    await this.webrtc.addIceCandidate(peerId, data);
                    break;
            }
        } catch (error) {
            console.error(`Error handling ${type} from ${peerId}:`, error);
        }
    }

    /**
     * Send a text message to all peers
     */
    sendMessage(message) {
        const messageData = {
            type: 'message',
            username: this.username,
            message: message,
            timestamp: Date.now()
        };

        // Broadcast to all connected peers
        this.webrtc.broadcastMessage(messageData);

        // Display own message
        this.ui.displayMessage(this.username, message, Date.now(), true);
    }

    /**
     * Handle incoming message from peer
     */
    handleIncomingMessage(peerId, message) {
        if (message.type === 'message') {
            const peerInfo = this.connectedPeers.get(peerId);
            this.ui.displayMessage(
                message.username || peerInfo?.username || 'Unknown',
                message.message,
                message.timestamp || Date.now(),
                false
            );
        } else if (message.type === 'file') {
            const peerInfo = this.connectedPeers.get(peerId);
            this.handleFileReceived(
                message.username || peerInfo?.username || 'Unknown',
                message.fileName,
                message.fileSize,
                message.fileData,
                message.timestamp || Date.now()
            );
        }
    }

    /**
     * Handle file selected for sharing
     */
    async handleFileSelected(file) {
        if (file.size > 100 * 1024 * 1024) { // 100MB limit
            this.ui.showToast('File too large (max 100MB)', 'error');
            return;
        }

        try {
            const fileData = await this.readFileAsBase64(file);
            const fileMessage = {
                type: 'file',
                username: this.username,
                fileName: file.name,
                fileSize: file.size,
                fileData: fileData,
                timestamp: Date.now()
            };

            // Broadcast to all peers
            this.webrtc.broadcastMessage(fileMessage);

            // Display own file message
            this.ui.displayFileMessage(
                this.username,
                file.name,
                file.size,
                fileData,
                Date.now(),
                true,
                (fileName, data) => this.downloadFile(fileName, data)
            );
        } catch (error) {
            console.error('Error reading file:', error);
            this.ui.showToast('Error reading file', 'error');
        }
    }

    /**
     * Read file as base64
     */
    readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * Handle received file
     */
    handleFileReceived(username, fileName, fileSize, fileData, timestamp) {
        this.ui.displayFileMessage(
            username,
            fileName,
            fileSize,
            fileData,
            timestamp,
            false,
            (fileName, data) => this.downloadFile(fileName, data)
        );
    }

    /**
     * Download file
     */
    downloadFile(fileName, base64Data) {
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray]);
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Show connection status modal
     */
    showConnectionStatus() {
        if (this.room.roomId) {
            this.ui.showConnectionStatus(this.room.roomId);
        }
    }

    /**
     * Copy connection info for manual signaling
     */
    copyConnectionInfo() {
        // Generate current connection state for manual copy-paste
        const connectionInfo = {
            roomId: this.room.roomId,
            userId: this.room.userId,
            username: this.username,
            timestamp: Date.now()
        };
        const infoText = JSON.stringify(connectionInfo);
        this.ui.copyConnectionInfo(infoText);
    }

    /**
     * Process manual signal paste
     */
    processManualSignal(signalData) {
        try {
            const parsed = JSON.parse(signalData);
            if (parsed.roomId === this.room.roomId && parsed.userId !== this.room.userId) {
                // Same room, different user - try to connect
                this.handlePeerJoin(parsed.userId, { username: parsed.username });
            } else {
                this.ui.showToast('Invalid connection info', 'error');
            }
        } catch (error) {
            this.ui.showToast('Invalid connection format', 'error');
        }
    }

    /**
     * Toggle local video
     */
    toggleVideo(enabled) {
        this.webrtc.toggleVideo(enabled);
        this.ui.saveSettings();
    }

    /**
     * Toggle local audio
     */
    toggleAudio(enabled) {
        this.webrtc.toggleAudio(enabled);
        this.ui.saveSettings();
    }

    /**
     * Update peer count display
     */
    updatePeerCount() {
        this.ui.updatePeerCount(this.connectedPeers.size);
    }

    /**
     * Generate a unique user ID
     */
    generateUserId() {
        return `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.wispherGrid = new WispherGrid();
    });
} else {
    window.wispherGrid = new WispherGrid();
}

