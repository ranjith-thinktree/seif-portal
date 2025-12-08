# SEIF Portal - Server Requirements Document

**Project:** SEIF Training Center Management Portal  
**Document Version:** 1.0  
**Date:** November 11, 2025  
**Prepared For:** Client  
**Prepared By:** Development Team

---

## 📋 Executive Summary

This document outlines the server infrastructure, third-party services, and credentials required to deploy and run the SEIF Portal application.

---

## 🖥️ Server Requirements

### 1. Application Server (Backend + Frontend)

#### Minimum Requirements:

- **CPU:** 2 vCPUs (4 vCPUs recommended)
- **RAM:** 4 GB (8 GB recommended)
- **Storage:** 50 GB SSD
- **OS:** Ubuntu 22.04 LTS or Amazon Linux 2023
- **Network:** Static IP address with public access

#### Software Stack:

- **Node.js:** Version 18.x or higher
- **MySQL:** Version 8.0 or higher
- **Redis:** Version 6.x or higher (for background jobs)
- **Nginx/Apache:** For reverse proxy and SSL
- **PM2:** For Node.js process management

#### Recommended Cloud Providers:

- AWS EC2 (t3.medium or higher)
- Azure Virtual Machines (B2s or higher)
- Google Cloud Compute Engine (e2-medium or higher)
- DigitalOcean Droplet ($24/month plan or higher)

---

## 💾 Database Server

### MySQL Database

#### Option A: Managed Database (Recommended)

- **AWS RDS for MySQL:** db.t3.medium (2 vCPU, 4 GB RAM)
- **Azure Database for MySQL:** General Purpose, 2 vCores
- **Google Cloud SQL for MySQL:** db-n1-standard-2

**Benefits:**

- ✅ Automated backups
- ✅ High availability
- ✅ Automatic updates
- ✅ Point-in-time recovery

#### Option B: Self-Hosted

- **Dedicated MySQL Server**
- Same specifications as application server
- Regular backup strategy required

#### Database Configuration:

```
Database Name: seif
Character Set: utf8mb4
Collation: utf8mb4_unicode_ci
Max Connections: 200
Storage: 100 GB (initially, can scale)
Backup: Daily automated backups with 30-day retention
```

---

## ☁️ Third-Party Services & Credentials Required

### 1. AWS S3 (File Storage) - REQUIRED ⭐

**Purpose:** Store uploaded CSV files, images, documents, and refurbishment photos

**What We Need:**

```
AWS_REGION=ap-south-1 (or client's preferred region)
AWS_ACCESS_KEY_ID=<YOUR_ACCESS_KEY>
AWS_SECRET_ACCESS_KEY=<YOUR_SECRET_KEY>
S3_BUCKET_NAME=seif-portal-uploads
```

**AWS Account Requirements:**

- Active AWS account with billing enabled
- S3 bucket created with appropriate permissions
- IAM user with S3 access (programmatic access)

**Estimated Cost:**

- Storage: ~$0.023 per GB/month
- For 10 GB uploads: ~$0.23/month
- Data transfer: Varies by usage

**Setup Instructions for Client:**

1. Log in to AWS Console
2. Create S3 bucket (e.g., `seif-portal-uploads`)
3. Create IAM user with S3 access policy
4. Generate Access Key and Secret Key
5. Share credentials securely

**Alternative (If AWS not available):**

- Azure Blob Storage
- Google Cloud Storage
- MinIO (self-hosted S3-compatible storage)

---

### 2. Email Service (SMTP) - REQUIRED ⭐

**Purpose:** Send password reset emails, notifications, and alerts

**Option A: AWS SES (Simple Email Service) - Recommended**

```
SMTP_HOST=email-smtp.ap-south-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=<SES_SMTP_USERNAME>
SMTP_PASSWORD=<SES_SMTP_PASSWORD>
SMTP_FROM_EMAIL=noreply@seif.org.in
SMTP_FROM_NAME=SEIF Portal
```

**Estimated Cost:** $0.10 per 1,000 emails (very cheap)

**Option B: SendGrid (Alternative)**

```
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=<SENDGRID_API_KEY>
```

**Estimated Cost:** Free tier (100 emails/day), Paid starts at $15/month

