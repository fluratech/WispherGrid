/**
 * UI Manager
 * Handles all UI interactions and updates
 */

export class UIManager {
    constructor() {
        this.settings = {
            enableVideo: true,
            enableAudio: true,
            playSounds: false,
            theme: 'dark'
        };
        this.loadSettings();
        this.applyTheme();
    }

    /**
     * Initialize UI event listeners
     */
    initialize(onJoinRoom, onLeaveRoom, onSendMessage, onToggleVideo, onToggleAudio) {
        // Home screen
        const joinBtn = document.getElementById('join-room-btn');
        const usernameInput = document.getElementById('username-input');
        const roomInput = document.getElementById('room-input');
        const generateRoomBtn = document.getElementById('generate-room-btn');

        joinBtn.addEventListener('click', () => {
            const username = usernameInput.value.trim();
            const roomId = roomInput.value.trim();
            
            if (!username) {
                this.showToast('Please enter your name', 'error');
                return;
            }
            
            if (!roomId) {
                this.showToast('Please enter a room name', 'error');
                return;
            }
            
            onJoinRoom(roomId, username);
        });

        // Generate random room name
        generateRoomBtn.addEventListener('click', () => {
            const randomRoom = Math.random().toString(36).substring(2, 10);
            roomInput.value = randomRoom;
        });

        // Enter key to join
        usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') joinBtn.click();
        });
        
        roomInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') joinBtn.click();
        });

        // Chat screen
        const backBtn = document.getElementById('back-btn');
        const sendBtn = document.getElementById('send-btn');
        const messageInput = document.getElementById('message-input');

        backBtn.addEventListener('click', onLeaveRoom);

        sendBtn.addEventListener('click', () => {
            const message = messageInput.value.trim();
            if (message) {
                onSendMessage(message);
                messageInput.value = '';
            }
        });

        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendBtn.click();
            }
        });

        // Video/Audio controls
        const toggleVideoBtn = document.getElementById('toggle-video');
        const toggleAudioBtn = document.getElementById('toggle-audio');

        toggleVideoBtn.addEventListener('click', () => {
            const enabled = !this.settings.enableVideo;
            this.settings.enableVideo = enabled;
            onToggleVideo(enabled);
            this.updateVideoButton(toggleVideoBtn, enabled);
        });

        toggleAudioBtn.addEventListener('click', () => {
            const enabled = !this.settings.enableAudio;
            this.settings.enableAudio = enabled;
            onToggleAudio(enabled);
            this.updateAudioButton(toggleAudioBtn, enabled);
        });

        // Settings modal
        const settingsBtn = document.getElementById('settings-btn');
        const closeSettingsBtn = document.getElementById('close-settings-btn');
        const settingsModal = document.getElementById('settings-modal');
        const enableVideoCheck = document.getElementById('enable-video');
        const enableAudioCheck = document.getElementById('enable-audio');
        const playSoundsCheck = document.getElementById('play-sounds');
        const themeSelect = document.getElementById('theme-select');

        settingsBtn.addEventListener('click', () => {
            settingsModal.classList.add('active');
        });

        closeSettingsBtn.addEventListener('click', () => {
            settingsModal.classList.remove('active');
        });

        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                settingsModal.classList.remove('active');
            }
        });

        enableVideoCheck.checked = this.settings.enableVideo;
        enableAudioCheck.checked = this.settings.enableAudio;
        playSoundsCheck.checked = this.settings.playSounds;
        themeSelect.value = this.settings.theme;

        enableVideoCheck.addEventListener('change', (e) => {
            this.settings.enableVideo = e.target.checked;
            onToggleVideo(e.target.checked);
            this.saveSettings();
        });

        enableAudioCheck.addEventListener('change', (e) => {
            this.settings.enableAudio = e.target.checked;
            onToggleAudio(e.target.checked);
            this.saveSettings();
        });

        playSoundsCheck.addEventListener('change', (e) => {
            this.settings.playSounds = e.target.checked;
            this.saveSettings();
        });

        themeSelect.addEventListener('change', (e) => {
            this.settings.theme = e.target.value;
            this.applyTheme();
            this.saveSettings();
        });

        // Load room from URL if present
        this.checkUrlForRoom(roomInput);
    }

    /**
     * Check URL for room parameter and auto-fill
     */
    checkUrlForRoom(roomInput) {
        const roomId = RoomManager.parseRoomFromUrl();
        if (roomId) {
            roomInput.value = roomId;
        }
    }

    /**
     * Show home screen
     */
    showHomeScreen() {
        document.getElementById('home-screen').classList.add('active');
        document.getElementById('chat-screen').classList.remove('active');
    }

    /**
     * Show chat screen
     */
    showChatScreen(roomName) {
        document.getElementById('home-screen').classList.remove('active');
        document.getElementById('chat-screen').classList.add('active');
        document.getElementById('room-name-display').textContent = roomName;
    }

    /**
     * Update peer count display
     */
    updatePeerCount(count) {
        const peerCountEl = document.getElementById('peer-count');
        if (count === 0) {
            peerCountEl.textContent = 'No peers connected';
        } else if (count === 1) {
            peerCountEl.textContent = '1 peer connected';
        } else {
            peerCountEl.textContent = `${count} peers connected`;
        }
    }

    /**
     * Display a message in the chat
     */
    displayMessage(username, message, timestamp, isOwn = false) {
        const messagesList = document.getElementById('messages-list');
        const messageEl = document.createElement('div');
        messageEl.className = `message ${isOwn ? 'own' : 'other'}`;
        
        const time = new Date(timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        messageEl.innerHTML = `
            <div class="message-header">
                <span class="message-author">${this.escapeHtml(username)}</span>
            </div>
            <div class="message-body">${this.escapeHtml(message)}</div>
            <div class="message-time">${time}</div>
        `;

        messagesList.appendChild(messageEl);
        messagesList.scrollTop = messagesList.scrollHeight;

        // Play sound if enabled
        if (this.settings.playSounds && !isOwn) {
            this.playNotificationSound();
        }
    }

    /**
     * Display system message
     */
    displaySystemMessage(message) {
        const messagesList = document.getElementById('messages-list');
        const messageEl = document.createElement('div');
        messageEl.className = 'message system';
        messageEl.style.cssText = 'align-self: center; max-width: 100%;';
        messageEl.innerHTML = `
            <div class="message-body" style="background: var(--bg-tertiary); color: var(--text-secondary); font-size: 0.9rem; font-style: italic;">
                ${this.escapeHtml(message)}
            </div>
        `;
        messagesList.appendChild(messageEl);
        messagesList.scrollTop = messagesList.scrollHeight;
    }

    /**
     * Clear all messages
     */
    clearMessages() {
        document.getElementById('messages-list').innerHTML = '';
    }

    /**
     * Add remote video stream
     */
    addRemoteVideo(peerId, stream, username) {
        const remoteVideos = document.getElementById('remote-videos');
        
        // Check if video already exists
        const existing = document.getElementById(`video-${peerId}`);
        if (existing) {
            existing.querySelector('video').srcObject = stream;
            existing.querySelector('.peer-name').textContent = username;
            return;
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'remote-video-wrapper';
        wrapper.id = `video-${peerId}`;
        
        const video = document.createElement('video');
        video.autoplay = true;
        video.playsInline = true;
        video.srcObject = stream;
        
        const nameLabel = document.createElement('div');
        nameLabel.className = 'peer-name';
        nameLabel.textContent = username;
        
        wrapper.appendChild(video);
        wrapper.appendChild(nameLabel);
        remoteVideos.appendChild(wrapper);
    }

    /**
     * Remove remote video
     */
    removeRemoteVideo(peerId) {
        const videoEl = document.getElementById(`video-${peerId}`);
        if (videoEl) {
            const stream = videoEl.querySelector('video').srcObject;
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            videoEl.remove();
        }
    }

    /**
     * Set local video stream
     */
    setLocalVideo(stream) {
        const localVideo = document.getElementById('local-video');
        localVideo.srcObject = stream;
    }

    /**
     * Update video button state
     */
    updateVideoButton(btn, enabled) {
        btn.textContent = enabled ? '📹' : '📹';
        btn.classList.toggle('muted', !enabled);
        btn.title = enabled ? 'Disable Video' : 'Enable Video';
    }

    /**
     * Update audio button state
     */
    updateAudioButton(btn, enabled) {
        btn.textContent = enabled ? '🎤' : '🎤';
        btn.classList.toggle('muted', !enabled);
        btn.title = enabled ? 'Mute Audio' : 'Unmute Audio';
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info', duration = 3000) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    }

    /**
     * Play notification sound
     */
    playNotificationSound() {
        // Create a simple beep sound
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Save settings to localStorage
     */
    saveSettings() {
        localStorage.setItem('wisphergrid_settings', JSON.stringify(this.settings));
    }

    /**
     * Load settings from localStorage
     */
    loadSettings() {
        const saved = localStorage.getItem('wisphergrid_settings');
        if (saved) {
            try {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            } catch (error) {
                console.error('Error loading settings:', error);
            }
        }
    }

    /**
     * Apply theme
     */
    applyTheme() {
        const theme = this.settings.theme === 'auto' 
            ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
            : this.settings.theme;
        
        document.documentElement.setAttribute('data-theme', theme);
    }
}

// Import RoomManager for static method
import { RoomManager } from './room-manager.js';

