#!/bin/bash

# Deploy Supabase Edge Functions with proper environment configuration
# Usage: ./scripts/deploy-functions.sh [production|staging|local]

ENV=${1:-production}
echo "Deploying Supabase Edge Functions for environment: $ENV"

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "Error: Supabase CLI is not installed"
    echo "Install it from: https://supabase.com/docs/guides/cli"
    exit 1
fi

# Set environment variables based on environment
if [ "$ENV" = "production" ]; then
    echo "Setting production environment variables..."
    
    # Set CORS and environment variables
    supabase secrets set ENVIRONMENT=production
    supabase secrets set SITE_URL=https://iownmyfuture.ai
    
    # Note: ALLOWED_ORIGINS is handled in the code, not as an env var
    echo "Production environment variables set."
    
elif [ "$ENV" = "staging" ]; then
    echo "Setting staging environment variables..."
    supabase secrets set ENVIRONMENT=staging
    supabase secrets set SITE_URL=https://staging.iownmyfuture.ai
    
elif [ "$ENV" = "local" ]; then
    echo "Using local development settings..."
    # Local development doesn't need secrets
fi

# Deploy the functions
echo "Deploying stripe-prices function..."
supabase functions deploy stripe-prices --no-verify-jwt

echo "Deploying get-stripe-session function..."
supabase functions deploy get-stripe-session --no-verify-jwt

echo "Deploying stripe-webhook function..."
supabase functions deploy stripe-webhook

echo "Deploying create-checkout function..."
supabase functions deploy create-checkout

echo "Deployment complete!"
echo ""
echo "To view function logs, run:"
echo "  supabase functions logs --name stripe-prices"
echo ""
echo "To verify deployment, run:"
echo "  supabase functions list"