**Option C: Gmail SMTP (Development Only - Not for Production)**

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<GMAIL_EMAIL>
SMTP_PASSWORD=<APP_PASSWORD>
```

**What We Need:**

- SMTP host and port
- SMTP username and password
- Verified sender email address (e.g., noreply@seif.org.in)

---

### 3. Redis Server - REQUIRED ⭐

**Purpose:** Background job processing (CSV parsing, email queues, notifications)

**Option A: Managed Redis (Recommended)**

- **AWS ElastiCache for Redis:** cache.t3.micro ($0.017/hour = ~$12/month)
- **Azure Cache for Redis:** Basic C0 (250 MB) = ~$16/month
- **Redis Labs Cloud:** Free tier available (30 MB)

**Option B: Self-Hosted Redis**

- Can be installed on application server (if resources allow)
- Requires monitoring and maintenance

**What We Need:**

```
REDIS_HOST=<REDIS_ENDPOINT>
REDIS_PORT=6379
REDIS_PASSWORD=<OPTIONAL_PASSWORD>
```

---

### 4. SSL Certificate - REQUIRED ⭐

**Purpose:** Secure HTTPS connection

**Option A: Let's Encrypt (Free - Recommended)**

- Free SSL certificate
- Auto-renewal with Certbot
- We can configure this during deployment

**Option B: Paid SSL Certificate**

- Purchase from Namecheap, GoDaddy, etc.
- Cost: $10-$50/year

**What We Need:**

- Domain name pointed to server IP (e.g., portal.seif.org.in)
- We'll handle SSL installation

---

### 5. Domain Name - REQUIRED ⭐

**What We Need:**

```
Production Domain: portal.seif.org.in (or any domain client prefers)
API Subdomain: api.seif.org.in (or same domain with /api path)
```

**DNS Configuration Required:**

- A record pointing to server IP
- DNS management access (to add records)

---

## 🔐 Security Requirements

### Firewall Rules (Security Groups)

**Inbound Rules Required:**

```
Port 80 (HTTP) - Allow from: 0.0.0.0/0 (public)
Port 443 (HTTPS) - Allow from: 0.0.0.0/0 (public)
Port 22 (SSH) - Allow from: <DEVELOPER_IP_ONLY> (restricted)
Port 3306 (MySQL) - Allow from: <APPLICATION_SERVER_IP_ONLY> (if separate DB server)
Port 6379 (Redis) - Allow from: <APPLICATION_SERVER_IP_ONLY> (if separate Redis server)
```

**Outbound Rules:**

- Allow all outbound traffic (for downloading packages, API calls)

---

## 📊 Monitoring & Logging (Optional but Recommended)

### Option A: Cloud Provider Native Tools

- **AWS CloudWatch:** Monitoring, logs, alarms
- **Azure Monitor:** Application insights
- **Google Cloud Monitoring:** Logs and metrics

### Option B: Third-Party Tools

- **Datadog:** ~$15/host/month
- **New Relic:** Free tier available
- **Sentry:** Error tracking (~$26/month)

**What We Need:**

- API keys for chosen monitoring service
- Or we can use cloud provider's built-in monitoring

---

## 💰 Estimated Monthly Costs

### Small Scale (< 100 users, < 10 GB storage)

```
Application Server (AWS t3.medium): $30-40/month
MySQL RDS (db.t3.small): $25-30/month
Redis ElastiCache (cache.t3.micro): $12/month
S3 Storage (10 GB + transfers): $1-5/month
Email Service (AWS SES): $1-2/month
SSL Certificate (Let's Encrypt): FREE
Domain Registration: $10-15/year
----------------------------------------------
Total: ~$70-90/month + one-time setup costs
```

### Medium Scale (100-500 users, 50 GB storage)

```
Application Server (AWS t3.large): $60-70/month
MySQL RDS (db.t3.medium): $50-60/month
Redis ElastiCache (cache.t3.small): $25/month
S3 Storage (50 GB + transfers): $5-10/month
Email Service: $5-10/month
Monitoring Tools: $15-20/month
----------------------------------------------
Total: ~$160-195/month
```

---

## 📝 Credentials Summary - TO BE PROVIDED BY CLIENT

### 1. AWS Account

- [ ] AWS Access Key ID
- [ ] AWS Secret Access Key
- [ ] S3 Bucket Name
- [ ] AWS Region

### 2. Email Service (SMTP)

- [ ] SMTP Host
- [ ] SMTP Port
- [ ] SMTP Username
- [ ] SMTP Password
- [ ] From Email Address

### 3. Server Access

- [ ] Server IP Address
- [ ] SSH Private Key or Password
- [ ] Root/Sudo Access

### 4. Database

- [ ] MySQL Host
- [ ] MySQL Port
- [ ] MySQL Root Username
- [ ] MySQL Root Password

### 5. Domain & DNS

- [ ] Domain Name
- [ ] DNS Management Access (Cloudflare, Route53, etc.)

### 6. Redis (if managed service)

- [ ] Redis Endpoint
- [ ] Redis Port
- [ ] Redis Password (if any)

---

## 🚀 Deployment Timeline

### Phase 1: Infrastructure Setup (Week 1)

- Server provisioning
- Database setup
- Redis installation
- S3 bucket creation

### Phase 2: Application Deployment (Week 2)

- Code deployment
- SSL certificate installation
- Environment configuration
- Testing

### Phase 3: Go-Live (Week 3)

- Final testing
- Data migration (if needed)
- Production launch
- Monitoring setup

---

## 📞 Next Steps

**Client Action Items:**

1. ✅ Approve server specifications
2. ✅ Create AWS account (or preferred cloud provider)
3. ✅ Provide AWS S3 credentials
4. ✅ Set up email service (or share SMTP credentials)
5. ✅ Purchase/provide domain name
6. ✅ Share all credentials via secure channel (encrypted email/password manager)

**Development Team Action Items:**

1. ✅ Receive and verify all credentials
2. ✅ Set up server infrastructure
3. ✅ Deploy application
4. ✅ Perform security audit
5. ✅ Conduct user acceptance testing

---

## 🔒 Security Notes

**Credential Sharing:**

- ❌ Do NOT share credentials via regular email
- ✅ Use encrypted channels (password managers like 1Password, LastPass)
- ✅ Or share via secure file transfer (encrypted ZIP)
- ✅ Change passwords after initial setup

**Access Management:**

- Create separate IAM users for developers (not root access)
- Enable MFA (Multi-Factor Authentication) on AWS account
- Rotate access keys every 90 days

---

## 📧 Contact Information

For questions or clarifications about this document:

- **Project Manager:** [Name]
- **Lead Developer:** [Name]
- **Email:** [Email]
- **Phone:** [Phone]

---

**Document End**

_Please review this document and provide the required credentials and approvals to proceed with deployment._
