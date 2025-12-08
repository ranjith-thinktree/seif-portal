# SEIF Portal API - Testing Guide

## Phase 2 Complete - Authentication System ✅

All authentication endpoints are now available!

---

## 🔑 Test User Credentials

**Before testing, import the test users SQL:**

1. Open phpMyAdmin
2. Select `seif` database
3. Go to SQL tab
4. Copy and paste contents from: `src/database/seeds/01_test_users.sql`
5. Click "Go"

**Test Users:**

- **Super Admin:** superadmin@seif.org / Password123
- **Admin:** admin@seif.org / Password123
- **Partner:** partner@testpartner.org / Password123
- **Read Only:** readonly@seif.org / Password123
- **ESSCI:** essci@seif.org / Password123

---

## 📡 Available Endpoints

### Base URL

```
http://localhost:5000/api/v1
```

---

### 1. Health Check (No Auth)

```http
GET /health
```

**Response:**

```json
{
  "status": "OK",
  "message": "SEIF Portal API is running",
  "timestamp": "2025-11-11T..."
}
```

---

### 2. Login (No Auth Required)

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "superadmin@seif.org",
  "password": "Password123"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "a0000000-0000-0000-0000-000000000001",
      "email": "superadmin@seif.org",
      "full_name": "Super Admin",
      "mobile_number": "9876543210",
      "role": "SUPER_ADMIN",
      "partner_id": null,
      "status": "active",
      "last_login_at": null,
      "created_at": "...",
      "updated_at": "..."
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "timestamp": "2025-11-11T..."
}
```

**Error Response (401):**

```json
{
  "success": false,
  "message": "Invalid email or password",
  "errors": null,
  "timestamp": "2025-11-11T..."
}
```

---

### 3. Register New User (No Auth - Can be protected later)

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "SecurePass123",
  "full_name": "New User Name",
  "mobile_number": "9876543217",
  "role": "PARTNER"
}
```

**Success Response (201):**

```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "user": { ... },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

---

### 4. Get Profile (Auth Required)

```http
GET /api/v1/auth/profile
Authorization: Bearer {accessToken}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Data fetched successfully",
  "data": {
    "id": "...",
    "email": "...",
    "full_name": "...",
    "role": "...",
    ...
  }
}
```

---

### 5. Update Profile (Auth Required)

```http
PUT /api/v1/auth/profile
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "full_name": "Updated Name",
  "mobile_number": "9999999999"
}
```

---

### 6. Change Password (Auth Required)

```http
POST /api/v1/auth/change-password
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "oldPassword": "Password123",
  "newPassword": "NewSecure123"
}
```

---

### 7. Refresh Token (No Auth)

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "{your_refresh_token}"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "new_access_token_here"
  }
}
```

---

### 8. Verify Token (Auth Required)

```http
GET /api/v1/auth/verify
Authorization: Bearer {accessToken}
```

**Response:**

```json
{
  "success": true,
  "message": "Token is valid",
  "data": {
    "valid": true,
    "user": { ... }
  }
}
```

---

### 9. Logout (Auth Required)

```http
POST /api/v1/auth/logout
Authorization: Bearer {accessToken}
```

**Response:**

```json
{
  "success": true,
  "message": "Logout successful",
  "data": null
}
```

---

## 🧪 Testing with cURL (Windows PowerShell)

### 1. Login

```powershell
$body = @{
    email = "superadmin@seif.org"
    password = "Password123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/auth/login" -Method Post -Body $body -ContentType "application/json"

# Save the token
$token = $response.data.accessToken
Write-Host "Token: $token"
```

### 2. Get Profile (using saved token)

```powershell
$headers = @{
    Authorization = "Bearer $token"
}

Invoke-RestMethod -Uri "http://localhost:5000/api/v1/auth/profile" -Method Get -Headers $headers
```

### 3. Update Profile

```powershell
$body = @{
    full_name = "Updated Super Admin"
    mobile_number = "9999999999"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/v1/auth/profile" -Method Put -Headers $headers -Body $body -ContentType "application/json"
```

---

## 🧪 Testing with Postman / Thunder Client

### Setup:

1. **Install Extension:** Thunder Client or Postman for VS Code
2. **Create Collection:** "SEIF Portal API"
3. **Set Environment Variable:**
   - Variable: `baseUrl`
   - Value: `http://localhost:5000/api/v1`
   - Variable: `token`
   - Value: (will be set after login)

### Test Sequence:

1. **Login** → Copy `accessToken` from response
2. **Set token variable** in environment
3. **Test other endpoints** using `{{token}}` in Authorization header

---

## ❌ Error Responses

### Validation Error (422):

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format",
      "value": "notanemail"
    }
  ],
  "timestamp": "..."
}
```

### Unauthorized (401):

```json
{
  "success": false,
  "message": "You are not authorized to access this resource",
  "errors": null
}
```

### Not Found (404):

```json
{
  "success": false,
  "message": "User not found",
  "errors": null
}
```

### Conflict (409):

```json
{
  "success": false,
  "message": "User with this email already exists",
  "errors": null
}
```

---

## 🔐 Authorization Header Format

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Important:**

- Must include `Bearer ` prefix (with space)
- Token expires in 15 minutes (configurable in `.env`)
- Use refresh token endpoint to get new access token

---

## 📝 Notes

1. **Token Expiry:**

   - Access Token: 15 minutes (use for API calls)
   - Refresh Token: 7 days (use to get new access token)

2. **Password Requirements:**

   - Minimum 8 characters
   - At least one uppercase letter
   - At least one lowercase letter
   - At least one number

3. **Mobile Number Format:**

   - Must be exactly 10 digits
   - No spaces or special characters

4. **Email Validation:**
   - Must be valid email format
   - Case-insensitive
   - Automatically normalized

---

## ✅ Phase 2 Complete Checklist

- [x] UUID utility functions
- [x] User database model
- [x] Authentication service (login, register, tokens)
- [x] Auth middleware (JWT verification)
- [x] Role middleware (RBAC)
- [x] Validation middleware
- [x] Auth validators (request validation)
- [x] Auth controller (request handlers)
- [x] Auth routes (endpoint definitions)
- [x] Routes index (route mounting)
- [x] Test users SQL seed file
- [x] Server running successfully
- [x] All endpoints functional

---

## 🚀 Ready for Phase 3!

Next phase will include:

- User management endpoints (CRUD)
- Partner management
- Admin user creation
- User listing with pagination
- User search and filters

Would you like to start Phase 3?
