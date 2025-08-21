#!/bin/bash

# Deploy invite-user Edge Function
# This script deploys the Edge Function that handles user invitations

set -e

echo "🚀 Deploying invite-user Edge Function..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Error: supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if function directory exists
if [ ! -d "supabase/functions/invite-user" ]; then
    echo "❌ Error: invite-user function directory not found"
    exit 1
fi

echo "📁 Function directory found: supabase/functions/invite-user"

# Deploy the function
echo "📤 Deploying function..."
supabase functions deploy invite-user --no-verify-jwt

if [ $? -eq 0 ]; then
    echo "✅ invite-user function deployed successfully!"
    echo ""
    echo "🔧 Next steps:"
    echo "1. Set environment variables in Supabase dashboard:"
    echo "   - SUPABASE_URL"
    echo "   - SUPABASE_SERVICE_ROLE_KEY"
    echo "   - SITE_URL (optional, for custom redirect URLs)"
    echo ""
    echo "2. Test the function:"
    echo "   - Login as super_admin"
    echo "   - Try to invite a new user"
    echo "   - Check Network tab for /functions/v1/invite-user calls"
    echo ""
    echo "3. Verify in Supabase dashboard:"
    echo "   - Auth → Users (should see invited users)"
    echo "   - Database → users (should see profile rows)"
else
    echo "❌ Function deployment failed"
    exit 1
fi
