/**
 * WebRTC Manager
 * Handles peer-to-peer connections, data channels, and media streams
 */

export class WebRTCManager {
    constructor() {
        this.peers = new Map(); // peerId -> { pc, dataChannel, videoStream }
        this.localStream = null;
        this.config = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };
    }

    /**
     * Initialize local media stream (video/audio)
     */
    async initializeLocalStream(video = true, audio = true) {
        try {
            const constraints = {
                video: video ? { width: 1280, height: 720 } : false,
                audio: audio
            };

            this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
            return this.localStream;
        } catch (error) {
            console.error('Error accessing media devices:', error);
            throw error;
        }
    }

    /**
     * Stop local media stream
     */
    stopLocalStream() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
    }

    /**
     * Create a peer connection for a specific peer
     */
    async createPeerConnection(peerId, isInitiator = false) {
        const pc = new RTCPeerConnection(this.config);

        // Add local tracks to peer connection
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                pc.addTrack(track, this.localStream);
            });
        }

        // Handle incoming tracks
        pc.ontrack = (event) => {
            const [remoteStream] = event.streams;
            this.peers.get(peerId).remoteStream = remoteStream;
            this.onRemoteStream?.(peerId, remoteStream);
        };

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.onIceCandidate?.(peerId, event.candidate);
            } else {
                // No more candidates
                this.onIceCandidate?.(peerId, null);
            }
        };

        // Handle connection state changes
        pc.onconnectionstatechange = () => {
            const state = pc.connectionState;
            this.onConnectionStateChange?.(peerId, state);
            
            if (state === 'failed' || state === 'disconnected') {
                this.closePeerConnection(peerId);
            }
        };

        // Create data channel for messaging (only if initiator)
        let dataChannel = null;
        if (isInitiator) {
            dataChannel = pc.createDataChannel('messages', { ordered: true });
            this.setupDataChannel(peerId, dataChannel);
        } else {
            // Wait for data channel from remote peer
            pc.ondatachannel = (event) => {
                dataChannel = event.channel;
                this.setupDataChannel(peerId, dataChannel);
            };
        }

        // Store peer connection
        this.peers.set(peerId, {
            pc,
            dataChannel,
            remoteStream: null
        });

        return { pc, dataChannel };
    }

    /**
     * Setup data channel event handlers
     */
    setupDataChannel(peerId, dataChannel) {
        dataChannel.onopen = () => {
            this.onDataChannelOpen?.(peerId);
        };

        dataChannel.onclose = () => {
            this.onDataChannelClose?.(peerId);
        };

        dataChannel.onerror = (error) => {
            console.error(`Data channel error for peer ${peerId}:`, error);
            this.onDataChannelError?.(peerId, error);
        };

        dataChannel.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.onMessage?.(peerId, message);
            } catch (error) {
                console.error('Error parsing message:', error);
            }
        };

        // Update stored data channel
        const peer = this.peers.get(peerId);
        if (peer) {
            peer.dataChannel = dataChannel;
        }
    }

    /**
     * Create and set local description (offer)
     */
    async createOffer(peerId) {
        const peer = this.peers.get(peerId);
        if (!peer) throw new Error('Peer connection not found');

        const offer = await peer.pc.createOffer();
        await peer.pc.setLocalDescription(offer);
        return offer;
    }

    /**
     * Set remote description and create answer
     */
    async createAnswer(peerId, offer) {
        const peer = this.peers.get(peerId);
        if (!peer) throw new Error('Peer connection not found');

        await peer.pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peer.pc.createAnswer();
        await peer.pc.setLocalDescription(answer);
        return answer;
    }

    /**
     * Set remote description (for answer)
     */
    async setRemoteDescription(peerId, description) {
        const peer = this.peers.get(peerId);
        if (!peer) throw new Error('Peer connection not found');

        await peer.pc.setRemoteDescription(new RTCSessionDescription(description));
    }

    /**
     * Add ICE candidate
     */
    async addIceCandidate(peerId, candidate) {
        const peer = this.peers.get(peerId);
        if (!peer) return;

        try {
            await peer.pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
            console.error('Error adding ICE candidate:', error);
        }
    }

    /**
     * Send message to peer via data channel
     */
    sendMessage(peerId, message) {
        const peer = this.peers.get(peerId);
        if (!peer || !peer.dataChannel || peer.dataChannel.readyState !== 'open') {
            throw new Error('Data channel not ready');
        }

        peer.dataChannel.send(JSON.stringify(message));
    }

    /**
     * Broadcast message to all connected peers
     */
    broadcastMessage(message) {
        this.peers.forEach((peer, peerId) => {
            if (peer.dataChannel && peer.dataChannel.readyState === 'open') {
                try {
                    peer.dataChannel.send(JSON.stringify(message));
                } catch (error) {
                    console.error(`Error sending message to peer ${peerId}:`, error);
                }
            }
        });
    }

    /**
     * Toggle local video track
     */
    toggleVideo(enabled) {
        if (this.localStream) {
            const videoTrack = this.localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = enabled;
            }
        }
    }

    /**
     * Toggle local audio track
     */
    toggleAudio(enabled) {
        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = enabled;
            }
        }
    }

    /**
     * Close a specific peer connection
     */
    closePeerConnection(peerId) {
        const peer = this.peers.get(peerId);
        if (peer) {
            if (peer.dataChannel) {
                peer.dataChannel.close();
            }
            peer.pc.close();
            if (peer.remoteStream) {
                peer.remoteStream.getTracks().forEach(track => track.stop());
            }
            this.peers.delete(peerId);
        }
    }

    /**
     * Close all peer connections
     */
    closeAllConnections() {
        this.peers.forEach((peer, peerId) => {
            this.closePeerConnection(peerId);
        });
        this.stopLocalStream();
    }

    /**
     * Get all peer IDs
     */
    getPeerIds() {
        return Array.from(this.peers.keys());
    }

    /**
     * Check if data channel is open for a peer
     */
    isDataChannelOpen(peerId) {
        const peer = this.peers.get(peerId);
        return peer && peer.dataChannel && peer.dataChannel.readyState === 'open';
    }
}

