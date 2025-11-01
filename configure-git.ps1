# Quick Git Configuration Script
Write-Host "=== Git Configuration ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Please provide your Git information:" -ForegroundColor Yellow
Write-Host "(This is used for commit attribution)" -ForegroundColor Gray
Write-Host ""

$name = Read-Host "Enter your name (e.g., John Doe)"
$email = Read-Host "Enter your email (e.g., john@example.com)"

if ($name -and $email) {
    git config --global user.name $name
    git config --global user.email $email
    
    Write-Host ""
    Write-Host "✓ Git configured successfully!" -ForegroundColor Green
    Write-Host "  Name: $name" -ForegroundColor Gray
    Write-Host "  Email: $email" -ForegroundColor Gray
    Write-Host ""
    Write-Host "You can now run the commit command:" -ForegroundColor Yellow
    Write-Host "  git commit -m 'Initial commit: WispherGrid'" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "Configuration cancelled." -ForegroundColor Red
}

Read-Host "Press Enter to exit"

