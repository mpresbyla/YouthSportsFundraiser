#!/bin/bash

# Automated Supabase Deployment Script
# This script deploys the entire Youth Sports Fundraiser platform to Supabase

set -e  # Exit on error

echo "🚀 Youth Sports Fundraiser - Supabase Deployment"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI is not installed${NC}"
    echo "Install it with: npm install -g supabase"
    exit 1
fi

echo -e "${GREEN}✓ Supabase CLI found${NC}"
echo ""

# Check if logged in to Supabase
if ! supabase projects list &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Supabase${NC}"
    echo "Logging in..."
    supabase login
fi

echo -e "${GREEN}✓ Logged in to Supabase${NC}"
echo ""

# List projects and ask user to select or create
echo "📋 Your Supabase Projects:"
supabase projects list

echo ""
echo "Do you want to:"
echo "1) Link to existing project"
echo "2) Create new project"
read -p "Enter choice (1 or 2): " choice

if [ "$choice" == "2" ]; then
    read -p "Enter project name: " project_name
    read -p "Enter database password: " db_password
    read -p "Enter region (default: us-east-1): " region
    region=${region:-us-east-1}
    
    echo ""
    echo "Creating new Supabase project..."
    supabase projects create "$project_name" --db-password "$db_password" --region "$region"
    
    # Get project ref
    project_ref=$(supabase projects list | grep "$project_name" | awk '{print $3}')
    
    echo ""
    echo "Linking to project..."
    supabase link --project-ref "$project_ref"
else
    read -p "Enter project ref (from list above): " project_ref
    echo ""
    echo "Linking to project..."
    supabase link --project-ref "$project_ref"
fi

echo -e "${GREEN}✓ Project linked${NC}"
echo ""

# Run database migrations
echo "📦 Running database migrations..."
echo ""

echo "  1/4 Initial schema (19 tables)..."
supabase db push

echo -e "${GREEN}  ✓ Initial schema created${NC}"
echo ""

echo "  2/4 Helper functions..."
# Migrations are already in supabase/migrations/ directory
echo -e "${GREEN}  ✓ Helper functions created${NC}"
echo ""

echo "  3/4 Stripe Wrapper setup..."
echo -e "${YELLOW}  ⚠️  You need to manually enable Wrappers extension${NC}"
echo "     1. Go to Database → Extensions in Supabase dashboard"
echo "     2. Enable 'Supabase Wrappers'"
echo "     3. Go to Settings → Vault"
echo "     4. Create secret: name='stripe_secret_key', value='your_stripe_key'"
read -p "Press Enter after completing these steps..."

echo ""
echo "  4/4 Stripe analytics..."
echo -e "${GREEN}  ✓ All migrations complete${NC}"
echo ""

# Set environment secrets
echo "🔐 Setting environment secrets..."
echo ""

read -p "Enter your Stripe Secret Key: " stripe_secret
read -p "Enter your Stripe Publishable Key: " stripe_pub
read -p "Enter your Stripe Webhook Secret: " stripe_webhook

supabase secrets set STRIPE_SECRET_KEY="$stripe_secret"
supabase secrets set STRIPE_PUBLISHABLE_KEY="$stripe_pub"
supabase secrets set STRIPE_WEBHOOK_SECRET="$stripe_webhook"

echo -e "${GREEN}✓ Secrets configured${NC}"
echo ""

# Deploy Edge Functions
echo "☁️  Deploying Edge Functions..."
echo ""

functions=("auth" "leagues" "teams" "fundraisers" "payments" "payments-v2" "templates")

for func in "${functions[@]}"; do
    if [ -d "supabase/functions/$func" ]; then
        echo "  Deploying $func..."
        supabase functions deploy "$func" --no-verify-jwt
        echo -e "${GREEN}  ✓ $func deployed${NC}"
    fi
done

echo ""
echo -e "${GREEN}✓ All Edge Functions deployed${NC}"
echo ""

# Get project details
echo "📊 Deployment Summary:"
echo "===================="
echo ""

project_url=$(supabase status | grep "API URL" | awk '{print $3}')
anon_key=$(supabase status | grep "anon key" | awk '{print $3}')

echo -e "${GREEN}✓ Deployment Complete!${NC}"
echo ""
echo "🌐 Your Supabase Project:"
echo "   URL: $project_url"
echo "   Anon Key: $anon_key"
echo ""
echo "📝 Next Steps:"
echo "   1. Update your Netlify environment variables with these values"
echo "   2. Deploy frontend to Netlify"
echo "   3. Configure Stripe webhook URL: $project_url/functions/v1/payments-v2?action=webhook"
echo ""
echo "📚 Documentation:"
echo "   - SUPABASE_DEPLOYMENT_GUIDE.md"
echo "   - STRIPE_WRAPPER_GUIDE.md"
echo "   - SUPABASE_README.md"
echo ""
echo "🎉 Happy fundraising!"
