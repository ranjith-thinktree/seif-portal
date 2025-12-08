# SEIF Portal Backend

Backend API for the SEIF Training Center Management Portal built with Node.js, Express, and MySQL.

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0.0
- MySQL >= 8.0
- Redis (for background jobs)
- AWS S3 account (for file uploads)

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Setup environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Setup database**
   ```bash
   # Create MySQL database
   mysql -u root -p
   CREATE DATABASE seif_portal;
   
   # Run migrations
   npm run db:migrate
   
   # Seed initial data (optional)
   npm run db:seed
   ```

4. **Start Redis** (for background jobs)
   ```bash
   redis-server
   ```

5. **Start the server**
   ```bash
   # Development mode (with auto-reload)
   npm run dev
   
   # Production mode
   npm start
   ```

## 📁 Project Structure

```
backend/
├── src/
│   ├── api/                    # API routes organized by version
│   │   └── v1/                # Version 1 API
│   │       ├── routes/        # Route definitions
│   │       ├── controllers/   # Business logic handlers
│   │       ├── services/      # Business logic layer
│   │       └── validators/    # Request validation rules
│   ├── config/                # Configuration files
│   ├── database/              # Database related files
│   │   ├── migrations/        # Database schema migrations
│   │   ├── seeds/            # Initial data seeds
│   │   └── connection.js     # MySQL connection setup
│   ├── middleware/            # Express middlewares
│   ├── models/                # Database models
│   ├── utils/                 # Helper utilities
│   ├── jobs/                  # Background jobs (BullMQ)
│   ├── constants/             # Constants and enums
│   ├── app.js                 # Express app setup
│   └── server.js              # Server entry point
├── logs/                      # Application logs
├── tests/                     # Test files
├── .env.example              # Environment variables template
├── .eslintrc.js              # ESLint configuration
├── .prettierrc               # Prettier configuration
├── package.json              # Dependencies and scripts
└── README.md                 # This file
```

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication.

### Login Flow:
1. POST `/api/v1/auth/login` - Get access token and refresh token
2. Include token in requests: `Authorization: Bearer <token>`
3. Refresh token: POST `/api/v1/auth/refresh`

### Roles:
- `SUPER_ADMIN` - Full system access
- `ADMIN` - Admin dashboard and approvals
- `PARTNER` - Partner organization user
- `SEIF_READONLY` - Read-only SEIF user
- `ESSCI` - ESSCI role user (cannot self-reset password)

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api/v1
```

### Key Endpoints

#### Authentication
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout user
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password with token

#### Partners (Admin only)
- `GET /partners` - List all partners
- `GET /partners/:id` - Get partner details
- `POST /partners` - Create new partner
- `PUT /partners/:id` - Update partner
- `DELETE /partners/:id` - Delete partner

#### Centers
- `GET /centers` - List centers (filtered by role)
- `GET /centers/:id` - Get center details
- `POST /centers` - Create center (Admin)
- `PUT /centers/:id` - Update center

#### Data Uploads (Partner)
- `POST /uploads/init` - Initialize upload (get S3 signed URL)
- `POST /uploads/complete` - Complete upload (trigger processing)
- `GET /uploads` - List my uploads
- `GET /uploads/:id` - Get upload details

#### Admin - Upload Review
- `GET /admin/uploads` - List pending uploads
- `GET /admin/uploads/:id` - Get full upload details
- `POST /admin/uploads/:id/approve` - Approve entire upload
- `POST /admin/uploads/:id/reject` - Reject upload with reason

#### Refurbishment
- `GET /admin/refurbishment/eligible-centers` - List eligible centers
- `POST /admin/refurbishment/create-request` - Create refurbishment request
- `GET /partner/refurbishment/:id` - View request details
- `POST /partner/refurbishment/:id/submit` - Submit selections
- `POST /admin/refurbishment/:id/approve` - Approve request

#### Notifications
- `GET /notifications` - List my notifications
- `PUT /notifications/:id/read` - Mark as read
- `PUT /notifications/read-all` - Mark all as read

## 🔧 Development

### Code Style
- Use ESLint and Prettier for consistent code formatting
- Run `npm run lint` to check code quality
- Run `npm run format` to auto-format code

### Database Migrations
```bash
# Create new migration
# Manually create file in src/database/migrations/

# Run all migrations
npm run db:migrate
```

### Testing
```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- tests/auth.test.js
```

## 🌐 Environment Variables

See `.env.example` for all available configuration options.

## 📦 Deployment

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Use strong JWT secrets
- [ ] Configure proper CORS settings
- [ ] Enable rate limiting
- [ ] Setup SSL/TLS certificates
- [ ] Configure logging to external service
- [ ] Setup database backups
- [ ] Configure Redis persistence
- [ ] Setup monitoring (Sentry, etc.)

## 🐛 Troubleshooting

### Common Issues

**Database connection fails:**
- Check MySQL is running: `mysql -u root -p`
- Verify credentials in `.env`
- Check database exists

**Redis connection fails:**
- Start Redis: `redis-server`
- Check Redis port (default: 6379)

**File uploads fail:**
- Verify AWS credentials in `.env`
- Check S3 bucket permissions
- Verify bucket name is correct

## 📝 License

Proprietary - SEIF Portal

## 👥 Team

Developed by the SEIF Development Team
