#!/bin/bash

# PCR Project Tracker - VPS Deployment Script
# This script automates the deployment of PCR Tracker on a VPS server

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
    echo -e "${BLUE}  PCR Project Tracker VPS Setup${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Configuration
DOMAIN=${1:-"yourdomain.com"}
EMAIL=${2:-"admin@yourdomain.com"}
DB_PASSWORD=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 64)

print_header

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root"
   exit 1
fi

# Update system
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install required packages
print_status "Installing required packages..."
sudo apt install -y \
    curl \
    wget \
    git \
    unzip \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    ufw \
    fail2ban \
    nginx \
    certbot \
    python3-certbot-nginx

# Install Docker
print_status "Installing Docker..."
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
print_status "Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create application directory
print_status "Creating application directory..."
sudo mkdir -p /opt/pcr-tracker
sudo chown $USER:$USER /opt/pcr-tracker
cd /opt/pcr-tracker

# Clone repository (if not already present)
if [ ! -d ".git" ]; then
    print_status "Cloning PCR Tracker repository..."
    git clone https://github.com/meistericham/pcr_project_tracker.git .
fi

# Create production environment file
print_status "Creating production environment file..."
cat > .env.production << EOF
# Production Environment Variables
NODE_ENV=production
VITE_APP_NAME=PCR Project Tracker
VITE_APP_VERSION=1.0.0

# Database Configuration
POSTGRES_DB=pcr_tracker_prod
POSTGRES_USER=pcr_user
POSTGRES_PASSWORD=$DB_PASSWORD
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

# Supabase Configuration (REQUIRED for production)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Security
JWT_SECRET=$JWT_SECRET
SESSION_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)

# Redis Configuration
REDIS_PASSWORD=$REDIS_PASSWORD

# Email Configuration (update these with your email service)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@$DOMAIN

# Server Configuration
PORT=3000
HOST=0.0.0.0
CORS_ORIGIN=https://$DOMAIN

# Backup Configuration
BACKUP_PATH=/opt/pcr-tracker/backups
BACKUP_RETENTION_DAYS=30

# Monitoring
GRAFANA_PASSWORD=$(openssl rand -base64 16)
EOF

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p {logs,backups,uploads,nginx/ssl,monitoring}

# Generate self-signed SSL certificate (temporary)
print_status "Generating temporary SSL certificate..."
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout nginx/ssl/key.pem \
    -out nginx/ssl/cert.pem \
    -subj "/C=MY/ST=State/L=City/O=Organization/CN=$DOMAIN"

# Configure firewall
print_status "Configuring firewall..."
sudo ufw --force enable
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp

# Configure fail2ban
print_status "Configuring fail2ban..."
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Create systemd service for auto-start
print_status "Creating systemd service..."
sudo tee /etc/systemd/system/pcr-tracker.service > /dev/null << EOF
[Unit]
Description=PCR Project Tracker
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/pcr-tracker
ExecStart=/usr/local/bin/docker-compose -f docker-compose.prod.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.prod.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the service
sudo systemctl enable pcr-tracker.service

# Create backup script
print_status "Creating backup script..."
cat > backup.sh << 'EOF'
#!/bin/bash
# PCR Tracker Backup Script

BACKUP_DIR="/opt/pcr-tracker/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="pcr_tracker_backup_$DATE.sql"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Backup database
docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump -U pcr_user pcr_tracker_prod > $BACKUP_DIR/$BACKUP_FILE

# Compress backup
gzip $BACKUP_DIR/$BACKUP_FILE

# Remove old backups (keep last 30 days)
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR/$BACKUP_FILE.gz"
EOF

chmod +x backup.sh

# Create monitoring script
print_status "Creating monitoring script..."
cat > monitor.sh << 'EOF'
#!/bin/bash
# PCR Tracker Monitoring Script

echo "=== PCR Tracker System Status ==="
echo

# Check Docker containers
echo "Docker Containers:"
docker-compose -f docker-compose.prod.yml ps
echo

# Check disk usage
echo "Disk Usage:"
df -h /opt/pcr-tracker
echo

# Check memory usage
echo "Memory Usage:"
free -h
echo

