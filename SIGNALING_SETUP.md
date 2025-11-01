# Signaling Server Setup

## The Problem

**BroadcastChannel** (current method) only works for:
- ✅ Same browser tabs/windows on the same device
- ❌ Different devices (phones, tablets, different computers)
- ❌ Multiple peers (>2) can have connection issues

**STUN servers** help with NAT traversal (connecting through firewalls) but don't handle signaling (discovery and offer/answer exchange).

## Solution: WebSocket Signaling Server

A lightweight WebSocket server handles peer discovery and signaling, enabling:
- ✅ Cross-device connections (phone ↔ laptop ↔ tablet)
- ✅ Multiple peers (3, 4, 10+ peers in a room)
- ✅ Reliable connection establishment

## Setup Instructions

### Option 1: Local Development (Recommended)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the signaling server:**
   ```bash
   npm run signaling
   # Or: node signaling-server.js
   ```

3. **Start the web server (in another terminal):**
   ```bash
   python server.py
   # Or: node server.js
   ```

4. **Access the app:**
   - Open `http://localhost:8000` in your browser
   - The app will automatically try to connect to `ws://localhost:8080`

### Option 2: Deploy Signaling Server

Deploy `signaling-server.js` to a cloud service:

**Free Options:**
- **Glitch**: Upload and it runs automatically
- **Heroku**: Free tier with WebSocket support
- **Railway**: Free tier
- **Render**: Free tier

**Deployment example (Railway/Render):**
```bash
# Set PORT environment variable (they auto-assign)
# The server will use process.env.PORT
```

### Option 3: Use Public Signaling Server

You can use a public WebSocket server or deploy your own:

1. Deploy `signaling-server.js` to a cloud service
2. Update the WebSocket URL in the app:
   - Via URL parameter: `?ws=wss://your-server.com:8080`
   - Or set in localStorage: `localStorage.setItem('wisphergrid_ws_url', 'wss://your-server.com:8080')`

## How It Works

1. **User joins room** → Connects to WebSocket server
2. **Server broadcasts** → "User X joined" to all peers in room
3. **Peers discover each other** → Receive list of existing peers
4. **Direct WebRTC connection** → Peers connect directly (P2P)
5. **Server only used for signaling** → Once connected, all data is P2P

## Configuration

The app automatically tries:
1. WebSocket at `ws://your-host:8080` (or `wss://` for HTTPS)
2. Falls back to BroadcastChannel if WebSocket unavailable

### Custom WebSocket URL

Add to URL: `?ws=wss://your-server.com:8080`

Or set in browser console:
```javascript
localStorage.setItem('wisphergrid_ws_url', 'wss://your-server.com:8080');
```

## Troubleshooting

**"WebSocket unavailable" warning:**
- The signaling server isn't running
- Firewall blocking port 8080
- Wrong URL configured

**Cross-device still not working:**
- Make sure signaling server is accessible from both devices
- Check firewall/network settings
- Try using a public server URL

## Production Deployment

For production, you should:
1. Deploy signaling server to a reliable cloud service
2. Use WSS (secure WebSocket) for HTTPS sites
3. Add authentication/rate limiting to prevent abuse
4. Monitor server load and scale as needed

