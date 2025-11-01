# WispherGrid Git Setup Script
# Run this after installing Git

Write-Host "=== WispherGrid GitHub Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check if Git is installed
try {
    $gitVersion = git --version
    Write-Host "✓ Git found: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Git is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Git from: https://git-scm.com/download/win" -ForegroundColor Yellow
    Write-Host "Then restart PowerShell and run this script again." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit
}

Write-Host ""

# Check if already a git repository
if (Test-Path .git) {
    Write-Host "⚠ Git repository already initialized" -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") { exit }
} else {
    Write-Host "Initializing Git repository..." -ForegroundColor Cyan
    git init
    Write-Host "✓ Repository initialized" -ForegroundColor Green
}

Write-Host ""
Write-Host "Adding files..." -ForegroundColor Cyan
git add .
Write-Host "✓ Files added" -ForegroundColor Green

Write-Host ""
$commitMsg = Read-Host "Enter commit message (or press Enter for default)"
if ([string]::IsNullOrWhiteSpace($commitMsg)) {
    $commitMsg = "Initial commit: WispherGrid - Peer-to-peer WebRTC chat app"
}

Write-Host "Creating commit..." -ForegroundColor Cyan
git commit -m $commitMsg

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Commit created successfully!" -ForegroundColor Green
} else {
    Write-Host "✗ Commit failed. Check git config:" -ForegroundColor Red
    Write-Host "  git config --global user.name 'Your Name'" -ForegroundColor Yellow
    Write-Host "  git config --global user.email 'your.email@example.com'" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit
}

Write-Host ""
Write-Host "=== Next Steps ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Create a new repository on GitHub:" -ForegroundColor White
Write-Host "   https://github.com/new" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. DO NOT initialize with README, .gitignore, or license" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. After creating the repo, run these commands:" -ForegroundColor White
Write-Host ""
Write-Host "   git remote add origin https://github.com/YOUR_USERNAME/WispherGrid.git" -ForegroundColor Cyan
Write-Host "   git branch -M main" -ForegroundColor Cyan
Write-Host "   git push -u origin main" -ForegroundColor Cyan
Write-Host ""
Write-Host "For detailed instructions, see: GITHUB_SETUP.md" -ForegroundColor Gray
Write-Host ""

Read-Host "Press Enter to exit"

