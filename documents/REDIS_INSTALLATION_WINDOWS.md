# Redis Installation Guide for Windows

## Method 1: Using WSL (Windows Subsystem for Linux) - RECOMMENDED ⭐

### Step 1: Install WSL (if not already installed)
```powershell
# Run PowerShell as Administrator
wsl --install
```

### Step 2: Restart your computer

### Step 3: Install Redis in WSL
```bash
# Open WSL terminal (search "Ubuntu" or "WSL" in Start menu)
sudo apt update
sudo apt install redis-server -y
```

### Step 4: Start Redis
```bash
# Start Redis server
sudo service redis-server start

# Test if Redis is working
redis-cli ping
# Should return: PONG
```

### Step 5: Make Redis start automatically
```bash
# Edit Redis config
sudo nano /etc/redis/redis.conf

# Find this line:
# supervised no

# Change it to:
# supervised systemd

# Save and exit (Ctrl+X, then Y, then Enter)

# Restart Redis
sudo service redis-server restart
```

---

## Method 2: Using Docker (Alternative) 🐳

### Step 1: Install Docker Desktop
- Download from: https://www.docker.com/products/docker-desktop
- Install and restart computer

### Step 2: Run Redis Container
```powershell
# Run Redis in Docker
docker run -d --name redis-seif -p 6379:6379 redis:7-alpine

# Test connection
docker exec -it redis-seif redis-cli ping
# Should return: PONG
```

### Step 3: Start Redis (when needed)
```powershell
# Start Redis container
docker start redis-seif

# Stop Redis container
docker stop redis-seif
```

---

## Method 3: Native Windows Redis (Not Recommended - Outdated)

**Note:** Redis doesn't officially support Windows anymore. Use Method 1 or 2 instead.

If you still want to try:
1. Download from: https://github.com/tporadowski/redis/releases
2. Extract ZIP file
3. Run `redis-server.exe`

---

## 🔧 Configuration for SEIF Project

Once Redis is installed, update your `.env` file:

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

---

## ✅ Verify Redis is Working

### Test from Command Line:
```bash
# WSL or Docker
redis-cli ping
# Expected output: PONG

# Test set/get
redis-cli set test "Hello Redis"
redis-cli get test
# Expected output: "Hello Redis"
```

### Test from Node.js:
```javascript
// Create test file: test-redis.js
const redis = require('redis');

const client = redis.createClient({
  host: 'localhost',
  port: 6379
});

client.connect();

client.on('connect', () => {
  console.log('✅ Redis connected successfully!');
  process.exit(0);
});

client.on('error', (err) => {
  console.error('❌ Redis error:', err);
  process.exit(1);
});
```

Run test:
```bash
node test-redis.js
```

---

## 🚨 Troubleshooting

### Issue: "Connection refused"
**Solution:**
- Check if Redis is running: `sudo service redis-server status` (WSL) or `docker ps` (Docker)
- Start Redis if stopped

### Issue: "Port 6379 already in use"
**Solution:**
- Another Redis instance is running
- Stop it: `sudo service redis-server stop` (WSL)
- Or change port in `.env` and Redis config

### Issue: WSL not working
**Solution:**
- Enable virtualization in BIOS
- Update Windows to latest version
- Run: `wsl --update`

---

## 📌 For Development (Temporary Solution)

If you can't install Redis right now, you can **skip background jobs** temporarily:

1. Comment out Redis-related code in `server.js`
2. File uploads will work, but without background processing
3. Install Redis before production deployment

---

## 🎯 Recommended: WSL Method

**Why?**
- ✅ Official Redis support
- ✅ Better performance
- ✅ Same environment as Linux servers
- ✅ Free and lightweight
- ✅ Easy to manage

**Installation Time:** ~10 minutes
