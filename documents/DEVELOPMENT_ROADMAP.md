# 🚀 SEIF Portal Backend - Development Roadmap

## ✅ What We've Built So Far

### Project Structure ✅
- ✅ Created well-organized folder structure
- ✅ Setup package.json with all dependencies
- ✅ Configured environment variables template
- ✅ Added ESLint and Prettier for code quality
- ✅ Created comprehensive README
- ✅ Organized folders for versioned APIs (v1)

### Folder Organization ✅
```
✅ src/api/v1/routes/       - API endpoint definitions
✅ src/api/v1/controllers/  - Request handlers
✅ src/api/v1/services/     - Business logic
✅ src/api/v1/validators/   - Input validation
✅ src/config/              - Configuration files
✅ src/database/            - MySQL connection & migrations
✅ src/middleware/          - Authentication, validation, errors
✅ src/models/              - Database models (data access)
✅ src/utils/               - Helper functions
✅ src/jobs/                - Background jobs (CSV, eligibility)
✅ src/constants/           - Enums and constants
```

---

## 🎯 WHERE TO START - Step-by-Step Build Order

### 📍 Phase 1: Core Foundation (Start Here!)

#### Step 1.1: Configuration & Database Connection
**Priority: HIGHEST** ⭐⭐⭐

Create these files FIRST:

1. **`src/config/database.config.js`**
   - MySQL connection pool setup
   - Connection string from .env
   - Export connection for use everywhere

2. **`src/database/connection.js`**
   - Create and test database connection
   - Add connection health check
   - Export pool for models

3. **`src/utils/response.util.js`**
   - Standardized success response
   - Standardized error response
   - Makes API responses consistent

4. **`src/utils/error.util.js`**
   - Custom error classes (NotFoundError, ValidationError, etc.)
   - HTTP status code mapping

5. **`src/constants/index.js`**
   - User roles (ADMIN, PARTNER, etc.)
   - Status values (pending, approved, rejected)
   - Error messages

**Why start here?**
- Every other feature needs database connection
- Standardized responses make API consistent
- Constants prevent typos and make code readable

---

#### Step 1.2: Express App Setup
**Priority: HIGHEST** ⭐⭐⭐

6. **`src/app.js`**
   - Create Express app
   - Setup middleware (CORS, helmet, morgan)
   - Mount API routes
   - Setup error handling

7. **`src/server.js`**
   - Import app from app.js
   - Start server on PORT
   - Handle graceful shutdown

8. **`src/middleware/error.middleware.js`**
   - Global error handler
   - Catch all errors and send formatted response

9. **`src/middleware/logger.middleware.js`**
   - Log all incoming requests
   - Log request method, URL, status code

**Test it:**
```bash
npm run dev
# Should see: "Server running on port 5000"
```

---

### 📍 Phase 2: Authentication System

#### Step 2.1: User Model & Auth Service
**Priority: HIGH** ⭐⭐

10. **`src/models/User.model.js`**
    - findByEmail(email)
    - findById(id)
    - create(userData)
    - update(id, userData)
    - MySQL queries for users table

11. **`src/utils/uuid.util.js`**
    - Generate UUID for IDs
    - Format UUID properly

12. **`src/config/jwt.config.js`**
    - JWT secret from .env
    - Token expiration times
    - Export config

13. **`src/api/v1/services/auth.service.js`**
    - hashPassword(password) - use bcrypt
    - comparePassword(password, hash)
    - generateAccessToken(user)
    - generateRefreshToken(user)
    - verifyToken(token)

---

#### Step 2.2: Auth Middleware & Routes
**Priority: HIGH** ⭐⭐

14. **`src/middleware/auth.middleware.js`**
    - Extract JWT from Authorization header
    - Verify token
    - Attach user to request (req.user)

15. **`src/middleware/role.middleware.js`**
    - Check if user has required role
    - checkRole(['ADMIN', 'PARTNER'])

16. **`src/api/v1/validators/auth.validator.js`**
    - Validate login request (email, password)
    - Validate register request
    - Use express-validator

17. **`src/middleware/validate.middleware.js`**
    - Run validation and return errors

18. **`src/api/v1/controllers/auth.controller.js`**
    - login(req, res, next)
    - refresh(req, res, next)
    - logout(req, res, next)
    - forgotPassword(req, res, next)

19. **`src/api/v1/routes/auth.routes.js`**
    ```javascript
    POST /api/v1/auth/login
    POST /api/v1/auth/refresh
    POST /api/v1/auth/logout
    POST /api/v1/auth/forgot-password
    ```

