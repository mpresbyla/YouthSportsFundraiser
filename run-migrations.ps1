# PowerShell script to run Supabase migrations on Windows
Write-Host "Supabase Database Migration Script" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan

# Check Supabase CLI
Write-Host "Checking for Supabase CLI..." -ForegroundColor Yellow
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Install Supabase CLI with: npm install -g supabase" -ForegroundColor Red
    exit 1
}

Write-Host "Logged in to Supabase" -ForegroundColor Green
Write-Host "Enter your project reference:" -ForegroundColor Yellow
$projectRef = Read-Host

supabase link --project-ref $projectRef
supabase db push

Write-Host "Migration completed!" -ForegroundColor Green
