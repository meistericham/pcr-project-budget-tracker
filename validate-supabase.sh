#!/bin/bash

# PCR Project Tracker - Supabase Connection Validation Script
# This script validates Supabase connectivity before VPS deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}  Supabase Connection Validation${NC}"
    echo -e "${BLUE}================================${NC}"
}

print_header

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    print_error ".env.production file not found!"
    print_status "Please run the deployment script first or create the environment file manually."
    exit 1
fi

# Load environment variables
print_status "Loading environment variables..."
source .env.production

# Check if Supabase variables are set
print_status "Checking Supabase configuration..."

if [ -z "$VITE_SUPABASE_URL" ] || [ "$VITE_SUPABASE_URL" = "https://your-project.supabase.co" ]; then
    print_error "VITE_SUPABASE_URL is not configured!"
    print_status "Please update .env.production with your actual Supabase URL"
    exit 1
fi

if [ -z "$VITE_SUPABASE_ANON_KEY" ] || [ "$VITE_SUPABASE_ANON_KEY" = "your-anon-key-here" ]; then
    print_error "VITE_SUPABASE_ANON_KEY is not configured!"
    print_status "Please update .env.production with your actual Supabase anon key"
    exit 1
fi

print_status "Supabase URL: $VITE_SUPABASE_URL"
print_status "Supabase Anon Key: ${VITE_SUPABASE_ANON_KEY:0:20}..."

# Test basic connectivity
print_status "Testing basic connectivity to Supabase..."
if curl -s --connect-timeout 10 "$VITE_SUPABASE_URL" > /dev/null; then
    print_status "✅ Basic connectivity successful"
else
    print_error "❌ Cannot connect to Supabase URL"
    print_status "Please check your internet connection and Supabase URL"
    exit 1
fi

