# Windows Setup Guide

Complete guide for setting up the Youth Sports Fundraiser platform on Windows.

## Prerequisites

### 1. Install Required Software

**Node.js 18+**
- Download from: https://nodejs.org
- Choose LTS version
- Verify installation: `node --version`

**Git for Windows**
- Download from: https://git-scm.com/download/win
- Includes Git Bash (needed for bash scripts)
- Verify installation: `git --version`

**pnpm Package Manager**
```powershell
npm install -g pnpm
```

**Supabase CLI** (Optional but recommended)
```powershell
npm install -g supabase
```

### 2. Clone Repository

```powershell
# Authenticate with GitHub (repo is private)
gh auth login

# Clone the repository
gh repo clone mpresbyla/YouthSportsFundraiser
cd YouthSportsFundraiser
```

## Quick Start

### Step 1: Install Dependencies

```powershell
pnpm install
```

### Step 2: Set Up Supabase (Recommended)

Open **Git Bash** (not PowerShell) and run:
```bash
./deploy-supabase.sh
```

This will output your database credentials.

### Step 3: Configure Environment

Create a `.env` file in the project root with your Supabase credentials.

### Step 4: Start Development Server

```powershell
pnpm dev
```

Open http://localhost:3000

## Common Issues

### Issue: "NODE_ENV is not recognized"

**Fixed!** The project now uses `cross-env` for Windows compatibility.

### Issue: "./deploy-supabase.sh" doesn't work in PowerShell

Use **Git Bash** instead:
1. Right-click in folder → "Git Bash Here"
2. Run: `./deploy-supabase.sh`

### Issue: "Port 3000 already in use"

Find and kill the process:
```powershell
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F
```

## Development Commands

```powershell
# Start development server
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test

# Type checking
pnpm check

# Format code
pnpm format
```

## VS Code Recommended Extensions

1. **ESLint** - Code linting
2. **Prettier** - Code formatting
3. **Tailwind CSS IntelliSense** - Tailwind autocomplete
4. **Error Lens** - Inline error display

## Next Steps

1. Create your first league
2. Add teams
3. Create fundraisers
4. Test payment flow

See other documentation files for deployment guides.
