# 🚀 VPS Deployment Checklist for Supabase Connectivity

## 📋 **Pre-Deployment Checklist**

### **✅ Environment Configuration**
- [ ] **Supabase Project Created**
  - [ ] Project URL obtained from Supabase dashboard
  - [ ] Anon public key obtained from API settings
  - [ ] Service role key obtained (for admin operations)
  - [ ] Database schema created and tables populated

- [ ] **Environment Variables Configured**
  ```bash
  VITE_SUPABASE_URL=https://your-project.supabase.co
  VITE_SUPABASE_ANON_KEY=your-actual-anon-key
  VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
  ```

- [ ] **Local Testing Completed**
  - [ ] Application runs locally with Supabase
  - [ ] Authentication works locally
  - [ ] Database operations work locally

### **✅ Network & Security**
- [ ] **VPS Network Configuration**
  - [ ] VPS has public IP address
  - [ ] VPS can reach external HTTPS endpoints (port 443)
  - [ ] No firewall blocking outbound HTTPS connections
  - [ ] DNS resolution working on VPS

- [ ] **Supabase Network Access**
  - [ ] VPS IP not blocked by Supabase
  - [ ] Supabase project allows external connections
  - [ ] No IP whitelist restrictions

### **✅ Domain & SSL**
- [ ] **Domain Configuration**
  - [ ] Domain points to VPS IP address
  - [ ] DNS propagation completed (can take up to 48 hours)
  - [ ] A record configured: `yourdomain.com` → `VPS_IP`

- [ ] **SSL Certificate**
  - [ ] Let's Encrypt certificate obtained
  - [ ] Certificate valid for your domain
  - [ ] Auto-renewal configured

---

## 🔧 **Deployment Steps**

### **Step 1: Prepare VPS Environment**
```bash
# Connect to VPS
ssh username@your-vps-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y curl wget git docker.io docker-compose
```

### **Step 2: Deploy Application**
```bash
# Clone repository
git clone https://github.com/meistericham/pcr_project_tracker.git
cd pcr_project_tracker

# Run deployment script
./deploy-vps.sh yourdomain.com admin@yourdomain.com
```

### **Step 3: Configure Supabase Environment**
```bash
# Edit production environment file
nano .env.production

# Update these values:
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-anon-key
VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### **Step 4: Validate Supabase Connection**
```bash
# Run validation script
./validate-supabase.sh

# Expected output: All tests should pass
```

### **Step 5: Rebuild and Restart**
```bash
# Rebuild with new environment variables
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🧪 **Post-Deployment Testing**

### **✅ Application Health Check**
- [ ] **Frontend Loading**
  - [ ] Application loads without errors
  - [ ] No console errors in browser
  - [ ] Supabase client initializes properly

- [ ] **Authentication Testing**
  - [ ] User can sign up
  - [ ] User can sign in
  - [ ] User can sign out
  - [ ] Session persists across page reloads

- [ ] **Database Operations**
  - [ ] Can create new records
  - [ ] Can read existing records
  - [ ] Can update records
  - [ ] Can delete records (if applicable)

### **✅ Network Connectivity Tests**
```bash
# Test from VPS
curl -s https://your-project.supabase.co/rest/v1/ -H "apikey: your-anon-key"

# Test from external
curl -s https://yourdomain.com/api/health

# Check Docker logs
docker-compose -f docker-compose.prod.yml logs -f pcr-tracker
```

### **✅ Performance Testing**
- [ ] **Response Times**
  - [ ] Page load < 3 seconds
  - [ ] API calls < 1 second
  - [ ] Database queries < 500ms

- [ ] **Concurrent Users**
  - [ ] Test with multiple browser tabs
  - [ ] Test with multiple users
  - [ ] Monitor resource usage

---

## 🚨 **Troubleshooting Common Issues**

### **Issue: Cannot Connect to Supabase**
```bash
# Check network connectivity
ping your-project.supabase.co

# Check DNS resolution
nslookup your-project.supabase.co

# Test HTTPS connection
curl -v https://your-project.supabase.co

# Check firewall rules
sudo ufw status
```

### **Issue: Authentication Fails**
```bash
# Check environment variables
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY

# Check Supabase project settings
# - Go to Supabase Dashboard → Auth → URL Configuration
# - Ensure Site URL matches your domain
# - Check redirect URLs configuration
```

### **Issue: Database Operations Fail**
```bash
# Check service role key
echo $VITE_SUPABASE_SERVICE_ROLE_KEY

# Test database connection
curl -s "https://your-project.supabase.co/rest/v1/users?select=count" \
  -H "apikey: $VITE_SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $VITE_SUPABASE_SERVICE_ROLE_KEY"

# Check RLS policies in Supabase
# - Go to Supabase Dashboard → Authentication → Policies
```

### **Issue: CORS Errors**
```bash
# Check Supabase CORS settings
# - Go to Supabase Dashboard → Settings → API
# - Ensure your domain is in allowed origins

# Check application CORS configuration
grep -r "CORS" .env.production
```

---

## 📊 **Monitoring & Maintenance**

