# WispherGrid

A peer-to-peer communication application using WebRTC without centralized servers. All communication is encrypted end-to-end, decentralized, and ephemeral.

## Features

- 🔒 **End-to-End Encrypted**: All communication is encrypted
- 🌐 **Serverless**: No central servers - direct peer-to-peer connections
- 💨 **Ephemeral**: Messages disappear when you leave
- 📹 **Video & Audio**: Support for video and audio calls
- 💬 **Text Messaging**: Real-time text messaging via WebRTC data channels
- 📎 **File Sharing**: Send files directly to peers (up to 50MB)
- 🎨 **Modern UI**: Clean, responsive interface with WhatsApp-like design
- 📱 **Responsive**: Works on desktop and mobile devices

## How It Works

WispherGrid uses WebRTC (Web Real-Time Communication) to establish direct connections between peers:

1. **Room-Based**: Users join rooms by name
2. **Signaling**: WebSocket server for cross-device support (or BroadcastChannel for same-device)
3. **WebRTC Connections**: Direct peer-to-peer connections for media and data
4. **Data Channels**: Text messages and files sent via reliable data channels
5. **Media Streams**: Video and audio streams shared directly between peers

### ⚠️ Important: Cross-Device Support

**For GitHub Pages (Current Setup):**
- ✅ **Same Device:** Works automatically (different browser tabs)
- ❌ **Cross-Device:** Needs signaling server deployment (see below)

For cross-device connections (phone ↔ laptop), deploy the signaling server separately. See [GITHUB_PAGES_DEPLOYMENT.md](GITHUB_PAGES_DEPLOYMENT.md) for detailed instructions.

**Quick Setup:**
1. Deploy `signaling-server.js` to Render/Railway (free)
2. Get WebSocket URL (e.g., `wss://your-app.onrender.com`)
3. Add `?ws=wss://your-app.onrender.com` to GitHub Pages URL

## Getting Started

### Using GitHub Pages (Production)

Your app is already live at: **https://fluratech.github.io/WispherGrid/**

1. Open the link above
2. Enter your name and room name
3. Share the URL with others (same device works immediately)
4. For cross-device, deploy signaling server (see [GITHUB_PAGES_DEPLOYMENT.md](GITHUB_PAGES_DEPLOYMENT.md))

### Local Development

⚠️ **Important**: This app uses ES6 modules and must be served over HTTP (not file://). 

#### Quick Start

**Option 1: Python Server (Easiest)**

```bash
# Just run:
python server.py

# Then open: http://localhost:8000
```

**Option 2: Node.js Server**

```bash
node server.js

# Then open: http://localhost:8000
```

**Option 3: Any HTTP Server**

```bash
# Python
python -m http.server 8000

# PHP
php -S localhost:8000

# Node.js (install first)
npx http-server -p 8000
```

#### For Cross-Device Testing Locally

1. **Terminal 1:** Start signaling server
   ```bash
   npm install
   npm run signaling
   ```

2. **Terminal 2:** Start web server
   ```bash
   python server.py
   ```

3. **Connect devices:**
   - Find your computer's IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
   - Phone: Open `http://YOUR-IP:8000`
   - Laptop: Open `http://localhost:8000`
   - Both join same room → They connect!

## File Servers (server.py/server.js) - Explained

**These files are ONLY for local development:**

- ✅ Keep in repository (for others to test locally)
- ✅ Use when testing on your computer
- ❌ **NOT needed for GitHub Pages** (GitHub already serves files)
- ❌ **NOT deployed anywhere** (they're just local helpers)

GitHub Pages automatically serves your static files (HTML/CSS/JS), so you don't need a file server there.

## Signaling Server Deployment

For cross-device connections, deploy `signaling-server.js` separately:

**Recommended: Render.com (Free)**
1. Go to https://render.com
2. Sign up (free)
3. New → Web Service
4. Connect GitHub repo
5. Build: `npm install`
6. Start: `node signaling-server.js`
7. Get URL: `wss://your-app.onrender.com`
8. Add `?ws=wss://your-app.onrender.com` to your GitHub Pages URL

**See [GITHUB_PAGES_DEPLOYMENT.md](GITHUB_PAGES_DEPLOYMENT.md) for detailed steps.**

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
- `signaling-server.js` - WebSocket signaling server (deploy separately)

### Signaling

The app uses a hybrid approach:
- **WebSocket** (if available) - For cross-device and multi-peer support
- **BroadcastChannel** (fallback) - For same-device tabs/windows

### STUN Servers

The app uses Google's public STUN servers by default:
- Multiple STUN servers for better NAT traversal
- Automatic ICE restart on connection failures

For production use behind strict firewalls, you may need to configure your own STUN/TURN servers.

## Privacy & Security

- All communication is peer-to-peer - no data passes through servers
- Messages are not stored or logged
- Video/audio streams are encrypted via WebRTC's built-in encryption
- No tracking or analytics
- Signaling server only handles connection setup (no message content)

## Limitations

- **Cross-Device:** Requires separate signaling server deployment (free options available)
- **NAT Traversal:** May require TURN servers for peers behind strict firewalls
- **No Message History:** Messages are ephemeral and disappear when you leave
- **Browser Required:** Requires modern browser with WebRTC support

## Deployment

- **GitHub Pages:** ✅ Already deployed at https://fluratech.github.io/WispherGrid/
- **Signaling Server:** Deploy separately to Render/Railway/etc. (see [GITHUB_PAGES_DEPLOYMENT.md](GITHUB_PAGES_DEPLOYMENT.md))

## License

Open source - feel free to use and modify as needed.

## Credits

Rebuilt and organized from open-source WebRTC peer-to-peer chat applications.