20. **`src/api/v1/routes/index.js`**
    - Aggregate all routes
    - Export router for app.js

**Test it:**
```bash
POST http://localhost:5000/api/v1/auth/login
{
  "email": "admin@seif.org.in",
  "password": "password123"
}
```

---

### 📍 Phase 3: Partner Management

#### Step 3.1: Partner CRUD
**Priority: MEDIUM** ⭐

21. **`src/models/Partner.model.js`**
    - findAll(filters)
    - findById(id)
    - create(data)
    - update(id, data)
    - delete(id)

22. **`src/api/v1/services/partner.service.js`**
    - Business logic for partners
    - Data transformation
    - Validation rules

23. **`src/api/v1/validators/partner.validator.js`**
    - Validate create partner
    - Validate update partner

24. **`src/api/v1/controllers/partner.controller.js`**
    - getPartners
    - getPartnerById
    - createPartner
    - updatePartner
    - deletePartner

25. **`src/api/v1/routes/partner.routes.js`**
    ```javascript
    GET    /api/v1/partners
    GET    /api/v1/partners/:id
    POST   /api/v1/partners          [Admin only]
    PUT    /api/v1/partners/:id      [Admin only]
    DELETE /api/v1/partners/:id      [Admin only]
    ```

---

### 📍 Phase 4: Centers Management

26-30. **Similar structure for Centers**
    - Center.model.js
    - center.service.js
    - center.validator.js
    - center.controller.js
    - center.routes.js

---

### 📍 Phase 5: File Upload System

#### Step 5.1: S3 Configuration
**Priority: HIGH** ⭐⭐

31. **`src/config/s3.config.js`**
    - AWS S3 client setup
    - Bucket name from .env
    - Region configuration

32. **`src/api/v1/services/s3-upload.service.js`**
    - generateSignedUrl(fileName)
    - uploadFile(file, folder)
    - deleteFile(fileKey)

33. **`src/middleware/upload.middleware.js`**
    - Multer configuration
    - File type validation
    - File size limits

---

#### Step 5.2: Upload Routes & Processing
**Priority: HIGH** ⭐⭐

34. **`src/models/DataUpload.model.js`**
    - CRUD for data_uploads table

35. **`src/api/v1/controllers/upload.controller.js`**
    - initUpload - get signed URL
    - completeUpload - trigger background job
    - getMyUploads
    - getUploadDetails

36. **`src/api/v1/routes/upload.routes.js`**
    ```javascript
    POST /api/v1/uploads/init
    POST /api/v1/uploads/complete
    GET  /api/v1/uploads
    GET  /api/v1/uploads/:id
    ```

37. **`src/jobs/csv-processing.job.js`**
    - Parse CSV from S3
    - Create uploaded_centers
    - Create uploaded_batches
    - Create uploaded_students
    - Group by csv_center_id

38. **`src/api/v1/services/csv-parser.service.js`**
    - Read CSV from S3
    - Validate CSV structure
    - Parse rows
    - Return structured data

---

### 📍 Phase 6: Admin Upload Review

39. **`src/api/v1/controllers/admin-upload-review.controller.js`**
    - getPendingUploads
    - getUploadDetails (with all staging data)
    - approveUpload (move to main tables)
    - rejectUpload (with reason)

40. **`src/api/v1/routes/admin-upload-review.routes.js`**
    ```javascript
    GET  /api/v1/admin/uploads
    GET  /api/v1/admin/uploads/:id
    POST /api/v1/admin/uploads/:id/approve
    POST /api/v1/admin/uploads/:id/reject
    ```

---

### 📍 Phase 7: Refurbishment System

41-45. **Refurbishment Models**
    - RefurbishmentRequest.model.js
    - RefurbishmentPackage.model.js
    - CoursePackage.model.js

46. **`src/api/v1/services/eligibility.service.js`**
    - Calculate refurbishment eligibility
    - Check refurbishment_frequency_months

47. **`src/jobs/eligibility-check.job.js`**
    - Daily cron job
    - Check all centers
    - Update refurbishment_eligible flag
    - Send admin notifications

48. **`src/api/v1/controllers/refurbishment.controller.js`**
    - Admin: getEligibleCenters
    - Admin: createRequest
    - Partner: getRequestDetails
    - Partner: submitSelection
    - Admin: approveRequest

---

### 📍 Phase 8: Notifications

49. **`src/models/Notification.model.js`**
    - Create notification
    - Get user notifications
    - Mark as read

