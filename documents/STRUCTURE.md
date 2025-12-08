# Backend Folder Structure

## ✅ Created Successfully!

```
backend/
│
├── src/                           # Source code directory
│   │
│   ├── api/                       # API routes (versioned)
│   │   └── v1/                   # Version 1 API
│   │       ├── routes/           # 🔗 Route definitions
│   │       │   ├── auth.routes.js
│   │       │   ├── partner.routes.js
│   │       │   ├── center.routes.js
│   │       │   ├── upload.routes.js
│   │       │   ├── admin-upload-review.routes.js
│   │       │   ├── refurbishment.routes.js
│   │       │   ├── request.routes.js
│   │       │   ├── notification.routes.js
│   │       │   └── index.js      # Routes aggregator
│   │       │
│   │       ├── controllers/      # 🎮 Request handlers (business logic)
│   │       │   ├── auth.controller.js
│   │       │   ├── partner.controller.js
│   │       │   ├── center.controller.js
│   │       │   ├── upload.controller.js
│   │       │   ├── admin-upload-review.controller.js
│   │       │   ├── refurbishment.controller.js
│   │       │   ├── request.controller.js
│   │       │   └── notification.controller.js
│   │       │
│   │       ├── services/         # 💼 Business logic layer
│   │       │   ├── auth.service.js
│   │       │   ├── partner.service.js
│   │       │   ├── center.service.js
│   │       │   ├── upload.service.js
│   │       │   ├── csv-parser.service.js
│   │       │   ├── refurbishment.service.js
│   │       │   ├── eligibility.service.js
│   │       │   ├── notification.service.js
│   │       │   └── s3-upload.service.js
│   │       │
│   │       └── validators/       # ✅ Request validation rules
│   │           ├── auth.validator.js
│   │           ├── partner.validator.js
│   │           ├── center.validator.js
│   │           ├── upload.validator.js
│   │           └── refurbishment.validator.js
│   │
│   ├── config/                   # ⚙️ Configuration files
│   │   ├── database.config.js   # MySQL connection config
│   │   ├── jwt.config.js        # JWT settings
│   │   ├── s3.config.js         # AWS S3 config
│   │   ├── redis.config.js      # Redis config
│   │   ├── logger.config.js     # Winston logger config
│   │   └── index.js             # Config aggregator
│   │
│   ├── database/                # 💾 Database related files
│   │   ├── migrations/          # Database schema migrations
│   │   │   └── run-migrations.js
│   │   ├── seeds/               # Initial data seeds
│   │   │   └── run-seeds.js
│   │   └── connection.js        # MySQL connection pool
│   │
│   ├── middleware/              # 🛡️ Express middlewares
│   │   ├── auth.middleware.js   # JWT authentication
│   │   ├── role.middleware.js   # Role-based access control
│   │   ├── error.middleware.js  # Global error handler
│   │   ├── validate.middleware.js # Request validation
│   │   ├── upload.middleware.js # File upload handling
│   │   ├── rate-limit.middleware.js # Rate limiting
│   │   └── logger.middleware.js # Request logging
│   │
│   ├── models/                  # 📊 Database models (data access layer)
│   │   ├── User.model.js
│   │   ├── Partner.model.js
│   │   ├── Center.model.js
│   │   ├── Batch.model.js
│   │   ├── DataUpload.model.js
│   │   ├── UploadedCenter.model.js
│   │   ├── UploadedBatch.model.js
│   │   ├── UploadedStudent.model.js
│   │   ├── Request.model.js
│   │   ├── RefurbishmentRequest.model.js
│   │   ├── Notification.model.js
│   │   └── AuditLog.model.js
│   │
│   ├── utils/                   # 🛠️ Helper utilities
│   │   ├── response.util.js     # Standardized API responses
│   │   ├── error.util.js        # Custom error classes
│   │   ├── date.util.js         # Date helpers
│   │   ├── validation.util.js   # Common validation helpers
│   │   ├── file.util.js         # File handling utilities
│   │   └── uuid.util.js         # UUID generation
│   │
│   ├── jobs/                    # ⏰ Background jobs (Bull queues)
│   │   ├── csv-processing.job.js      # Parse uploaded CSV
│   │   ├── eligibility-check.job.js   # Daily refurbishment eligibility
│   │   ├── scheduled-requests.job.js  # Send scheduled upload requests
│   │   └── queue.config.js            # Bull queue configuration
│   │
│   ├── constants/               # 📌 Constants and enums
│   │   ├── roles.constant.js    # User roles
│   │   ├── status.constant.js   # Status values
│   │   ├── errors.constant.js   # Error messages
│   │   └── index.js             # Constants aggregator
│   │
│   ├── app.js                   # 🚀 Express app setup
│   └── server.js                # 🌐 Server entry point
│
├── logs/                        # 📝 Application logs
│   └── .gitkeep
│
├── tests/                       # 🧪 Test files
│   ├── auth.test.js
│   ├── upload.test.js
│   └── helpers/
│
├── .env.example                 # Environment variables template
├── .gitignore                   # Git ignore rules
├── package.json                 # Dependencies and scripts
├── README.md                    # Documentation
└── STRUCTURE.md                 # This file

```

