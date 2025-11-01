# GitHub Setup Instructions

Follow these steps to push WispherGrid to GitHub.

## Step 1: Install Git

If Git is not installed:

1. Download from: https://git-scm.com/download/win
2. Install with default options
3. **Restart PowerShell/Terminal** after installation

## Step 2: Configure Git (First Time Only)

Open PowerShell and run:

```powershell
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## Step 3: Initialize and Commit

In the WispherGrid folder, run:

```powershell
# Initialize git
git init

# Add all files
git add .

# Create first commit
git commit -m "Initial commit: WispherGrid - Peer-to-peer WebRTC chat app"
```

## Step 4: Create GitHub Repository

### Method A: GitHub Website (Recommended)

1. Go to https://github.com/new
2. Repository name: `WispherGrid` (or your preferred name)
3. Description: "Peer-to-peer WebRTC communication app - serverless and decentralized"
4. Choose **Public** or **Private**
5. **IMPORTANT**: Do NOT check "Add a README file" or any other options
6. Click **"Create repository"**

### Method B: GitHub CLI (if you have `gh` installed)

```powershell
gh repo create WispherGrid --public --source=. --remote=origin --push
```

## Step 5: Connect and Push

After creating the repo, GitHub will show you commands. Run these:

```powershell
# Add remote (replace YOUR_USERNAME with your actual GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/WispherGrid.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

You'll be prompted for your GitHub username and password/token.

### Using Personal Access Token

If asked for a password, use a GitHub Personal Access Token:

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Give it a name, select `repo` scope
4. Copy the token and use it as your password when pushing

## Step 6: Verify

Visit your repository: `https://github.com/YOUR_USERNAME/WispherGrid`

## Optional: Enable GitHub Pages

Host your app for free on GitHub Pages:

1. Go to repository **Settings** → **Pages**
2. Source: Select `main` branch and `/ (root)` folder
3. Click **Save**
4. Your app will be live at: `https://YOUR_USERNAME.github.io/WispherGrid/`

## Troubleshooting

### "git is not recognized"
- Git is not installed or not in PATH
- Reinstall Git and restart terminal

### "Permission denied"
- Check your GitHub credentials
- Use Personal Access Token instead of password

### "Repository not found"
- Verify the repository name and your username are correct
- Make sure the repository exists on GitHub

## Quick One-Liner Setup (After Git Installation)

```powershell
git init && git add . && git commit -m "Initial commit" && Write-Host "Now create repo on GitHub and run: git remote add origin https://github.com/USERNAME/WispherGrid.git && git push -u origin main"
```