50. **`src/api/v1/services/notification.service.js`**
    - createNotification(userId, message)
    - sendToRole(role, message)
    - markAsRead(notificationId)

51. **`src/api/v1/routes/notification.routes.js`**
    ```javascript
    GET /api/v1/notifications
    PUT /api/v1/notifications/:id/read
    PUT /api/v1/notifications/read-all
    ```

---

### 📍 Phase 9: Background Jobs Setup

52. **`src/config/redis.config.js`**
    - Redis connection

53. **`src/jobs/queue.config.js`**
    - Bull queue setup
    - Job processors

54. **`src/jobs/scheduled-requests.job.js`**
    - Daily cron
    - Check scheduled_requests
    - Send due notifications

---

### 📍 Phase 10: Testing & Deployment

55. Write tests for critical flows
56. Add database migrations
57. Add seed data
58. Create deployment scripts

---

## 🎓 Beginner-Friendly Learning Path

### Week 1: Foundation
- Day 1-2: Database connection & basic Express setup
- Day 3-4: Authentication system
- Day 5: Test login/register flows

### Week 2: Core Features
- Day 1-2: Partner & Center management
- Day 3-4: File upload to S3
- Day 5: Test CRUD operations

### Week 3: Upload System
- Day 1-2: CSV parsing background job
- Day 3-4: Admin review flow
- Day 5: Test complete upload workflow

### Week 4: Refurbishment
- Day 1-2: Eligibility calculation
- Day 3-4: Request creation & submission
- Day 5: Test refurbishment flow

### Week 5: Polish
- Day 1-2: Notifications
- Day 3-4: Testing
- Day 5: Deployment

---

## 📝 Quick Reference

### File Naming Pattern
```
{feature}.{type}.js

Examples:
- auth.routes.js      (routes for authentication)
- auth.controller.js  (controller for authentication)
- auth.service.js     (service for authentication)
- User.model.js       (model for User entity)
```

### API Endpoint Pattern
```
/api/{version}/{resource}/{action}

Examples:
- POST /api/v1/auth/login
- GET  /api/v1/partners
- POST /api/v1/uploads/init
- POST /api/v1/admin/uploads/:id/approve
```

### Function Naming Pattern
```
Controller:  getUsers, createUser, updateUser
Service:     findUserById, hashPassword, sendEmail
Model:       findById, findAll, create, update
Validator:   validateLogin, validateCreatePartner
```

---

## ✅ Implementation Checklist

Use this to track your progress:

**Phase 1: Core Foundation**
- [ ] Database connection (database.config.js, connection.js)
- [ ] Response utilities (response.util.js, error.util.js)
- [ ] Constants (roles, status, errors)
- [ ] Express app setup (app.js, server.js)
- [ ] Error middleware

**Phase 2: Authentication**
- [ ] User model
- [ ] Auth service (JWT, bcrypt)
- [ ] Auth middleware
- [ ] Role middleware
- [ ] Auth validators
- [ ] Auth controller
- [ ] Auth routes
- [ ] Test login flow

**Phase 3: Partner Management**
- [ ] Partner model
- [ ] Partner service
- [ ] Partner validator
- [ ] Partner controller
- [ ] Partner routes
- [ ] Test CRUD operations

**Phase 4: Centers**
- [ ] Center model
- [ ] Center service
- [ ] Center controller
- [ ] Center routes

**Phase 5: File Upload**
- [ ] S3 configuration
- [ ] S3 service
- [ ] Upload middleware
- [ ] Upload model
- [ ] Upload controller
- [ ] Upload routes
- [ ] CSV parser service
- [ ] CSV processing job

**Phase 6: Admin Review**
- [ ] Admin review controller
- [ ] Admin review routes
- [ ] Approve/reject logic

**Phase 7: Refurbishment**
- [ ] Refurbishment models
- [ ] Eligibility service
- [ ] Eligibility job
- [ ] Refurbishment controller
- [ ] Refurbishment routes

**Phase 8: Notifications**
- [ ] Notification model
- [ ] Notification service
- [ ] Notification routes

**Phase 9: Background Jobs**
- [ ] Redis setup
- [ ] Queue configuration
- [ ] Job processors

**Phase 10: Testing**
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests

---

## 🚀 Let's Start Building!

**Next immediate action:**
1. Copy `.env.example` to `.env`
2. Fill in your MySQL credentials
3. Start with `src/config/database.config.js`

Tell me when you're ready, and I'll create the first set of core files! 🎯
