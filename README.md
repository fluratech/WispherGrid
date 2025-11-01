# WispherGrid

A peer-to-peer communication application using WebRTC without centralized servers. All communication is encrypted end-to-end, decentralized, and ephemeral.

## Features

- 🔒 **End-to-End Encrypted**: All communication is encrypted
- 🌐 **Serverless**: No central servers - direct peer-to-peer connections
- 💨 **Ephemeral**: Messages disappear when you leave
- 📹 **Video & Audio**: Support for video and audio calls
- 💬 **Text Messaging**: Real-time text messaging via WebRTC data channels
- 🎨 **Modern UI**: Clean, responsive interface with dark/light themes
- 📱 **Responsive**: Works on desktop and mobile devices

## How It Works

WispherGrid uses WebRTC (Web Real-Time Communication) to establish direct connections between peers:

1. **Room-Based**: Users join rooms by name
2. **Signaling**: WebSocket server for cross-device support (or BroadcastChannel for same-device)
3. **WebRTC Connections**: Direct peer-to-peer connections for media and data
4. **Data Channels**: Text messages and files sent via reliable data channels
5. **Media Streams**: Video and audio streams shared directly between peers

### ⚠️ Important: Cross-Device Support

For cross-device connections (phone ↔ laptop, etc.), you need to run the signaling server:

```bash
npm install
npm run signaling
```

See [SIGNALING_SETUP.md](SIGNALING_SETUP.md) for detailed setup instructions.

## Getting Started

### Running Locally

⚠️ **Important**: This app uses ES6 modules and must be served over HTTP (not file://). 

#### Quick Start (Easiest)

**Option 1: Use the included server scripts**

```bash
# Windows - Double-click or run:
start-server.bat

# Or manually with Python:
python server.py

# Or with Node.js:
node server.js
```

Then open `http://localhost:8000` in your browser.

**Option 2: Python Simple Server**

```bash
python -m http.server 8000
```

**Option 3: Node.js HTTP Server**

```bash
# Install globally (one time)
npm install -g http-server

# Run server
http-server -p 8000
```

**Option 4: PHP Built-in Server**

```bash
php -S localhost:8000
```

### Using the App

1. Start the local server (see above)
2. Open `http://localhost:8000` in your browser
3. Enter your name and a room name
4. Share the room URL with others (they need to be on the same origin)
5. Start chatting and video calling!

## Browser Support

- Chrome/Edge (recommended)
- Firefox
- Safari (with limitations)

## Technical Details

### Architecture

- `js/app.js` - Main application orchestrator
- `js/webrtc-manager.js` - WebRTC peer connection management
- `js/room-manager.js` - Room management and signaling
- `js/ui.js` - UI management and interactions
- `css/style.css` - Styling with CSS variables for theming

### Signaling

The current implementation uses BroadcastChannel API for signaling, which works for:
- Same-origin tabs/windows
- Local network peers (when served from same origin)

For cross-origin or internet-wide peer-to-peer, you would need to integrate a signaling server (WebSocket, Socket.io, etc.) or use a service like WebRTC's ICE servers with TURN servers for NAT traversal.

### STUN Servers

The app uses Google's public STUN servers by default:
- `stun:stun.l.google.com:19302`
- `stun:stun1.l.google.com:19302`

For production use behind strict firewalls, you may need to configure your own STUN/TURN servers.

## Privacy & Security

- All communication is peer-to-peer - no data passes through servers
- Messages are not stored or logged
- Video/audio streams are encrypted via WebRTC's built-in encryption
- No tracking or analytics

## Limitations

- **Same-Origin Signaling**: Current signaling uses BroadcastChannel, which requires same-origin (works for same browser tabs/windows)
- **NAT Traversal**: May require TURN servers for peers behind strict firewalls
- **No Message History**: Messages are ephemeral and disappear when you leave
- **Browser Required**: Requires modern browser with WebRTC support

## License

Open source - feel free to use and modify as needed.

## Credits

Rebuilt and organized from open-source WebRTC peer-to-peer chat applications.