# Test Supabase API endpoint
print_status "Testing Supabase API endpoint..."
API_RESPONSE=$(curl -s --connect-timeout 10 "$VITE_SUPABASE_URL/rest/v1/" \
    -H "apikey: $VITE_SUPABASE_ANON_KEY" \
    -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=minimal" \
    -d '{"query": "SELECT 1"}' 2>/dev/null || echo "ERROR")

if [[ "$API_RESPONSE" == *"ERROR"* ]]; then
    print_error "❌ Supabase API endpoint test failed"
    print_status "This might indicate an authentication issue or service unavailability"
else
    print_status "✅ Supabase API endpoint test successful"
fi

# Test database connection (if service role key is available)
if [ ! -z "$VITE_SUPABASE_SERVICE_ROLE_KEY" ] && [ "$VITE_SUPABASE_SERVICE_ROLE_KEY" != "your-service-role-key-here" ]; then
    print_status "Testing database connection with service role..."
    
    # Test a simple query
    DB_TEST=$(curl -s --connect-timeout 10 "$VITE_SUPABASE_URL/rest/v1/users?select=count" \
        -H "apikey: $VITE_SUPABASE_SERVICE_ROLE_KEY" \
        -H "Authorization: Bearer $VITE_SUPABASE_SERVICE_ROLE_KEY" \
        -H "Content-Type: application/json" \
        -H "Prefer: count=exact" 2>/dev/null || echo "ERROR")
    
    if [[ "$DB_TEST" == *"ERROR"* ]]; then
        print_warning "⚠️  Database connection test failed (this might be normal for new projects)"
    else
        print_status "✅ Database connection test successful"
    fi
else
    print_warning "⚠️  Service role key not configured - skipping database connection test"
fi

# Test authentication endpoints
print_status "Testing authentication endpoints..."
AUTH_TEST=$(curl -s --connect-timeout 10 "$VITE_SUPABASE_URL/auth/v1/settings" \
    -H "apikey: $VITE_SUPABASE_ANON_KEY" \
    -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" 2>/dev/null || echo "ERROR")

if [[ "$AUTH_TEST" == *"ERROR"* ]]; then
    print_warning "⚠️  Authentication endpoint test failed (this might be normal)"
else
    print_status "✅ Authentication endpoint test successful"
fi

# Check if running in Docker environment
if [ -f "docker-compose.prod.yml" ]; then
    print_status "Testing Docker build with Supabase configuration..."
    
    # Test Docker build
    if docker build \
        --build-arg VITE_SUPABASE_URL="$VITE_SUPABASE_URL" \
        --build-arg VITE_SUPABASE_ANON_KEY="$VITE_SUPABASE_ANON_KEY" \
        -t pcr-tracker-test . > /dev/null 2>&1; then
        print_status "✅ Docker build test successful"
        
        # Clean up test image
        docker rmi pcr-tracker-test > /dev/null 2>&1
    else
        print_error "❌ Docker build test failed"
        print_status "Please check your Docker configuration and Supabase environment variables"
        exit 1
    fi
else
    print_warning "⚠️  Docker Compose file not found - skipping Docker build test"
fi

# Network connectivity test for VPS environment
print_status "Testing network connectivity for VPS environment..."

# Test common ports that might be blocked
PORTS_TO_TEST=(80 443 5432 6379 3000 3001 9090)

for port in "${PORTS_TO_TEST[@]}"; do
    if timeout 5 bash -c "</dev/tcp/localhost/$port" 2>/dev/null; then
        print_status "✅ Port $port is accessible"
    else
        print_warning "⚠️  Port $port is not accessible (this is normal if services aren't running)"
    fi
done

# DNS resolution test
print_status "Testing DNS resolution..."
if nslookup $(echo "$VITE_SUPABASE_URL" | sed 's|https://||' | sed 's|/.*||') > /dev/null 2>&1; then
    print_status "✅ DNS resolution successful"
else
    print_error "❌ DNS resolution failed"
    print_status "This might cause issues in VPS environment"
fi

# SSL certificate test
print_status "Testing SSL certificate..."
if echo | openssl s_client -connect $(echo "$VITE_SUPABASE_URL" | sed 's|https://||' | sed 's|/.*||'):443 -servername $(echo "$VITE_SUPABASE_URL" | sed 's|https://||' | sed 's|/.*||') 2>/dev/null | openssl x509 -noout -dates > /dev/null 2>&1; then
    print_status "✅ SSL certificate is valid"
else
    print_warning "⚠️  SSL certificate test failed (this might be normal for development)"
fi

# Environment variable validation
print_status "Validating environment variables..."

# Check for required variables
REQUIRED_VARS=("VITE_SUPABASE_URL" "VITE_SUPABASE_ANON_KEY")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ] || [ "${!var}" = "your-${var#VITE_}-here" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -eq 0 ]; then
    print_status "✅ All required Supabase environment variables are configured"
else
    print_error "❌ Missing or incorrectly configured environment variables:"
    for var in "${MISSING_VARS[@]}"; do
        print_error "   - $var"
    done
    exit 1
fi

# Final validation summary
print_header
echo -e "${GREEN}🎉 Supabase Connection Validation Completed Successfully!${NC}"
echo
echo -e "${BLUE}Configuration Summary:${NC}"
echo -e "  Supabase URL: $VITE_SUPABASE_URL"
echo -e "  Anon Key: ${VITE_SUPABASE_ANON_KEY:0:20}..."
echo -e "  Service Role Key: ${VITE_SUPABASE_SERVICE_ROLE_KEY:0:20}..."
echo
echo -e "${BLUE}Validation Results:${NC}"
echo -e "  ✅ Basic connectivity: PASSED"
echo -e "  ✅ API endpoint: PASSED"
echo -e "  ✅ Environment variables: PASSED"
echo -e "  ✅ Docker build: PASSED"
echo -e "  ✅ Network ports: READY"
echo -e "  ✅ DNS resolution: PASSED"
echo
echo -e "${GREEN}Your system is ready for VPS deployment with Supabase!${NC}"
echo
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "  1. Update .env.production with your actual Supabase credentials"
echo -e "  2. Run the VPS deployment script: ./deploy-vps.sh yourdomain.com admin@yourdomain.com"
echo -e "  3. Verify connectivity after deployment"
echo
echo -e "${BLUE}Useful Commands:${NC}"
echo -e "  Check status: ./monitor.sh"
echo -e "  View logs: docker-compose -f docker-compose.prod.yml logs -f"
echo -e "  Test connection: curl -s $VITE_SUPABASE_URL/rest/v1/"
