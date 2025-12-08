# SEIF Portal - Training Management System

A comprehensive web-based portal for managing training centers, partners, batches, and students for the Skills Enhancement and Income Facilitation (SEIF) program.

## 🚀 Features

- **Partner Management**: Manage partner organizations with approval workflows
- **Center Management**: Track training centers with location and facility details
- **Batch Management**: Organize training batches with student enrollment
- **Student Management**: Complete student lifecycle tracking
- **Data Upload**: CSV-based bulk data upload with validation and preview
- **Review System**: Admin review and approval workflows for uploaded data
- **Real-time Notifications**: Socket.io based notification system
- **Role-Based Access Control**: Different access levels (Super Admin, Admin, Partner, ESSCI, Read-Only)
- **Export/Import**: CSV export functionality for all data

## 📁 Project Structure

```
SEIF/
├── backend/                 # Node.js + Express backend
│   ├── src/
│   │   ├── api/v1/         # API routes, controllers, services
│   │   ├── config/         # Configuration files
│   │   ├── database/       # Database connection
│   │   ├── middleware/     # Authentication, validation, error handling
│   │   ├── utils/          # Utility functions
│   │   └── websocket/      # Socket.io implementation
│   └── templates/          # CSV templates
└── frontend/               # React + Vite frontend
    ├── src/
    │   ├── components/     # Reusable components
    │   ├── pages/          # Page components
    │   ├── services/       # API service layer
    │   ├── routes/         # Route configuration
    │   └── utils/          # Utility functions
```

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MySQL
- **Real-time**: Socket.io
- **Authentication**: JWT
- **Validation**: Joi
- **CSV Parsing**: PapaParse
- **File Uploads**: Multer

### Frontend
- **Framework**: React 19.2.0
- **Build Tool**: Vite
- **Routing**: React Router v6
- **State Management**: Redux Toolkit
- **UI Components**: Shadcn UI, Heroicons
- **Styling**: Tailwind CSS
- **Data Grid**: AG Grid Community
- **Notifications**: React Toastify

## 📋 Prerequisites

- Node.js (v16 or higher)
- MySQL (v8 or higher)
- npm or yarn

## 🔧 Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd SEIF
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the backend directory:

```env
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=seif
DB_PORT=3306

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d

# File Upload
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760

# CORS
CORS_ORIGIN=http://localhost:5173
```

### 3. Database Setup

Import the database schema:

```bash
mysql -u root -p seif < db_7.sql
```

### 4. Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env` file in the frontend directory:

```env
VITE_API_URL=http://localhost:5000/api/v1
VITE_SOCKET_URL=http://localhost:5000
```

## 🚀 Running the Application

### Start Backend Server

```bash
cd backend
npm run dev
```

The backend will run on `http://localhost:5000`

### Start Frontend Development Server

```bash
cd frontend
npm run dev
```

The frontend will run on `http://localhost:5173`

## 👥 Default Users

After importing the database, you can login with these credentials:

| Role | Email | Password |
|------|-------|----------|
| Super Admin | superadmin@seif.org | password123 |
| Admin | admin@seif.org | password123 |
| Partner | partner@testpartner.org | password123 |
| ESSCI | essci@seif.org | password123 |
| Read Only | readonly@seif.org | password123 |

## 📚 API Endpoints

The API provides RESTful endpoints for:
- Authentication (`/api/v1/auth`)
- Partners (`/api/v1/partners`)
- Centers (`/api/v1/centers`)
- Batches (`/api/v1/batches`)
- Students (`/api/v1/students`)
- Data Upload (`/api/v1/uploads`)
- Review & Approval (`/api/v1/review`)
- Notifications (`/api/v1/notifications`)

## 🔐 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- Input validation and sanitization
- SQL injection prevention
- XSS protection

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request

## 📄 License

This project is proprietary and confidential.

## 👨‍💻 Developer

Developed by Ranjith @ ThinkTree Media

## 📞 Support

For support, email: ranjith@thinktreemedia.in
