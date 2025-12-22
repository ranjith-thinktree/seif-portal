# SEIF Portal

**Skills Excellence & Innovation Foundation (SEIF) Portal** - A comprehensive platform for managing partners, centers, students, and training programs.

## 🚀 Features

- **Partner Management**: Onboard and manage training partners
- **Center Management**: Track and approve training centers
- **Student Management**: Comprehensive student database with batch tracking
- **Bulk Upload**: CSV-based bulk upload for partners and centers
- **Role-Based Access Control**: SUPER_ADMIN, ADMIN, PARTNER, ESSCI, SEIF_READONLY
- **Real-time Notifications**: WebSocket-based notification system
- **Analytics Dashboard**: Training statistics and insights
- **Review System**: Partner and center approval workflows

## 🛠️ Tech Stack

### Backend

- Node.js 20.x
- Express.js
- MySQL 8.0
- JWT Authentication
- WebSocket (Socket.io)
- PM2 Process Manager

### Frontend

- React 19.2.0
- Vite
- Redux Toolkit
- TailwindCSS
- Recharts

### Infrastructure

- AWS RDS (MySQL Database)
- AWS EC2 (Backend API)
- AWS S3 (Frontend Static Hosting)
- GitHub Actions (CI/CD)

## 📦 Project Structure

```
SEIF/
├── backend/           # Node.js API server
│   ├── src/
│   │   ├── api/v1/   # Routes, controllers, services
│   │   ├── models/   # Database models
│   │   ├── middleware/
│   │   └── utils/
│   ├── migrations/   # Database migration scripts
│   └── tests/        # Jest test suites
├── frontend/         # React application
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── store/
│   └── public/
└── .github/
    └── workflows/    # CI/CD automation
```

## 🚀 Getting Started

### Prerequisites

- Node.js 20.x
- MySQL 8.0
- AWS Account (for production deployment)

### Local Development

**Backend:**

```bash
cd backend
npm install
cp .env.example .env
# Configure your .env file
npm run dev
```

**Frontend:**

```bash
cd frontend
npm install
cp .env.example .env
# Set VITE_API_BASE_URL to your backend URL
npm run dev
```

## 🌐 Production Deployment

The application uses GitHub Actions for automated deployment:

- **Backend**: Deployed to AWS EC2 with PM2
- **Frontend**: Deployed to AWS S3 with static website hosting

Push to `main` branch triggers automatic deployment.

## 🔒 Security

- JWT-based authentication
- Role-based authorization
- Password hashing with bcrypt
- SQL injection prevention
- CORS configuration
- Environment variable protection

## 📝 License

Proprietary - ThinkTree Media

## 👥 Team

Developed by ThinkTree Media
Contact: ranjith@thinktreemedia.in

---

**Version**: 1.0.0  
**Last Updated**: December 2025