# Check system load
echo "System Load:"
uptime
echo

# Check application health
echo "Application Health:"
curl -s http://localhost/health || echo "Application not responding"
echo

# Check database connections
echo "Database Connections:"
docker-compose -f docker-compose.prod.yml exec postgres psql -U pcr_user -d pcr_tracker_prod -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null || echo "Database not accessible"
EOF

chmod +x monitor.sh

# Create update script
print_status "Creating update script..."
cat > update.sh << 'EOF'
#!/bin/bash
# PCR Tracker Update Script

set -e

echo "Updating PCR Tracker..."

# Pull latest changes
git pull origin main

# Rebuild and restart containers
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

echo "Update completed successfully!"
EOF

chmod +x update.sh

# Start the application
print_status "Starting PCR Tracker..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to start
print_status "Waiting for services to start..."
sleep 30

# Check if services are running
print_status "Checking service status..."
docker-compose -f docker-compose.prod.yml ps

# Setup SSL certificate with Let's Encrypt
print_status "Setting up SSL certificate..."
if [ "$DOMAIN" != "yourdomain.com" ]; then
    # Stop nginx temporarily
    docker-compose -f docker-compose.prod.yml stop nginx
    
    # Get SSL certificate
    sudo certbot certonly --standalone -d $DOMAIN -d www.$DOMAIN --email $EMAIL --agree-tos --non-interactive
    
    # Copy certificates
    sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem nginx/ssl/cert.pem
    sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem nginx/ssl/key.pem
    sudo chown $USER:$USER nginx/ssl/*
    
    # Start nginx
    docker-compose -f docker-compose.prod.yml start nginx
    
    # Setup automatic renewal
    (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet && docker-compose -f /opt/pcr-tracker/docker-compose.prod.yml restart nginx") | crontab -
fi

# Setup automatic backups
print_status "Setting up automatic backups..."
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/pcr-tracker/backup.sh") | crontab -

# Create admin user
print_status "Creating admin user..."
cat > create-admin.sh << 'EOF'
#!/bin/bash
# Create admin user in the database

docker-compose -f docker-compose.prod.yml exec postgres psql -U pcr_user -d pcr_tracker_prod << 'SQL'
INSERT INTO users (id, name, email, role, initials, created_at) 
VALUES (
    gen_random_uuid(),
    'Admin User',
    'admin@yourdomain.com',
    'super_admin',
    'AU',
    NOW()
) ON CONFLICT (email) DO NOTHING;
SQL
EOF

chmod +x create-admin.sh

# Final status check
print_status "Performing final status check..."
./monitor.sh

print_header
echo -e "${GREEN}🎉 PCR Project Tracker has been successfully deployed!${NC}"
echo
echo -e "${BLUE}Access URLs:${NC}"
echo -e "  Main Application: https://$DOMAIN"
echo -e "  Monitoring Dashboard: https://$DOMAIN:3001"
echo -e "  Prometheus Metrics: https://$DOMAIN:9090"
echo
echo -e "${BLUE}Default Credentials:${NC}"
echo -e "  Email: admin@yourdomain.com"
echo -e "  Password: admin123 (change this immediately!)"
echo
echo -e "${BLUE}Important Files:${NC}"
echo -e "  Environment: /opt/pcr-tracker/.env.production"
echo -e "  Logs: /opt/pcr-tracker/logs/"
echo -e "  Backups: /opt/pcr-tracker/backups/"
echo
echo -e "${BLUE}Useful Commands:${NC}"
echo -e "  Check status: ./monitor.sh"
echo -e "  Create backup: ./backup.sh"
echo -e "  Update application: ./update.sh"
echo -e "  View logs: docker-compose -f docker-compose.prod.yml logs -f"
echo
echo -e "${YELLOW}⚠️  IMPORTANT:${NC}"
echo -e "  1. Change default passwords in .env.production"
echo -e "  2. Update email configuration"
echo -e "  3. Configure your domain DNS"
echo -e "  4. Set up monitoring alerts"
echo -e "  5. Test backup and restore procedures"
echo
echo -e "${GREEN}Deployment completed successfully!${NC}"
