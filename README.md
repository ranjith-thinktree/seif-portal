# SEIF Portal

**Skills Excellence & Innovation Foundation (SEIF) Portal** - A comprehensive platform for managing training partners, centers, students, refurbishment packages, and employment outcomes with full role-based access control.

## Features

- **Partner Management** - Onboard, manage, and review training partners
- **Center Management** - Track, approve, and organise training centers
- **Student & Batch Management** - Comprehensive student database with batch tracking
- **Refurbishment Packages** - Create and manage equipment refurbishment packages; partners raise requests, admins review
- **Organisation Management** - Manage organisation-level partner and center hierarchies
- **Bulk Upload** - CSV-based bulk upload for partners, centers, and students
- **Role-Based Access Control** - `SUPER_ADMIN`, `ADMIN`, `PARTNER`, `ESSCI`, `SEIF_READONLY`
- **Real-time Notifications** - WebSocket-based inbox with scheduled notification support
- **Analytics Dashboard** - Training statistics, India-wide heatmaps, and batch insights
- **Review & Approval Workflows** - All-or-nothing partner upload approvals

## Tech Stack

### Backend

| Technology | Version |
|---|---|
| Node.js | 20.x |
| Express.js | 4.x |
| MySQL | 8.0 |
| Socket.io | 4.x |
| JWT | (access 1h / refresh 7d) |
| PM2 | Process Manager |

### Frontend

| Technology | Version |
|---|---|
| React | 19.x |
| Vite | 6.x |
| Redux Toolkit | 2.x |
| TailwindCSS | 3.x |
| Radix UI | Primitives |
| Recharts | Charting |

### Infrastructure

- **AWS RDS** - MySQL 8.0 database
- **AWS EC2** - Backend API server (PM2)
- **AWS S3** - Frontend static hosting
- **GitHub Actions** - CI/CD (push to `main` auto-deploys)

## Project Structure

```
SEIF/
+-- Database.sql                  # Full database schema & seed data
+-- backend/
-   +-- src/
-   -   +-- api/v1/
-   -   -   +-- controllers/      # Request handlers
-   -   -   +-- routes/           # Express routers
-   -   -   +-- services/         # Business logic (static class methods)
-   -   -   +-- validators/       # Request validation
-   -   +-- middleware/           # auth, role-check, validate, imageUpload
-   -   +-- models/               # Raw SQL models (mysql2 pool)
-   -   +-- utils/                # ApiResponse, error classes, S3, logger
-   -   +-- websocket/            # Socket.io server & notification emitter
-   +-- migrations/               # Incremental SQL schema migrations
-   +-- scripts/                  # Seed data & DB utility scripts
-   +-- tests/                    # Jest unit & integration tests
-   +-- ecosystem.config.js       # PM2 production config
+-- frontend/
-   +-- src/
-   -   +-- components/           # Shared UI (Radix + Tailwind)
-   -   +-- pages/                # Page-level components by module
-   -   +-- services/             # Axios API services
-   -   +-- store/                # Redux slices & store
-   -   +-- hooks/                # Custom React hooks
-   -   +-- context/              # Notification context
-   +-- tests/                    # Playwright e2e tests
+-- .github/
    +-- workflows/                # GitHub Actions CI/CD
```

## Getting Started

### Prerequisites

- Node.js 20.x
- MySQL 8.0
- AWS account (for production deployment)

### Local Development

**1. Database**

```bash
mysql -u root -p < Database.sql
```

**2. Backend** (runs on port 5000)

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

**3. Frontend** (runs on port 5173)

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

### Demo Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@seif.org | Password123 |
| Partner | demo.partner@seif.org | Password123 |

## Environment Variables

**Backend (`.env`)**

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=seif
DB_USER=root
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret
FRONTEND_URL=http://localhost:5173
AWS_REGION=ap-south-1
AWS_S3_BUCKET=your-bucket
NODE_ENV=development
```

**Frontend (`.env`)**

```env
VITE_API_BASE_URL=http://localhost:5000
```

## Key Modules

### Refurbishment Management

Partners browse available refurbishment packages and submit requests. Admins review, approve or reject with comments. Email/in-app notifications are triggered at each stage.

### Organisation Management

Admins create organisations and assign partners/centers under them, enabling hierarchical reporting across the portal.

### Notification System

WebSocket real-time notifications with an in-app inbox, scheduled notifications, and badge counters. Notification state persists in the database.

## Production Deployment

Push to the `main` branch triggers GitHub Actions:

1. **Backend** - SSH to EC2, pull latest, `npm ci`, restart PM2
2. **Frontend** - `npm run build`, sync `dist/` to S3

Manual deploy scripts:

```powershell
.\deploy-to-ec2.ps1   # backend
.\quick-deploy.ps1    # frontend
.\start-local.ps1     # local dev startup
```

## Testing

```bash
# Backend unit tests
cd backend && npm test

# Frontend e2e tests (Playwright)
cd frontend && npx playwright test
```

## Security

- JWT access + refresh token rotation
- bcrypt password hashing
- Role-based middleware on every protected route
- SQL injection prevention via parameterised queries
- S3 presigned URL uploads (no credentials in frontend)
- CORS restricted to `FRONTEND_URL`

## License

Proprietary - ThinkTree Media

## Contact

Developed by **ThinkTree Media**  
[ranjith@thinktreemedia.in](mailto:ranjith@thinktreemedia.in)

---

**Version**: 2.0.0 | **Last Updated**: February 2026