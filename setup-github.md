# Setting Up GitHub Repository for WispherGrid

## Step 1: Install Git (if not installed)

1. Download Git from: https://git-scm.com/download/win
2. Run the installer with default settings
3. Restart your terminal/PowerShell after installation

## Step 2: Configure Git (first time only)

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## Step 3: Initialize Git Repository

Open PowerShell in the WispherGrid folder and run:

```bash
# Initialize git repository
git init

# Add all files
git add .

# Make first commit
git commit -m "Initial commit: WispherGrid - Peer-to-peer WebRTC chat app"
```

## Step 4: Create GitHub Repository

### Option A: Using GitHub Website

1. Go to https://github.com/new
2. Repository name: `WispherGrid` (or any name you prefer)
3. Description: "Peer-to-peer WebRTC communication app"
4. Choose Public or Private
5. **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

### Option B: Using GitHub CLI (if installed)

```bash
gh repo create WispherGrid --public --source=. --remote=origin --push
```

## Step 5: Connect and Push to GitHub

After creating the repository on GitHub, run these commands:

```bash
# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/WispherGrid.git

# Or if you prefer SSH (requires SSH key setup)
# git remote add origin git@github.com:YOUR_USERNAME/WispherGrid.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 6: Verify

Visit your repository on GitHub: `https://github.com/YOUR_USERNAME/WispherGrid`

## Enable GitHub Pages (Optional - to host the app)

1. Go to your repository Settings
2. Click "Pages" in the left sidebar
3. Under "Source", select "main" branch and "/ (root)" folder
4. Click "Save"
5. Your app will be available at: `https://YOUR_USERNAME.github.io/WispherGrid/`

## Quick Start Script

If you prefer, you can create a PowerShell script to automate the setup:

```powershell
# Save as setup-git.ps1
git init
git add .
git commit -m "Initial commit: WispherGrid"
Write-Host "Repository initialized! Now create a repo on GitHub and run:"
Write-Host "git remote add origin https://github.com/YOUR_USERNAME/WispherGrid.git"
Write-Host "git push -u origin main"
```

