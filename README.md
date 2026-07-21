# Vyavastha: One Platform. Complete Restaurant Management.

Vyavastha is a production-ready, commercial-grade Restaurant Operating System (SaaS) built using a scalable Multi-Tenant Architecture. It consolidates table ordering, checkout payments, live kitchen display syncs, waiter management, and branch-level inventory warehousing under a unified platform.

---

## Key Features

- **Multi-Tenant Architecture**: Multi-branch restaurant management with role-based access control (RBAC).
- **Authentication & Onboarding**: Secure JWT authentication with HttpOnly cookies, refresh token rotation, and streamlined restaurant onboarding.
- **Live Kitchen Display System (KDS)**: Real-time order synchronization powered by Socket.IO for kitchen staff and waiters.
- **Menu Management**: Dynamic menu hierarchy, category management, pricing, and item availability controls.
- **Inventory & Warehousing**: Branch-level stock tracking, automated alerts, and raw item movement logging.
- **Table Management & Waiter Console**: Digital table layout mapping, active session tracking, and waiter order entry.
- **Billing & POS Integration**: Seamless checkout processing, invoice generation, and financial reporting.

---

## Technical Stack

### Frontend
- **Framework**: React 19, Vite 8
- **Styling**: Tailwind CSS v4, Framer Motion, Class Variance Authority (`cva`), `clsx`, `tailwind-merge`
- **State Management**: TanStack Query v5 (Server State), Zustand v5 (Application/UI State)
- **Forms & Validation**: React Hook Form, Zod v4
- **Real-Time Communication**: Socket.IO Client v4
- **Routing & UI Feedback**: React Router v7, React Hot Toast, Lucide React
- **Code Quality**: Oxlint

### Backend
- **Framework**: Node.js, Express.js (ES Modules)
- **Database**: MongoDB, Mongoose ORM v8
- **Security & Utilities**: JWT, Helmet, CORS, Rate Limiting (`express-rate-limit`), Cookie Parser, HPP, Compression
- **Real-Time Engine**: Socket.IO v4
- **File Uploads & Mail**: Cloudinary, Multer, Nodemailer

---

## Project Structure

```
Vyavastha/
├── client/                     # React 19 Single Page Application
│   ├── src/
│   │   ├── api/                # Axios API client instances & endpoints
│   │   ├── components/         # Shared UI components & layouts
│   │   ├── features/           # Feature modules (auth, dashboard, inventory, live-orders, menu, onboarding, staff, tables, waiter)
│   │   ├── routes/             # App router definitions & protected routes
│   │   ├── socket/             # Socket.IO client connection & event listeners
│   │   ├── store/              # Zustand global state stores
│   │   └── utils/              # Utility helpers & formatters
│   ├── package.json            # Client dependencies and scripts
│   └── vite.config.js          # Vite build configuration
├── server/                     # Express.js REST & WebSockets Backend Engine
│   ├── src/
│   │   ├── config/             # Database, Mailer, Cloudinary, and App configurations
│   │   ├── middleware/         # Authentication, Error handling, Rate limiting, and Validation
│   │   ├── models/             # Mongoose schemas & data models
│   │   ├── modules/            # Domain controllers, services, and routes
│   │   ├── repositories/       # Data access layer repositories
│   │   ├── socket/             # WebSockets server event handlers
│   │   └── utils/              # Helper utilities & custom errors
│   ├── .env.example            # Environment configuration template
│   ├── package.json            # Server dependencies and scripts
│   └── server.js               # Express application entry point
├── .gitignore                  # Git ignore rules for node_modules, env, dist, logs
└── README.md                   # Project documentation
```

---

## Getting Started

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **MongoDB**: Local instance running at `mongodb://localhost:27017` or a MongoDB Atlas cluster URI

---

### 1. Backend Setup (`/server`)

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Copy `.env.example` to create your `.env` configuration file:
   ```bash
   cp .env.example .env
   ```
   *(On Windows PowerShell, run: `copy .env.example .env`)*

3. Configure your environment variables inside [server/.env](file:///d:/Demo-vyavstha/server/.env):
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/vyavastha
   JWT_SECRET=your_jwt_access_secret_key_here
   JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_here
   JWT_EXPIRES_IN=60m
   JWT_REFRESH_EXPIRES_IN=7d
   CLIENT_URL=http://localhost:5173
   ```

4. Install dependencies and start the backend development server:
   ```bash
   npm install
   npm run dev
   ```

---

### 2. Frontend Setup (`/client`)

1. Open a new terminal and navigate to the client directory:
   ```bash
   cd client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:5173](http://localhost:5173) in your browser to access the application.

---

## Available Scripts

### Client Scripts ([client/package.json](file:///d:/Demo-vyavstha/client/package.json))
- `npm run dev` - Starts Vite dev server with hot reload
- `npm run build` - Builds production bundle into `dist`
- `npm run preview` - Previews production build locally
- `npm run lint` - Runs Oxlint linter check

### Server Scripts ([server/package.json](file:///d:/Demo-vyavstha/server/package.json))
- `npm run dev` - Starts server with Nodemon auto-restart
- `npm start` - Starts production Node server ([server/server.js](file:///d:/Demo-vyavstha/server/server.js))
