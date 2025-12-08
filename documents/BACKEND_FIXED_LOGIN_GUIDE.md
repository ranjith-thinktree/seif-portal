# ✅ Backend Server Fixed & Running

## Issues Fixed

### 1. Middleware Import Path Error ✅

**Error**: `Cannot find module '../../../middlewares/auth.middleware'`

**Root Cause**:

- review.routes.js used `middlewares` (plural)
- Actual folder name is `middleware` (singular)

**Fixed**:

```javascript
// Before (WRONG)
const { authenticate } = require("../../../middlewares/auth.middleware");
const { authorize } = require("../../../middlewares/role.middleware");
const { validate } = require("../../../middlewares/validator.middleware");

// After (CORRECT)
const {
  authenticate,
  authorize,
} = require("../../../middleware/auth.middleware");
const { checkRole } = require("../../../middleware/role.middleware");
const validate = require("../../../middleware/validate.middleware");
```

**Files Modified**:

- `backend/src/api/v1/routes/review.routes.js`

### 2. Wrong Export Names ✅

**Issue**: `role.middleware.js` doesn't export `authorize`, only `checkRole`

**Fixed**:

- `auth.middleware.js` exports `authorize` as an alias for `checkRole`
- Updated review.routes.js to import `authorize` from auth middleware instead

## Server Status

✅ **Backend Server Running**

- Port: 5000
- Environment: development
- Database: ✅ Connected
- WebSocket: ✅ Initialized
- Health Check: http://localhost:5000/health
- API Base: http://localhost:5000/api/v1

## Test Login Credentials

### Super Admin

```
Email: superadmin@seif.org
Password: Password123
Role: SUPER_ADMIN
Can: Full system access
```

### Admin

```
Email: admin@seif.org
Password: Password123
Role: ADMIN
Can: Review and approve uploads, manage data
```

### Partner User

```
Email: partner@testpartner.org
Password: Password123
Role: PARTNER
Partner ID: b0000000-0000-0000-0000-000000000001
Can: Upload data, view own centers, see rejections
```

### SEIF Read-Only

```
Email: readonly@seif.org
Password: Password123
Role: SEIF_READONLY
Can: View data only
```

### ESSCI User

```
Email: essci@seif.org
Password: Password123
Role: ESSCI
Can: View reports and analytics
```

### Inactive User (Should Fail)

```
Email: inactive@seif.org
Password: Password123
Status: inactive
Expected: Login should be rejected
```

## How to Test Login

### Option 1: Using Frontend

1. Open http://localhost:5173 (or your Vite dev server port)
2. Use any of the credentials above
3. Should redirect to dashboard on success

### Option 2: Using Postman/Thunder Client

```http
POST http://localhost:5000/api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@seif.org",
  "password": "Password123"
}
```

**Expected Response**:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "a0000000-0000-0000-0000-000000000002",
      "email": "admin@seif.org",
      "full_name": "Admin User",
      "role": "ADMIN",
      "status": "active"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### Option 3: Using cURL

```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@seif.org","password":"Password123"}'
```

## Common Login Issues & Solutions

### Issue: "Invalid credentials"

**Cause**: Wrong email or password
**Solution**:

- Email must be exact (case-sensitive)
- Password is: `Password123` (capital P)
- Check database has test users (see `backend/src/database/seeds/01_test_users.sql`)

### Issue: "User is inactive"

**Cause**: User status is not 'active'
**Solution**:

- Don't use `inactive@seif.org` for testing
- Check database: `SELECT email, status FROM users;`

### Issue: "Cannot connect to server"

**Cause**: Backend not running
**Solution**:

```powershell
cd C:\Users\ranji\Desktop\TT\SEIF\backend
npm run dev
```

### Issue: "Database connection failed"

**Cause**: MySQL not running or wrong credentials
**Solution**:

1. Start XAMPP MySQL
2. Check `backend/src/config/index.js` for correct credentials
3. Verify database name is `seif`

### Issue: Frontend can't connect to backend

**Cause**: CORS or wrong API URL
**Solution**:

- Check `frontend/src/api/client.js` has correct baseURL
- Backend should allow CORS from frontend origin
- Check browser console for CORS errors

## API Endpoints Available

### Authentication

- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout user
- `GET /api/v1/auth/profile` - Get current user profile

### Review (Admin/Super Admin Only)

- `GET /api/v1/review/{uploadId}` - Get upload details for review
- `GET /api/v1/review/{uploadId}/centers` - Get pending centers
- `GET /api/v1/review/{uploadId}/centers/{centerId}/students` - Get center students
- `POST /api/v1/review/{uploadId}/centers/{centerId}/approve` - Approve center
- `POST /api/v1/review/{uploadId}/centers/{centerId}/reject` - Reject center

### Review (Partner Only)

- `GET /api/v1/review/{uploadId}/rejected` - Get rejected centers

### Upload (Partner)

- `GET /api/v1/uploads/template` - Download CSV template
- `POST /api/v1/uploads/upload` - Upload CSV file
- `POST /api/v1/uploads/confirm` - Confirm upload after preview
- `GET /api/v1/uploads/history` - Get upload history

### Notifications

- `GET /api/v1/notifications` - Get all notifications
- `PATCH /api/v1/notifications/{id}/read` - Mark notification as read
- `PATCH /api/v1/notifications/read-all` - Mark all as read
- `DELETE /api/v1/notifications/{id}` - Delete notification

## Next Steps

1. ✅ Backend running and fixed
2. ⏳ **Test login** with credentials above
3. ⏳ **Apply database migration** for review system (see `documents/ERRORS_FIXED_SUMMARY.md`)
4. ⏳ **Test upload workflow** (Partner uploads → Admin reviews)
5. ⏳ **Test approval/rejection** workflow

## Troubleshooting Commands

### Restart Backend

```powershell
cd C:\Users\ranji\Desktop\TT\SEIF\backend
# Kill existing process
Stop-Process -Name node -Force
# Start fresh
npm run dev
```

### Check Port 5000

```powershell
Get-NetTCPConnection -LocalPort 5000 | Select-Object State, OwningProcess
```

### Kill Process on Port 5000

```powershell
Get-NetTCPConnection -LocalPort 5000 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

### Check Backend Logs

Look for these in terminal:

- ✅ MySQL Database connected successfully
- 🔌 WebSocket server initialized
- 🚀 SEIF Portal API Server Started
- 🌐 Server running on: http://localhost:5000

---

**Status**: ✅ BACKEND FIXED AND RUNNING  
**Login**: ✅ READY TO TEST  
**Migration**: ⏳ PENDING (see other docs)

🎉 **All backend errors resolved!**
