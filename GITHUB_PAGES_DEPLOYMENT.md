# GitHub Pages Deployment Guide

## Understanding the Setup

### What GitHub Pages Provides
✅ **Static File Hosting** - GitHub Pages automatically serves your HTML, CSS, and JavaScript files
✅ **HTTPS** - Free SSL certificate
✅ **Custom Domain** - Optional custom domain support

### What GitHub Pages CANNOT Do
❌ **Run Python/Node.js servers** - No server-side code execution
❌ **WebSocket servers** - Cannot run `signaling-server.js` directly

## File Servers (server.py/server.js) - Local Development Only

**You DON'T need these for GitHub Pages!**

- `server.py` and `server.js` are only for **local development**
- They solve the CORS issue when testing on `file://` protocol
- **GitHub Pages already serves your files**, so these aren't needed in production

**What to do:** Keep them in the repo for local development, but you don't need to deploy them anywhere.

## Signaling Server - Separate Deployment Needed

For **cross-device connections**, you need to deploy `signaling-server.js` separately.

### Option 1: Free Deployment Services (Recommended)

#### A. Render (Easiest - Recommended)

1. **Go to:** https://render.com
2. **Sign up** (free account)
3. **Click:** "New" → "Web Service"
4. **Connect your GitHub repository**
5. **Settings:**
   - **Build Command:** `npm install`
   - **Start Command:** `node signaling-server.js`
   - **Environment:** Node
6. **Deploy!**

Render will give you a URL like: `wss://your-app.onrender.com`

**Free tier:** 750 hours/month (enough for most use cases)

#### B. Railway

1. **Go to:** https://railway.app
2. **Sign up** (GitHub login)
3. **New Project** → "Deploy from GitHub repo"
4. **Select your repo**
5. **Settings:**
   - **Root Directory:** `/` (root)
   - **Start Command:** `node signaling-server.js`
6. **Deploy!**

#### C. Fly.io

1. **Install Fly CLI:** https://fly.io/docs/getting-started/installing-flyctl/
2. **Login:** `fly auth login`
3. **Deploy:**
   ```bash
   fly launch
   ```
4. **Follow prompts** (select Node.js, use `node signaling-server.js` as start command)

### Option 2: Manual Server Setup

If you have a VPS or server:

1. **SSH into your server**
2. **Clone repo:**
   ```bash
   git clone https://github.com/fluratech/WispherGrid.git
   cd WispherGrid
   ```
3. **Install dependencies:**
   ```bash
   npm install
   ```
4. **Run with PM2 (keeps it running):**
   ```bash
   npm install -g pm2
   pm2 start signaling-server.js --name wisphergrid-signaling
   pm2 save
   ```
5. **Set up reverse proxy** (Nginx) to forward WebSocket connections

### Option 3: Use Public WebSocket Test Server (Development Only)

For quick testing, you can temporarily use a public WebSocket echo server, but it won't work properly for signaling. Better to deploy your own.

## Configuration

After deploying the signaling server, update the app to use it:

### Method 1: URL Parameter (Easiest)

Add to your GitHub Pages URL:
```
https://fluratech.github.io/WispherGrid/?ws=wss://your-signaling-server.com
```

### Method 2: Update Code (Permanent)

Edit `js/room-manager.js` - change `getSignalingServerUrl()`:

```javascript
getSignalingServerUrl() {
    // Replace with your deployed signaling server URL
    return 'wss://your-signaling-server.com';
    // Remove the auto-detect code
}
```

### Method 3: Browser Console

Users can set it in their browser:
```javascript
localStorage.setItem('wisphergrid_ws_url', 'wss://your-signaling-server.com');
```

## Complete Setup Example

### Step 1: Deploy Signaling Server (Render)

1. Create account on Render.com
2. New Web Service → Connect GitHub → Select WispherGrid
3. Build: `npm install`
4. Start: `node signaling-server.js`
5. Get URL: `wss://wisphergrid-signaling.onrender.com`

### Step 2: Update GitHub Pages App

Edit `js/room-manager.js` line ~95:

```javascript
getSignalingServerUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const customUrl = urlParams.get('ws') || localStorage.getItem('wisphergrid_ws_url');
    
    if (customUrl) {
        return customUrl;
    }

    // Default to your deployed signaling server
    return 'wss://wisphergrid-signaling.onrender.com';
}
```

### Step 3: Commit and Push

```bash
git add js/room-manager.js
git commit -m "Set default signaling server URL"
git push origin main
```

### Step 4: Test

1. Open GitHub Pages: `https://fluratech.github.io/WispherGrid`
2. Join a room on phone
3. Join same room on laptop
4. They should connect! ✅

## Troubleshooting

**"WebSocket unavailable" warning:**
- Signaling server not running
- Wrong URL configured
- Firewall blocking WebSocket

**Still using BroadcastChannel:**
- Check browser console for WebSocket errors
- Verify signaling server URL is correct
- Make sure signaling server is accessible

## Summary

- ✅ **GitHub Pages:** Hosts your static files (HTML/CSS/JS) - Already done!
- ✅ **Signaling Server:** Deploy separately (Render/Railway/etc.) - You need this for cross-device
- ❌ **File Servers:** Only for local development - Not needed for GitHub Pages

Your GitHub Pages site: `https://fluratech.github.io/WispherGrid`
Your signaling server: `wss://your-deployed-server.com` (deploy separately)

