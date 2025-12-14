# PowerShell script to run database migrations
# Run this in PowerShell from your project directory

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Youth Sports Fundraiser - Database Migration" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "ERROR: .env file not found!" -ForegroundColor Red
    Write-Host "Please copy .env.corrected to .env first" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Run this command:" -ForegroundColor Yellow
    Write-Host "  copy .env.corrected .env" -ForegroundColor White
    exit 1
}

Write-Host "Step 1: Checking pnpm installation..." -ForegroundColor Yellow
$pnpmVersion = pnpm --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: pnpm not found. Installing pnpm..." -ForegroundColor Red
    npm install -g pnpm
}
Write-Host "✓ pnpm is installed (version: $pnpmVersion)" -ForegroundColor Green
Write-Host ""

Write-Host "Step 2: Installing dependencies..." -ForegroundColor Yellow
pnpm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Dependencies installed" -ForegroundColor Green
Write-Host ""

Write-Host "Step 3: Running database migrations..." -ForegroundColor Yellow
Write-Host "This will create all tables in your Supabase database" -ForegroundColor Cyan
pnpm db:push
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Migration failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "1. Check your DATABASE_URL in .env has %26 instead of &" -ForegroundColor White
    Write-Host "2. Verify your Supabase password is correct" -ForegroundColor White
    Write-Host "3. Make sure your Supabase project is active" -ForegroundColor White
    exit 1
}
Write-Host "✓ Migrations completed successfully!" -ForegroundColor Green
Write-Host ""

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "SUCCESS! Database is ready" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Start the dev server: pnpm dev" -ForegroundColor White
Write-Host "2. Open http://localhost:3000" -ForegroundColor White
Write-Host "3. Register a new account or login" -ForegroundColor White
Write-Host ""