### **✅ Health Monitoring**
```bash
# Create monitoring script
cat > monitor-supabase.sh << 'EOF'
#!/bin/bash
echo "=== Supabase Connection Status ==="

# Test basic connectivity
if curl -s --connect-timeout 10 "$VITE_SUPABASE_URL" > /dev/null; then
    echo "✅ Supabase URL accessible"
else
    echo "❌ Supabase URL not accessible"
fi

# Test API endpoint
API_RESPONSE=$(curl -s --connect-timeout 10 "$VITE_SUPABASE_URL/rest/v1/" \
    -H "apikey: $VITE_SUPABASE_ANON_KEY" \
    -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" 2>/dev/null || echo "ERROR")

if [[ "$API_RESPONSE" != *"ERROR"* ]]; then
    echo "✅ API endpoint working"
else
    echo "❌ API endpoint failed"
fi

# Check application health
if curl -s http://localhost/health > /dev/null; then
    echo "✅ Application responding"
else
    echo "❌ Application not responding"
fi
EOF

chmod +x monitor-supabase.sh

# Add to crontab for regular monitoring
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/pcr-tracker/monitor-supabase.sh >> /var/log/supabase-monitor.log") | crontab -
```

### **✅ Log Monitoring**
```bash
# Monitor application logs
docker-compose -f docker-compose.prod.yml logs -f pcr-tracker | grep -i supabase

# Monitor system logs
tail -f /var/log/syslog | grep -i docker

# Monitor nginx logs
tail -f logs/nginx/access.log
tail -f logs/nginx/error.log
```

### **✅ Backup & Recovery**
```bash
# Test backup script
./backup.sh

# Verify backup file
ls -la backups/

# Test restore (if needed)
# docker-compose -f docker-compose.prod.yml exec postgres psql -U pcr_user -d pcr_tracker_prod < backup_file.sql
```

---

## 🔒 **Security Considerations**

### **✅ Environment Security**
- [ ] **Secrets Management**
  - [ ] Environment variables not committed to git
  - [ ] Production keys different from development
  - [ ] Keys rotated regularly

- [ ] **Access Control**
  - [ ] VPS SSH access restricted
  - [ ] Docker containers not running as root
  - [ ] Firewall properly configured

### **✅ Supabase Security**
- [ ] **Project Settings**
  - [ ] Row Level Security (RLS) enabled
  - [ ] Appropriate policies configured
  - [ ] Service role key restricted access

- [ ] **Authentication**
  - [ ] Strong password policies
  - [ ] MFA enabled for admin users
  - [ ] Session timeout configured

---

## 📈 **Performance Optimization**

### **✅ Database Optimization**
```sql
-- Add indexes for better performance
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY idx_projects_status ON projects(status);
CREATE INDEX CONCURRENTLY idx_budget_entries_date ON budget_entries(date);

-- Monitor query performance
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;
```

### **✅ Application Optimization**
```bash
# Enable gzip compression in nginx
# Add to nginx.conf:
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

# Enable browser caching
# Add to nginx.conf:
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

---

## 🎯 **Success Metrics**

### **✅ Deployment Success Criteria**
- [ ] **All validation tests pass**
- [ ] **Application accessible via domain**
- [ ] **Supabase connection established**
- [ ] **Authentication working**
- [ ] **Database operations functional**
- [ ] **SSL certificate valid**
- [ ] **Performance within acceptable limits**

### **✅ Long-term Success Metrics**
- [ ] **Uptime > 99.9%**
- [ ] **Response time < 2 seconds**
- [ ] **Error rate < 1%**
- [ ] **Successful deployments > 95%**
- [ ] **Backup success rate > 99%**

---

## 🆘 **Emergency Procedures**

### **Issue: Complete Supabase Outage**
```bash
# 1. Check Supabase status page
# 2. Notify users of temporary unavailability
# 3. Monitor for service restoration
# 4. Test connectivity when service returns
```

### **Issue: VPS Network Problems**
```bash
# 1. Check VPS provider status
# 2. Verify network configuration
# 3. Test external connectivity
# 4. Contact VPS provider if needed
```

### **Issue: Application Crashes**
```bash
# 1. Check Docker container status
docker-compose -f docker-compose.prod.yml ps

# 2. Restart services
docker-compose -f docker-compose.prod.yml restart

# 3. Check logs for errors
docker-compose -f docker-compose.prod.yml logs -f

# 4. Rollback to previous version if needed
git checkout HEAD~1
docker-compose -f docker-compose.prod.yml up -d
```

---

## 📞 **Support Resources**

### **Documentation**
- [PCR Project Tracker Documentation](README.md)
- [VPS Deployment Guide](VPS_DEPLOYMENT_GUIDE.md)
- [Supabase Documentation](https://supabase.com/docs)

### **Community Support**
- [GitHub Issues](https://github.com/meistericham/pcr_project_tracker/issues)
- [Supabase Community](https://github.com/supabase/supabase/discussions)

### **Emergency Contacts**
- VPS Provider Support
- Supabase Support (if on paid plan)
- Development Team

---

## 🎉 **Congratulations!**

Once you've completed all the steps in this checklist, your PCR Project Tracker will be successfully deployed on VPS with full Supabase connectivity!

**Remember:**
- Monitor your application regularly
- Keep backups updated
- Stay informed about security updates
- Test your deployment regularly

**Your system is now ready for production use! 🚀**
