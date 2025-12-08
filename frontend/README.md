# SEIF Portal - Frontend# React + Vite

Modern React-based frontend application for the SEIF Portal with role-based authentication and dashboards.This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## 🚀 Tech StackCurrently, two official plugins are available:

- **Framework**: React 18 with Vite- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh

- **Language**: JavaScript (ES6+)- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

- **Styling**: Tailwind CSS

- **State Management**: Redux Toolkit## React Compiler

- **Routing**: React Router v6

- **HTTP Client**: AxiosThe React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

- **Icons**: Heroicons

- **UI Components**: Custom components with Tailwind CSS## Expanding the ESLint configuration

## 📁 Project StructureIf you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

```
frontend/
├── src/
│   ├── api/               # API service layer
│   ├── components/        # Reusable components
│   │   ├── common/        # Button, Input, Card, etc.
│   │   └── layout/        # Sidebar, Header, MainLayout
│   ├── constants/         # API URLs, roles, routes
│   ├── hooks/             # Custom hooks (useAuth)
│   ├── pages/             # Login, Dashboard, NotFound
│   ├── routes/            # Route configuration
│   ├── store/             # Redux store & slices
│   ├── utils/             # Helper functions
│   └── App.jsx            # Main app component
├── .env                   # Environment variables
└── tailwind.config.js     # Tailwind configuration
```

## 🎨 Design System

**Colors** (SEIF/Schneider Electric):

- Primary: Green `#3DCD58`
- Secondary: Orange `#F59E0B`
- Background: White/Light Gray
- Sidebar: Dark Gray `#1F2937`

## 🔐 User Roles

1. **SUPER_ADMIN** - Full system access
2. **ADMIN** - Manage partners, centers, data
3. **PARTNER** - Upload data, manage requests
4. **SEIF_READONLY** - View analytics
5. **ESSCI** - Download and export data

## 🚀 Getting Started

### Installation

```bash
npm install
```

### Configuration

Update `.env` file:

```env
VITE_API_URL=http://localhost:5000/api/v1
```

### Development

```bash
npm run dev
```

Frontend: `http://localhost:5173`
Backend: `http://localhost:5000`

### Build

```bash
npm run build
```

## 🔑 Test Credentials

| Role        | Email                   | Password    |
| ----------- | ----------------------- | ----------- |
| Super Admin | superadmin@seif.org     | Password123 |
| Admin       | admin@seif.org          | Password123 |
| Partner     | partner@testpartner.org | Password123 |
| Read-Only   | readonly@seif.org       | Password123 |
| ESSCI       | essci@seif.org          | Password123 |

## ✅ Implemented Features

### Phase 1: Login & Dashboard

- ✅ Login with email/password
- ✅ Form validation
- ✅ JWT token management (access + refresh)
- ✅ Protected routes
- ✅ Role-based sidebar navigation
- ✅ Role-specific dashboards
- ✅ User profile dropdown & logout
- ✅ Responsive design (mobile + desktop)

### Dashboard by Role

**Admin/Super Admin**: Stats, uploads, requests
**Partner**: Quick actions, notifications
**SEIF Read-Only**: Analytics, geographic data
**ESSCI**: Data export buttons

## 📦 Key Dependencies

- `react` & `react-dom` - UI library
- `react-router-dom` - Routing
- `@reduxjs/toolkit` & `react-redux` - State management
- `axios` - HTTP client
- `tailwindcss` - Styling
- `@heroicons/react` - Icons

## 🔜 Next Phases

- **Phase 2**: User Management (CRUD)
- **Phase 3**: Partner Management
- **Phase 4**: Data Upload Management
- **Phase 5**: Request Management
- **Phase 6**: Reports & Analytics

---

**Built for SEIF Portal**