## 📋 Naming Conventions

### Files
- **Routes**: `{feature}.routes.js` (e.g., `auth.routes.js`)
- **Controllers**: `{feature}.controller.js` (e.g., `auth.controller.js`)
- **Services**: `{feature}.service.js` (e.g., `auth.service.js`)
- **Models**: `{Entity}.model.js` (e.g., `User.model.js`)
- **Middleware**: `{purpose}.middleware.js` (e.g., `auth.middleware.js`)
- **Validators**: `{feature}.validator.js` (e.g., `auth.validator.js`)
- **Utils**: `{purpose}.util.js` (e.g., `response.util.js`)
- **Jobs**: `{task}.job.js` (e.g., `csv-processing.job.js`)
- **Constants**: `{category}.constant.js` (e.g., `roles.constant.js`)

### API Endpoints
- Use kebab-case: `/api/v1/data-uploads`
- Use plural nouns: `/partners`, `/centers`
- Use verbs for actions: `/uploads/:id/approve`
- Nested resources: `/partners/:id/centers`

### Functions
- Use camelCase: `getUserById()`, `createPartner()`
- Controller functions: `getUsers`, `createUser`, `updateUser`, `deleteUser`
- Service functions: `findUserByEmail()`, `hashPassword()`
- Validators: `validateLogin()`, `validateCreatePartner()`

## 🎯 Code Organization Principles

### 1. Separation of Concerns
- **Routes**: Define endpoints only
- **Controllers**: Handle HTTP requests/responses
- **Services**: Contain business logic
- **Models**: Handle database operations
- **Validators**: Validate incoming data

### 2. Single Responsibility
Each file has ONE clear purpose.

### 3. DRY (Don't Repeat Yourself)
Common logic goes in utils or services.

### 4. Easy to Navigate
- Beginner-friendly naming
- Clear folder structure
- Consistent patterns

## 🔍 Where to Find Things

| Need to... | Look in... |
|------------|-----------|
| Add new API endpoint | `src/api/v1/routes/{feature}.routes.js` |
| Add business logic | `src/api/v1/services/{feature}.service.js` |
| Handle HTTP request | `src/api/v1/controllers/{feature}.controller.js` |
| Add validation rules | `src/api/v1/validators/{feature}.validator.js` |
| Query database | `src/models/{Entity}.model.js` |
| Add middleware | `src/middleware/{purpose}.middleware.js` |
| Add background job | `src/jobs/{task}.job.js` |
| Add helper function | `src/utils/{purpose}.util.js` |
| Configure settings | `src/config/{service}.config.js` |
| Add constants | `src/constants/{category}.constant.js` |

## 🚀 Next Steps

1. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Setup environment**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Start with core files**
   - Database connection
   - App setup
   - Server entry point
   - Auth middleware

4. **Build features incrementally**
   - Start with Authentication
   - Then Partner management
   - Then Uploads
   - Then Refurbishment

---

**Created by:** SEIF Development Team  
**Date:** November 11, 2025
