#!/bin/bash

# Deploy admin-create-user Edge Function
# This script deploys the function without JWT verification for admin operations

echo "🚀 Deploying admin-create-user Edge Function..."

# Deploy the function
supabase functions deploy admin-create-user --no-verify-jwt

echo "✅ admin-create-user function deployed successfully!"
echo "📋 Function URL: https://$(supabase status --output json | jq -r '.project_ref').functions.supabase.co/admin-create-user"
echo "🔒 Note: Function deployed with --no-verify-jwt for admin operations"
