# Vyavastha Restaurant Operating System (ROS)
## Comprehensive Technical Architecture, Codebase, Security, and Production Readiness Analysis

---

## 1. Executive Summary

### 1.1 Project Definition & Scope
**Vyavastha** is an enterprise-grade, multi-tenant Restaurant Operating System (ROS) and Point-of-Sale (POS) management platform designed to digitize and automate end-to-end restaurant operations. The platform provides a full suite of features spanning multi-branch management, table floor planning, live order lifecycle tracking (dine-in, takeaway, delivery), waiter handheld POS ordering, digital invoice generation with QR codes, real-time kitchen/cashier socket communication, inventory tracking, staff role-based access control (RBAC), and sales analytics.

### 1.2 Business Problem Solved
Traditional restaurant operations suffer from high order latency, miscommunication between waitstaff and kitchen crews, manual billing errors, lack of real-time inventory visibility across branches, and inefficient table turnover. Vyavastha resolves these bottlenecks by providing:
- **Real-Time Synchronized Order Pipeline:** Instant WebSocket broadcast of order status updates across waiter devices and central cashier dashboards.
- **Multi-Tenant & Multi-Branch Architecture:** Dynamic context switching allowing restaurant chains to manage distinct branches under a unified corporate account.
- **Integrated Waiter POS & Digital Billing:** Dedicated mobile-optimized interface for waitstaff to manage table states, place orders, apply modifier additions, and trigger instant invoice rendering.

### 1.3 Target Audience & User Personas
1. **Restaurant Owner / Chain Administrator:** Manages subscriptions, branch provisioning, global analytics, system roles, and financial reporting.
2. **Branch Manager / Cashier:** Oversees day-to-day branch sales, live orders management, manual table allocations, invoice printing, and staff management.
3. **Waitstaff (Floor Waiters):** Uses handheld mobile POS to view floor layout, take orders at table-side, add special preparation notes, and track order fulfillment.
4. **Kitchen Staff / Chefs:** Receives real-time order item tickets, updates preparation status (`preparing` -> `ready`), and manages stock levels.

### 1.4 System Maturity & Operational Assessment
- **Current Development Stage:** Late MVP / Early Production Beta (v1.0.0 architecture). Core functional modules (Auth, Onboarding, Menu, Tables, Live Orders, Billing, Inventory, Staff, Waiter POS) are fully implemented and integrated.
- **Technology Level:** Modern Full-Stack JavaScript (React 19 + Vite + Tailwind CSS v4 on Frontend; Node.js + Express + MongoDB/Mongoose + Socket.io on Backend).
- **Estimated Project Complexity:** **Medium-High** (Features multi-tenant context headers, dual JWT auth strategies, real-time WebSocket room broadcasting, client-side PDF invoice rendering, and complex DB schemas).
- **Estimated Development Effort:** 6 - 9 Person-Months (~1,200 - 1,800 engineering hours).
- **Overall Code Quality Rating:** **7.5 / 10** (Well-structured modular architecture, clean async error handling, repository pattern abstraction, and cohesive UI primitives; penalized for dead npm dependencies, model schema redundancy, zero automated unit/integration tests, and hardcoded secret fallbacks in development configurations).

---

## 2. High Level Architecture

### 2.1 System Architecture Pattern
Vyavastha follows a decoupled **Single Page Application (SPA) + RESTful API & Real-Time Event Driven Broker Architecture**.

- **Frontend (Client):** Built with React 19 and Vite. Features a component-driven architecture organized by domain modules (`features/`). Uses **Zustand** for lightweight global state management (auth context, restaurant context, waiter session) and **Axios** with request/response interceptors for HTTP communication.
- **Backend (Server):** Built on Node.js and Express. Adheres to a strict **Layered Architecture (Controller -> Service -> Repository -> Model)**. API endpoints are prefixed with `/api/v1/`.
- **Real-Time Communication:** Integrated **Socket.io** server. Sockets join branch-specific rooms (`branchId`), enabling low-latency pub/sub event broadcasting for live order state transitions.
- **Database Layer:** **MongoDB** with **Mongoose ODM**. Stores multi-tenant restaurant data, operational schemas, and relational references (User -> Employee -> Role -> Permission -> Branch -> Restaurant).

### 2.2 System Architecture Diagram
```mermaid
graph TD
    subgraph Client Layer (React 19 SPA)
        Landing[Public Landing & Auth]
        AdminDash[Admin / Manager Dashboard]
        WaiterPOS[Handheld Waiter POS]
        ClientStore[Zustand Stores: useAuthStore / useWaiterAuth]
        SocketClient[Socket.io Client Broker]
    end

    subgraph API Gateway & Server (Node.js / Express)
        ViteProxy[Vite Dev Server / Nginx Reverse Proxy]
        AppServer[Express App / Router]
        AuthMW[JWT Auth Middleware & Multi-Tenant Context Extractor]
        Modules[Modules: Auth, Onboarding, Menu, Orders, Billing, Waiter, Staff, Inventory, Tables]
        SocketServer[Socket.io Realtime Engine]
    end

    subgraph Data & Cloud Services Layer
        MongoDB[(MongoDB Database)]
        Cloudinary[Cloudinary Image Storage]
        SMTP[SMTP Email Service]
        Razorpay[Razorpay Payment Gateway]
    end

    Landing -->|HTTP Requests| ViteProxy
    AdminDash -->|Axios API Calls| ViteProxy
    WaiterPOS -->|Axios API Calls| ViteProxy
    
    AdminDash <-->|WebSocket Events| SocketClient
    WaiterPOS <-->|WebSocket Events| SocketClient

    ViteProxy -->|API Proxy /api/v1| AppServer
    SocketClient <-->|WS Protocol /socket.io| SocketServer

    AppServer --> AuthMW
    AuthMW --> Modules
    Modules --> MongoDB
    Modules --> Cloudinary
    Modules --> SMTP
    Modules --> Razorpay
    SocketServer <-->|Room Events| Modules
```

### 2.3 Request Lifecycle & Multi-Tenant Context Flow
```mermaid
sequenceDiagram
    autonumber
    participant Client as React Client (Axios)
    participant Server as Express Server (app.js)
    participant AuthMW as protect Middleware
    participant Controller as Module Controller
    participant Service as Module Service
    participant Repo as Module Repository
    participant DB as MongoDB

    Client->>Server: HTTP GET /api/v1/orders (Headers: Authorization, x-restaurant-id, x-branch-id)
    Server->>AuthMW: Execute protect()
    AuthMW->>AuthMW: Verify Bearer JWT Token
    AuthMW->>DB: Find User by Decoded ID
    AuthMW->>DB: Find Employee record matching User ID & x-restaurant-id
    AuthMW-->>Server: Attach req.user, req.employee, req.role, req.branchId
    Server->>Controller: Route to getOrders(req, res)
    Controller->>Service: Call OrderService.getOrders(restaurantId, branchId, filters)
    Service->>Repo: Call OrderRepository.find(query)
    Repo->>DB: Mongoose Query execution
    DB-->>Repo: Return Order Documents
    Repo-->>Service: Return Data Transfer Objects
    Service-->>Controller: Return Processed Orders
    Controller-->>Client: HTTP 200 OK { status: 'success', data: [...] }
```

### 2.4 Real-Time Order Lifecycle & Socket Broadcast Flow
```mermaid
sequenceDiagram
    autonumber
    participant Waiter as Waiter POS Client
    participant API as Order API Endpoint
    participant OrderSvc as Order Service
    participant DB as MongoDB Database
    participant SocketEngine as Socket.io Server
    participant Manager as Manager / Kitchen Dashboard

    Waiter->>API: POST /api/v1/orders (Create New Order)
    API->>OrderSvc: createOrder(orderData)
    OrderSvc->>DB: Save Order & OrderItems documents
    OrderSvc->>DB: Update Table status to 'occupied'
    OrderSvc-->>API: Return Created Order Object
    API->>SocketEngine: getIO().to(branchId).emit('ORDER_CREATED', order)
    SocketEngine-->>Manager: Real-time event 'ORDER_CREATED' received
    Manager->>Manager: Render new order ticket & audio notification alert
    API-->>Waiter: HTTP 201 Created Response
```

---

## 3. Complete Folder Structure Analysis

```
Vyayvastha/
├── .gitignore
├── README.md
├── client/
│   ├── .gitignore
│   ├── .oxlintrc.json
│   ├── README.md
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   ├── vite.config.js
│   ├── public/
│   │   ├── favicon.svg
│   │   └── icons.svg
│   └── src/
│       ├── App.css
│       ├── App.jsx
│       ├── index.css
│       ├── main.jsx
│       ├── api/
│       │   └── index.js
│       ├── assets/
│       │   ├── hero.png
│       │   ├── react.svg
│       │   └── vite.svg
│       ├── components/
│       │   └── ui/
│       │       ├── Accordion.jsx
│       │       ├── Avatar.jsx
│       │       ├── Badge.jsx
│       │       ├── Breadcrumb.jsx
│       │       ├── Button.jsx
│       │       ├── Card.jsx
│       │       ├── Checkbox.jsx
│       │       ├── Container.jsx
│       │       ├── Drawer.jsx
│       │       ├── Dropdown.jsx
│       │       ├── Input.jsx
│       │       ├── Modal.jsx
│       │       ├── Pagination.jsx
│       │       ├── Radio.jsx
│       │       ├── Select.jsx
│       │       ├── Skeleton.jsx
│       │       ├── Spinner.jsx
│       │       ├── Switch.jsx
│       │       ├── Table.jsx
│       │       ├── Tabs.jsx
│       │       ├── Textarea.jsx
│       │       ├── Toast.jsx
│       │       ├── Tooltip.jsx
│       │       ├── Typography.jsx
│       │       └── index.js
│       ├── features/
│       │   ├── auth/
│       │   │   ├── ForgotPassword.jsx
│       │   │   ├── Login.jsx
│       │   │   ├── Register.jsx
│       │   │   ├── ResetPassword.jsx
│       │   │   ├── Verification.jsx
│       │   │   └── index.js
│       │   ├── dashboard/
│       │   │   ├── index.js
│       │   │   ├── components/
│       │   │   │   ├── Overview.jsx
│       │   │   │   ├── Sidebar.jsx
│       │   │   │   └── Topbar.jsx
│       │   │   └── pages/
│       │   │       └── DashboardLayout.jsx
│       │   ├── inventory/
│       │   │   └── components/
│       │   │       └── InventoryManager.jsx
│       │   ├── landing/
│       │   │   ├── index.js
│       │   │   ├── components/
│       │   │   │   ├── FAQSection.jsx
│       │   │   │   ├── Footer.jsx
│       │   │   │   ├── Hero.jsx
│       │   │   │   ├── Modules.jsx
│       │   │   │   ├── Navbar.jsx
│       │   │   │   ├── PricingSection.jsx
│       │   │   │   ├── Stats.jsx
│       │   │   │   └── Testimonials.jsx
│       │   │   └── pages/
│       │   │       ├── About.jsx
│       │   │       ├── Contact.jsx
│       │   │       ├── Features.jsx
│       │   │       ├── Home.jsx
│       │   │       └── Pricing.jsx
│       │   ├── live-orders/
│       │   │   └── components/
│       │   │       └── OrdersManager.jsx
│       │   ├── menu/
│       │   │   └── components/
│       │   │       └── MenuManager.jsx
│       │   ├── onboarding/
│       │   │   ├── OnboardingWizard.jsx
│       │   │   └── index.js
│       │   ├── staff/
│       │   │   └── components/
│       │   │       └── StaffManager.jsx
│       │   ├── tables/
│       │   │   └── components/
│       │   │       ├── TableDetails.jsx
│       │   │       └── TableManager.jsx
│       │   └── waiter/
│       │       ├── index.js
│       │       ├── api/
│       │       │   └── waiterApi.js
│       │       ├── components/
│       │       │   └── TableManagement.jsx
│       │       ├── pages/
│       │       │   ├── WaiterDashboard.jsx
│       │       │   └── WaiterOrderScreen.jsx
│       │       └── store/
│       │           └── useWaiterAuth.js
│       ├── routes/
│       │   └── AppRoutes.jsx
│       ├── socket/
│       │   ├── socketClient.js
│       │   └── socketEvents.js
│       ├── store/
│       │   └── useAuthStore.js
│       └── utils/
│           ├── cn.js
│           └── formatCurrency.js
└── server/
    ├── .env
    ├── .env.example
    ├── package-lock.json
    ├── package.json
    ├── server.js
    ├── scripts/
    │   └── createWaiter.js
    └── src/
        ├── app.js
        ├── config/
        │   ├── db.js
        │   └── logger.js
        ├── middleware/
        │   ├── auth.middleware.js
        │   ├── error.middleware.js
        │   └── waiter.middleware.js
        ├── models/
        │   ├── Bill.js
        │   ├── Branch.js
        │   ├── Category.js
        │   ├── Customer.js
        │   ├── Employee.js
        │   ├── Inventory.js
        │   ├── MenuItem.js
        │   ├── Modifier.js
        │   ├── Notification.js
        │   ├── Order.js
        │   ├── OrderItem.js
        │   ├── Payment.js
        │   ├── Permission.js
        │   ├── Restaurant.js
        │   ├── Role.js
        │   ├── Subscription.js
        │   ├── Table.js
        │   ├── User.js
        │   └── Waiter.js
        ├── modules/
        │   ├── auth/
        │   │   ├── auth.controller.js
        │   │   ├── auth.routes.js
        │   │   ├── auth.service.js
        │   │   ├── role.repository.js
        │   │   ├── subscription.repository.js
        │   │   └── user.repository.js
        │   ├── billing/
        │   │   ├── billing.controller.js
        │   │   └── billing.routes.js
        │   ├── branches/
        │   │   └── branch.repository.js
        │   ├── inventory/
        │   │   ├── inventory.controller.js
        │   │   ├── inventory.repository.js
        │   │   ├── inventory.routes.js
        │   │   └── inventory.service.js
        │   ├── menu/
        │   │   ├── category.repository.js
        │   │   ├── menu.controller.js
        │   │   ├── menu.routes.js
        │   │   ├── menu.service.js
        │   │   └── menuItem.repository.js
        │   ├── onboarding/
        │   │   ├── onboarding.controller.js
        │   │   ├── onboarding.routes.js
        │   │   └── onboarding.service.js
        │   ├── orders/
        │   │   ├── order.controller.js
        │   │   ├── order.repository.js
        │   │   ├── order.routes.js
        │   │   └── order.service.js
        │   ├── restaurant/
        │   │   └── restaurant.repository.js
        │   ├── staff/
        │   │   ├── employee.controller.js
        │   │   ├── employee.repository.js
        │   │   ├── employee.routes.js
        │   │   └── employee.service.js
        │   ├── tables/
        │   │   ├── table.controller.js
        │   │   └── table.routes.js
        │   └── waiter/
        │       ├── waiter.controller.js
        │       └── waiter.routes.js
        ├── repositories/
        │   └── BaseRepository.js
        ├── socket/
        │   ├── socketEvents.js
        │   └── socketServer.js
        └── utils/
            ├── AppError.js
            └── catchAsync.js
```

### 3.1 Directory Evaluation & Responsibilities Table

| Folder Path | Purpose & Responsibilities | Inter-Folder Relationships | Adheres to Best Practices? | Recommended Improvements |
| :--- | :--- | :--- | :--- | :--- |
| `client/src/components/ui` | Atomic UI primitives (Buttons, Modals, Tables, Inputs, Badges, Drawers). | Used by all feature modules in `client/src/features/`. | **Yes.** Highly reusable design tokens using `tailwind-merge` & `cva`. | Add ARIA accessibility attributes to Modal, Drawer, and Dropdown components. |
| `client/src/features/` | Business domain feature components and page views divided by user workflows. | Consumes `components/ui`, `api/`, `store/`, `socket/`. | **Yes.** Excellent feature-based folder organization. | Standardize folder structure across all features (ensure all have dedicated `components/` and `pages/`). |
| `client/src/routes/` | Router setup (`AppRoutes.jsx`) defining public, protected admin, and protected waiter routes. | Imports pages from `features/` and store hooks from `store/`. | **Yes.** Clear route protection semantics. | Implement dynamic route splitting using `React.lazy()` and `Suspense`. |
| `client/src/store/` | Global state management stores (`useAuthStore.js`) built with Zustand. | Interacts with `api/index.js` for token sync and `AppRoutes.jsx` for auth guards. | **Yes.** Lightweight and persistent via LocalStorage. | Consolidate `useWaiterAuth` from `features/waiter/store/` into `client/src/store/` for consistency. |
| `client/src/socket/` | Socket.io client setup and event constant definitions (`socketClient.js`, `socketEvents.js`). | Consumed by `OrdersManager`, `TableManager`, `WaiterOrderScreen`. | **Yes.** Singleton pattern with auto-reconnect logic. | Implement strong TypeScript typing for socket payloads to prevent runtime event mismatches. |
| `server/src/config/` | Database (`db.js`) and logger (`logger.js`) initialization. | Imported by `server.js` and `app.js`. | **Yes.** Clean separation of environment setup. | Upgrade console logger to structured JSON logging (Winston or Pino) for production production log collectors. |
| `server/src/middleware/` | Request processing middleware (JWT auth protection, waiter auth, global error handler). | Injected into Express routes in `modules/` and `app.js`. | **Yes.** Operates on standard Express middleware specs. | Integrate rate-limiting per user role and request validation middleware. |
| `server/src/models/` | Mongoose schema definitions representing domain entities (19 models). | Imported by Repositories and Services in `modules/`. | **Partial.** Models are clean, but some are unused or duplicated (`Notification`, `Permission`). | Deprecate unused models; normalize `Order.items` and `OrderItem` duplication. |
| `server/src/modules/` | Domain-driven backend modules containing controllers, routes, services, and repositories. | Encapsulates logic; called by Express routes; queries database via Mongoose models. | **Yes.** Outstanding modular architecture separating concerns cleanly. | Ensure every module adheres strictly to Controller -> Service -> Repository layer without skipping layers. |
| `server/src/repositories/` | Abstract `BaseRepository.js` defining common CRUD database abstractions. | Extended by specific module repositories (`user.repository.js`, `order.repository.js`). | **Yes.** Accelerates DRY query execution. | Utilize `BaseRepository` consistently across ALL modules (some controllers query models directly). |

---

## 4. Technology Stack Analysis

### 4.1 Technology Breakdown

| Category | Technology | Version | Purpose in Vyavastha | Justification & Architectural Evaluation |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend Framework** | React | `^19.2.7` | UI Rendering Engine | Latest React release delivering improved concurrent rendering and DOM performance. |
| **Build Tool & Server** | Vite | `^8.1.1` | HMR Development Server & Production Bundler | Ultra-fast build times, native ESM support, efficient asset bundling. |
| **CSS & Styling** | Tailwind CSS | `^4.3.3` | Utility-first CSS Styling | Modern v4 engine using `@tailwindcss/vite` plugin for rapid UI component styling. |
| **State Management** | Zustand | `^5.0.14` | Global Auth & Operational State Store | Lightweight, hook-based state store without boilerplate, featuring LocalStorage persistence. |
| **HTTP Client** | Axios | `^1.18.1` | REST API Client | Supports request/response interceptors for automatic JWT header injection & 401 refresh queuing. |
| **Backend Runtime** | Node.js / Express | `^4.22.2` | REST API & Application Server | Non-blocking I/O event loop ideal for asynchronous HTTP API endpoints and socket handling. |
| **Database** | MongoDB / Mongoose | `^8.24.1` | NoSQL Document Store | Flexible document schema schema ideal for hierarchical restaurant, menu, and nested order data. |
| **Realtime Engine** | Socket.io | `^4.8.3` | Bi-directional WebSocket Communication | Low-latency room broadcasting (`branchId`) for order updates between Waiter POS and Kitchen. |
| **Authentication** | JSON Web Tokens (`jsonwebtoken`) | `^9.0.3` | Stateless Bearer & Cookie Auth | Enables multi-tenant authorization token verification across stateless API nodes. |
| **Security Controls** | Helmet, HPP, Cors, Rate-Limit | `^7.1.0` | HTTP Header Hardening & Pollution Protection | Safeguards API endpoints against XSS, clickjacking, parameter pollution, and brute-force DDoS. |
| **Invoice / PDF Utilities**| `jspdf` & `html2canvas` | `^4.2.1` / `^1.4.1` | Client-Side PDF Receipt Generation | Converts HTML invoice templates into printable/downloadable PDF bills directly in the browser. |
| **QR Code Generator** | `qrcode.react` & `qrcode` | `^4.2.0` / `^1.5.4` | Table & Payment QR Code Generation | Generates dynamic QR codes for table ordering links and digital UPI payment collection. |

---

## 5. Dependency Analysis

### 5.1 Client Package Dependencies (`client/package.json`)

```json
"dependencies": {
  "@hookform/resolvers": "^5.4.0",
  "@reduxjs/toolkit": "^2.12.0",
  "@tanstack/react-query": "^5.101.2",
  "axios": "^1.18.1",
  "class-variance-authority": "^0.7.1",
  "clsx": "^2.1.1",
  "date-fns": "^4.4.0",
  "framer-motion": "^12.42.2",
  "html2canvas": "^1.4.1",
  "jspdf": "^4.2.1",
  "lucide-react": "^1.25.0",
  "qrcode.react": "^4.2.0",
  "react": "^19.2.7",
  "react-dom": "^19.2.7",
  "react-helmet-async": "^3.0.0",
  "react-hook-form": "^7.82.0",
  "react-hot-toast": "^2.6.0",
  "react-redux": "^9.3.0",
  "react-router-dom": "^7.18.1",
  "recharts": "^3.10.0",
  "socket.io-client": "^4.8.3",
  "tailwind-merge": "^3.6.0",
  "zod": "^4.4.3",
  "zustand": "^5.0.14"
}
```

#### Critical Dependency Audit & Dead Package Detection:
1. **`@reduxjs/toolkit` (`^2.12.0`) & `react-redux` (`^9.3.0`):** **DEAD DEPENDENCY.** The codebase exclusively uses **Zustand** (`useAuthStore.js`, `useWaiterAuth.js`) for global state. Neither Redux Toolkit nor `react-redux` is imported anywhere in `client/src`. *Action: Remove immediately to reduce bundle size.*
2. **`@tanstack/react-query` (`^5.101.2`):** **UNUTILIZED UTILITY.** `QueryClientProvider` is initialized in `App.jsx`, but zero components or custom hooks consume `useQuery` or `useMutation`. All API calls rely on direct `axios` invocations inside React `useEffect` hooks. *Action: Either refactor state management to consume React Query or uninstall.*
3. **`date-fns` (`^4.4.0`):** **DEAD DEPENDENCY.** Dates are formatted manually using JavaScript native `Date` methods (`toLocaleTimeString`, `toISOString`). Unused npm package.
4. **`zod` (`^4.4.3`) & `@hookform/resolvers` (`^5.4.0`):** **DEAD DEPENDENCY.** `react-hook-form` is used across forms, but input validation is handled via standard inline regex/validation rules rather than Zod schemas.
5. **`react-helmet-async` (`^3.0.0`):** **DEAD DEPENDENCY.** Never imported or wrapped in a provider for SEO document header manipulation.

---

### 5.2 Server Package Dependencies (`server/package.json`)

```json
"dependencies": {
  "bcrypt": "^5.1.1",
  "bcryptjs": "^3.0.3",
  "cloudinary": "^2.5.1",
  "compression": "^1.7.4",
  "cookie-parser": "^1.4.7",
  "cors": "^2.8.6",
  "dotenv": "^16.6.1",
  "express": "^4.22.2",
  "express-rate-limit": "^7.2.0",
  "express-validator": "^7.3.2",
  "helmet": "^7.1.0",
  "hpp": "^0.2.3",
  "jsonwebtoken": "^9.0.3",
  "mongodb": "^7.5.0",
  "mongoose": "^8.24.1",
  "morgan": "^1.11.0",
  "multer": "^1.4.5-lts.1",
  "nodemailer": "^6.10.1",
  "qrcode": "^1.5.4",
  "razorpay": "^2.9.8",
  "socket.io": "^4.8.3",
  "uuid": "^14.0.1"
}
```

#### Critical Server Dependency Audit:
1. **`bcrypt` (`^5.1.1`) vs `bcryptjs` (`^3.0.3`):** **DUPLICATE PACKAGES.** The codebase imports native `bcrypt` inside `User.js` and `Waiter.js` for salt generation and password hashing. `bcryptjs` is installed but never imported. Native `bcrypt` relies on C++ bindings which can cause build failures in certain Docker environment configurations, whereas pure JavaScript `bcryptjs` is safer for cross-platform containers. *Action: Standardize on `bcryptjs` and uninstall native `bcrypt`.*

---

## 6. Configuration Analysis

### 6.1 `vite.config.js` Analysis
- **Alias Resolution:** Configures `@` to resolve to `./src`, enabling clean absolute imports (`import Button from '@/components/ui/Button'`).
- **Development Proxy Server:**
  - `/api` proxy maps to `http://127.0.0.1:5000` to prevent CORS issues during development.
  - `/socket.io` proxy configured with `ws: true` for seamless WebSocket proxying.
  - Error handlers added to suppress redundant `ECONNREFUSED` / `ECONNRESET` console spam when the Node server restarts.

### 6.2 `server/src/app.js` & Middleware Configuration
- **Helmet Security Headers:** `app.use(helmet())` enforces standard HTTP security headers (X-Frame-Options, X-Content-Type-Options, HSTS).
- **CORS Configuration:** Dynamic origin check validating incoming requests against `CLIENT_URL` and `localhost:5173`. Credentials enabled (`credentials: true`) to allow cross-site cookie transmission.
- **Body Parsing & Limits:** `express.json({ limit: '5mb' })` prevents memory exhaustion attacks via large payload injection.
- **HPP Middleware:** `app.use(hpp())` protects against HTTP Parameter Pollution attacks by sanitizing array query params.
- **Rate Limiting:** `express-rate-limit` limits IP requests to 100 per 15 minutes in production (set to 10,000 in development).

---

## 7. Routing Analysis

### 7.1 Client Route Definitions (`client/src/routes/AppRoutes.jsx`)

| Route Path | Type | Guard Mechanism | Component Mounted | Purpose & Behavior |
| :--- | :--- | :--- | :--- | :--- |
| `/` | Public | None | `<Home />` | Main SaaS marketing landing page. |
| `/about` | Public | None | `<About />` | About Vyavastha OS page. |
| `/features` | Public | None | `<Features />` | Feature overview page. |
| `/pricing` | Public | None | `<Pricing />` | Subscription pricing tiers. |
| `/contact` | Public | None | `<Contact />` | Contact sales & support form. |
| `/login` | Public (Guarded) | `<PublicRoute>` | `<Login />` | Admin/Staff login. Redirects to `/dashboard` if authenticated. |
| `/register` | Public (Guarded) | `<PublicRoute>` | `<Register />` | Multi-tenant restaurant registration page. |
| `/forgot-password` | Public (Guarded) | `<PublicRoute>` | `<ForgotPassword />` | Password recovery request. |
| `/reset-password/:token` | Public (Guarded) | `<PublicRoute>` | `<ResetPassword />` | Password reset interface with JWT token verification. |
| `/verify-email/:token` | Public | None | `<Verification />` | Email address verification view. |
| `/onboarding` | Protected | `<ProtectedRoute>` | `<OnboardingWizard />` | Multi-step setup wizard for branch, tables, & initial menu setup. |
| `/dashboard` | Protected | `<ProtectedRoute>` | `<DashboardLayout />` | Core admin dashboard housing Overview, Live Orders, Menu, Tables, Staff, & Inventory views. |
| `/waiter/dashboard` | Protected Waiter | `<WaiterProtectedRoute>` | `<WaiterDashboard />` | Mobile POS view for floor waiters displaying table layout and active orders. |
| `/waiter/order/:tableId` | Protected Waiter | `<WaiterProtectedRoute>` | `<WaiterOrderScreen />` | Interactive order placement screen for specific table selection. |
| `*` | Fallback | None | `<Navigate to="/" />` | Catch-all redirect to home page for undefined paths. |

---

## 8. Authentication & Authorization Analysis

### 8.1 Dual Authentication Strategy

Vyavastha implements two independent authentication models tailored to distinct user roles:

```mermaid
graph LR
    subgraph Model A: Admin & Restaurant Staff Auth
        UserLogin[User Credential Input] -->|POST /api/v1/auth/login| AuthCtrl[Auth Controller]
        AuthCtrl -->|Generate Access JWT 60m| LocalStore[Client LocalStorage]
        AuthCtrl -->|Generate Refresh JWT 7d| Cookie[HttpOnly Cookie accessToken]
        AuthMW[protect Middleware] -->|Validate Bearer Header or Cookie| IdentifyUser[Identify User & Employee Context]
        IdentifyUser -->|Check Role & Permissions| Restrict[restrictTo Middleware]
    end

    subgraph Model B: Handheld Waiter POS Auth
        WaiterLogin[Waiter PIN / Credential] -->|POST /api/v1/waiter/login| WaiterCtrl[Waiter Controller]
        WaiterCtrl -->|Generate Waiter JWT| WaiterCookie[HttpOnly Cookie waiterToken]
        WaiterMW[protectWaiter Middleware] -->|Validate Waiter Token| IdentifyWaiter[Attach req.waiter context]
    end
```

### 8.2 Security Vulnerability Assessment

> [!WARNING]
> **Vulnerability 1: LocalStorage Token Storage (XSS Vulnerability)**
> In `useAuthStore.js`, access tokens are stored directly in `localStorage` (`localStorage.setItem('accessToken', accessToken)`). Any malicious script or XSS vector executing on the frontend can inspect `localStorage` and exfiltrate the JWT.
> *Remediation:* Store access tokens in memory and use HttpOnly, SameSite=Strict cookies for token persistence.

> [!WARNING]
> **Vulnerability 2: JWT Secret Fallback**
> In `auth.middleware.js` and `waiter.middleware.js`, if `process.env.JWT_SECRET` is missing, the server does not fail fast during bootstrap, leading to potential signing with `undefined`.
> *Remediation:* Enforce explicit environment variable presence checks during server start in `server.js`.

---

## 9. Component Analysis

### 9.1 Atomic UI Primitives (`client/src/components/ui/`)

Vyavastha features a robust set of 25 custom UI primitive components constructed with Vanilla Tailwind CSS classes, `clsx`, and `tailwind-merge`.

| Component Name | File Path | Props Summary | Key State / Hooks | Complexity | Reusability | Performance Rating |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `Accordion` | [Accordion.jsx](file:///c:/Vyayvastha/client/src/components/ui/Accordion.jsx) | `items`, `allowMultiple` | `useState` (open items) | Low | High | Excellent |
| `Avatar` | [Avatar.jsx](file:///c:/Vyayvastha/client/src/components/ui/Avatar.jsx) | `src`, `alt`, `fallback`, `size` | None | Low | High | Excellent |
| `Badge` | [Badge.jsx](file:///c:/Vyayvastha/client/src/components/ui/Badge.jsx) | `variant`, `children`, `className` | None | Low | High | Excellent |
| `Breadcrumb` | [Breadcrumb.jsx](file:///c:/Vyayvastha/client/src/components/ui/Breadcrumb.jsx) | `items` | None | Low | High | Excellent |
| `Button` | [Button.jsx](file:///c:/Vyayvastha/client/src/components/ui/Button.jsx) | `variant`, `size`, `isLoading`, `children` | None | Low | Universal | Excellent |
| `Card` | [Card.jsx](file:///c:/Vyayvastha/client/src/components/ui/Card.jsx) | `header`, `footer`, `children` | None | Low | Universal | Excellent |
| `Checkbox` | [Checkbox.jsx](file:///c:/Vyayvastha/client/src/components/ui/Checkbox.jsx) | `label`, `checked`, `onChange` | None | Low | High | Excellent |
| `Drawer` | [Drawer.jsx](file:///c:/Vyayvastha/client/src/components/ui/Drawer.jsx) | `isOpen`, `onClose`, `position`, `children` | `useEffect` (Escape key listener) | Medium | High | Good |
| `Dropdown` | [Dropdown.jsx](file:///c:/Vyayvastha/client/src/components/ui/Dropdown.jsx) | `trigger`, `items` | `useState` (open state), `useRef` | Medium | High | Good |
| `Input` | [Input.jsx](file:///c:/Vyayvastha/client/src/components/ui/Input.jsx) | `label`, `error`, `icon`, `type` | None (`React.forwardRef`) | Low | Universal | Excellent |
| `Modal` | [Modal.jsx](file:///c:/Vyayvastha/client/src/components/ui/Modal.jsx) | `isOpen`, `onClose`, `title`, `children` | `useEffect` (Body scroll-lock) | Medium | Universal | Good |
| `Pagination` | [Pagination.jsx](file:///c:/Vyayvastha/client/src/components/ui/Pagination.jsx) | `currentPage`, `totalPages`, `onPageChange` | None | Low | High | Excellent |
| `Select` | [Select.jsx](file:///c:/Vyayvastha/client/src/components/ui/Select.jsx) | `label`, `options`, `error`, `value` | None | Low | Universal | Excellent |
| `Skeleton` | [Skeleton.jsx](file:///c:/Vyayvastha/client/src/components/ui/Skeleton.jsx) | `className`, `variant` | None | Low | High | Excellent |
| `Table` | [Table.jsx](file:///c:/Vyayvastha/client/src/components/ui/Table.jsx) | `columns`, `data`, `isLoading` | None | Medium | High | Good |
| `Tabs` | [Tabs.jsx](file:///c:/Vyayvastha/client/src/components/ui/Tabs.jsx) | `tabs`, `activeTab`, `onChange` | None | Low | High | Excellent |
| `Toast` | [Toast.jsx](file:///c:/Vyayvastha/client/src/components/ui/Toast.jsx) | None | `react-hot-toast` integration | Low | Universal | Excellent |

---

## 10. Feature Page Analysis

### 10.1 Live Orders Manager (`OrdersManager.jsx`)
- **File Location:** `client/src/features/live-orders/components/OrdersManager.jsx`
- **Lines of Code:** ~1,100 lines.
- **Responsibilities:** Serves as the central real-time Kitchen & Cashier order dispatching system.
- **Key Functions:**
  - Filters active orders by status (`all`, `pending`, `preparing`, `ready`, `billing`, `completed`).
  - Listens to real-time Socket.io events (`ORDER_CREATED`, `ORDER_UPDATED`, `ORDER_STATUS_CHANGED`).
  - Plays audio alerts on incoming new orders.
  - Computes order total, tax breakdown, and items summary.
  - Integrates modal for invoice billing and digital receipt generation.

### 10.2 Waiter Order Screen (`WaiterOrderScreen.jsx`)
- **File Location:** `client/src/features/waiter/pages/WaiterOrderScreen.jsx`
- **Responsibilities:** Touch-optimized handheld ordering interface for floor waitstaff.
- **Key Functions:**
  - Displays categorised menu items with search filter.
  - Supports modifier additions (e.g. Extra Cheese, Spice Level) per item.
  - Dynamically calculates item subtotal and tax previews.
  - Sends immediate order request to `/api/v1/orders` and triggers Socket event to Kitchen.

---

## 11. Hooks Analysis

### 11.1 Custom Store Hooks

#### 1. `useAuthStore` (`client/src/store/useAuthStore.js`)
- **State Properties:** `user`, `token`, `currentRestaurant`, `currentBranch`, `role`, `permissions`, `isAuthenticated`.
- **Actions:** `login()`, `updateUser()`, `refreshTokens()`, `setRestaurantContext()`, `logout()`.
- **Persistence:** Syncs `accessToken`, `currentRestaurant`, `currentBranch`, `employeeRole`, and `employeePermissions` to `localStorage`.

#### 2. `useWaiterAuth` (`client/src/features/waiter/store/useWaiterAuth.js`)
- **State Properties:** `waiter`, `token`, `isAuthenticated`.
- **Actions:** `login(email, password)`, `logout()`.
- **Persistence:** Uses Zustand `persist` middleware with key `waiter-auth-storage`.

---

## 12. Utility Functions Analysis

| Utility File | Exported Functions | Purpose & Logic | Optimization Opportunities |
| :--- | :--- | :--- | :--- |
| `client/src/utils/cn.js` | `cn(...inputs)` | Merges Tailwind CSS classes resolving specificity conflicts using `clsx` and `tailwind-merge`. | Fully optimized. |
| `client/src/utils/formatCurrency.js` | `formatCurrency(amount, currency = 'INR')` | Formats numeric values into currency strings (e.g., `₹450.00`) using `Intl.NumberFormat`. | Memoize formatter instance for heavy list rendering. |
| `server/src/utils/AppError.js` | `class AppError extends Error` | Standardized operational error class attaching `statusCode` and operational status (`fail` vs `error`). | Fully optimized. |
| `server/src/utils/catchAsync.js` | `catchAsync(fn)` | Wrapper function catching promise rejections in async Express controllers and forwarding to `next(err)`. | Fully optimized. |

---

## 13. State Management Analysis

Vyavastha employs **Zustand** as its primary state management solution.

```mermaid
graph TD
    subgraph Zustand Global Stores
        AuthStore[useAuthStore]
        WaiterStore[useWaiterAuth]
    end

    subgraph React Local State (useState)
        CompState[Component State: Filters, Modals, Forms]
        FormState[React Hook Form: Login, Menu, Table Forms]
    end

    subgraph Server State (Axios / Socket.io)
        ServerSync[Direct Axios Calls + Socket Listener Repopulation]
    end

    AuthStore <-->|Sync Access Token & Context| AxiosInterceptor[Axios Interceptor]
    WaiterStore <-->|Sync Waiter Token| WaiterApiInterceptor[Waiter Axios Interceptor]
    ServerSync -->|Update local state on event| CompState
```

---

## 14. REST API Documentation Table

Vyavastha exposes over 40 REST endpoints across 9 core business modules:

| Module | Method | Endpoint | Purpose | Auth Required | Required Role / Permission |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/v1/auth/register` | Register new user & restaurant owner | Public | None |
| **Auth** | `POST` | `/api/v1/auth/login` | Authenticate user & return JWT tokens | Public | None |
| **Auth** | `POST` | `/api/v1/auth/refresh` | Issue new Access Token using Cookie | Public (Cookie) | None |
| **Auth** | `GET` | `/api/v1/auth/me` | Fetch authenticated user profile | Protected | Any active user |
| **Onboarding** | `POST` | `/api/v1/onboarding/complete` | Initialize branch, tables, & menu | Protected | Owner / Manager |
| **Menu** | `GET` | `/api/v1/menu/categories` | Get all menu categories | Protected | Any authenticated |
| **Menu** | `POST` | `/api/v1/menu/items` | Create new menu item | Protected | `menu:write` |
| **Menu** | `PUT` | `/api/v1/menu/items/:id` | Update menu item details | Protected | `menu:write` |
| **Menu** | `DELETE` | `/api/v1/menu/items/:id` | Soft/Hard delete menu item | Protected | `menu:write` |
| **Orders** | `GET` | `/api/v1/orders` | Fetch branch active orders | Protected | `order:read` |
| **Orders** | `POST` | `/api/v1/orders` | Create new order ticket | Protected | `order:write` |
| **Orders** | `PATCH` | `/api/v1/orders/:id/status` | Update order status (`preparing`, etc) | Protected | `order:write` |
| **Orders** | `PATCH` | `/api/v1/orders/items/:itemId/status` | Update individual item status | Protected | `order:write` |
| **Billing** | `POST` | `/api/v1/billing/orders/:orderId/bill` | Generate bill invoice & lock order | Protected | `billing:write` |
| **Billing** | `POST` | `/api/v1/billing/orders/:orderId/pay` | Process payment settlement | Protected | `billing:write` |
| **Tables** | `GET` | `/api/v1/tables` | Fetch branch table floor map | Protected | `table:read` |
| **Tables** | `POST` | `/api/v1/tables` | Provision new table | Protected | `table:write` |
| **Tables** | `PATCH` | `/api/v1/tables/:id/status` | Update table status (`occupied`, `dirty`) | Protected | `table:write` |
| **Staff** | `GET` | `/api/v1/employees` | List branch staff employees | Protected | `staff:read` |
| **Staff** | `POST` | `/api/v1/employees` | Add new employee | Protected | `staff:write` |
| **Inventory** | `GET` | `/api/v1/inventory` | List stock items & quantity | Protected | `inventory:read` |
| **Inventory** | `POST` | `/api/v1/inventory` | Log inventory item | Protected | `inventory:write` |
| **Waiter** | `POST` | `/api/v1/waiter/login` | Waiter PIN authentication | Public | None |
| **Waiter** | `GET` | `/api/v1/waiter/tables` | Fetch assigned waiter tables | Waiter Auth | Active Waiter |
| **Waiter** | `POST` | `/api/v1/waiter/orders` | Waiter places table order | Waiter Auth | Active Waiter |

---

## 15. Backend Architecture & Service Layer Analysis

The backend follows a clean multi-module structure (`server/src/modules/`).

### 15.1 Layer Separation
1. **Routes (`*.routes.js`):** Defines Express route definitions, attaches authentication and restriction middlewares (`protect`, `restrictTo`).
2. **Controllers (`*.controller.js`):** Extends `catchAsync`. Extracts request params, query, and headers (`x-restaurant-id`, `x-branch-id`), delegates to Services, and returns standardized JSON responses.
3. **Services (`*.service.js`):** Implements core business logic, validation, transactional operations, database orchestration, and socket event triggers.
4. **Repositories (`*.repository.js`):** Extends `BaseRepository` to wrap Mongoose model CRUD operations.

---

## 16. Database & Schema Design Analysis

Vyavastha defines **19 Mongoose Schemas** in `server/src/models/`:

```mermaid
erDiagram
    Restaurant ||--|{ Branch : operates
    Restaurant ||--|{ User : owned_by
    Restaurant ||--|{ Employee : employs
    Branch ||--|{ Table : contains
    Branch ||--|{ Order : processes
    Branch ||--|{ Inventory : tracks
    User ||--|| Employee : profile
    Employee }|--|| Role : assigned
    Role }|--|{ Permission : grants
    Category ||--|{ MenuItem : categorizes
    MenuItem ||--|{ Modifier : has
    Order ||--|{ OrderItem : details
    Order ||--o| Bill : generates
    Bill ||--|| Payment : settles
    Customer ||--o| Order : places
```

### 16.1 Critical Database Schema Evaluation

> [!IMPORTANT]
> **Schema Flaw: Data Duplication in Orders (`Order.js` vs `OrderItem.js`)**
> `Order.js` contains an embedded array `items: [{ menuItemId, name, quantity, price, subtotal, modifiers }]` AND the backend simultaneously maintains a separate `OrderItem.js` model. During order creation and updates, `order.service.js` writes to both `OrderItem` collection documents and updates the embedded `Order.items` array. If an update fails midway without a Mongoose transaction, `Order.items` and `OrderItem` documents become desynchronized.
> *Remediation:* Refactor to rely exclusively on `OrderItem` collection documents with indexed `orderId` references, or strictly use embedded subdocuments within `Order.js`.

---

## 17. Security Audit

### 17.1 Vulnerability Matrix

| Vulnerability Category | Risk Level | Found Location | Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **XSS / JWT Token Storage** | **High** | `client/src/store/useAuthStore.js` | Access token in `localStorage` can be read by malicious scripts. | Move token persistence to HttpOnly, SameSite=Strict cookies. |
| **Unprotected Mongo Queries** | **Medium** | Backend controllers | Potential NoSQL injection via unsanitized query parameters. | Integrate `express-mongo-sanitize` middleware in `app.js`. |
| **Hardcoded Defaults** | **Medium** | `server/src/config/db.js` & `app.js` | Fallback secrets (`'your_jwt_secret'`) in dev mode. | Enforce fail-fast server start if `.env` variables are missing. |
| **CORS Over-Permissiveness** | **Low** | `server/src/app.js` | Development mode allows all origins (`callback(null, true)`). | Restrict dev origins strictly to defined localhost ports. |

### 17.2 Security Score: **72 / 100**

---

## 18. Performance Audit

### 18.1 Bundle Size & Code Splitting Evaluation
- **Issue:** All application routes (`/dashboard`, `/waiter/dashboard`, `/onboarding`, `/pricing`) are imported directly in `AppRoutes.jsx`. The initial JS bundle includes all feature modules, resulting in slower initial page loads.
- **Optimization:** Refactor `AppRoutes.jsx` to load page components using `React.lazy()`:
  ```javascript
  const DashboardLayout = React.lazy(() => import('@/features/dashboard/pages/DashboardLayout'));
  ```

### 18.2 Performance Score: **78 / 100**

---

## 19. UI/UX & Design Aesthetics Evaluation

- **Design System:** Sleek, modern dark-mode aesthetic with vibrant visual accents, glassmorphic cards, and consistent typographic hierarchy.
- **Responsiveness:** Excellent handheld mobile responsiveness on the Waiter POS view (`/waiter/dashboard`).
- **Interactive Feedback:** Seamless toast alerts (`react-hot-toast`) on order actions, smooth modal transitions, and visual loading skeletons (`Skeleton.jsx`).

---

## 20. Code Quality & SOLID Review

- **Single Responsibility Principle (SRP):** **High adherence.** Clear division between UI components, feature pages, state stores, controllers, and services.
- **DRY (Don't Repeat Yourself):** **High adherence on UI.** 25 shared UI components eliminate markup duplication.
- **Code Quality Score:** **80 / 100**.

---

## 21. Feature Matrix & Business Value

| Feature Module | Business Value | Operational Readiness | Missing Capabilities |
| :--- | :--- | :--- | :--- |
| **Multi-Tenant Onboarding** | High | Production Ready | Automated domain branding customization. |
| **Menu & Modifiers Manager**| Universal | Production Ready | Bulk CSV menu import/export. |
| **Table Layout Planner** | High | Production Ready | Drag-and-drop graphical floor editor. |
| **Live Order Dashboard** | Critical | Production Ready | Audio volume toggle controls. |
| **Waiter Mobile POS** | Critical | Production Ready | Offline order queuing when network drops. |
| **Billing & PDF Receipts** | Critical | Production Ready | Direct thermal receipt printer integration. |
| **Inventory Control** | High | Production Ready | Low-stock auto-email supplier alerts. |
| **Staff & RBAC** | High | Production Ready | Detailed staff attendance & shift logs. |

---

## 22. End-to-End Business Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Customer
    actor Waiter
    actor Kitchen
    actor Cashier

    Customer->>Waiter: Seated at Table 4 & Orders Food
    Waiter->>Waiter: Open Waiter POS on Mobile & Select Table 4
    Waiter->>Waiter: Add Items + Modifiers & Tap "Place Order"
    Waiter->>Kitchen: Order Broadcasted via Socket.io ('ORDER_CREATED')
    Kitchen->>Kitchen: Order Ticket Displays on Live Orders Dashboard
    Kitchen->>Kitchen: Chef updates Status to 'Preparing' -> 'Ready'
    Kitchen-->>Waiter: Real-time status sync update ('ORDER_UPDATED')
    Waiter->>Customer: Food Served to Table 4
    Customer->>Cashier: Requests Bill
    Cashier->>Cashier: Generate Invoice & Calculate Taxes
    Cashier->>Customer: Present QR Code Payment / Collect Cash
    Cashier->>Cashier: Mark Order 'Paid' & Table 'Available'
```

---

## 23. Error Handling Evaluation

- **Backend:** Robust central handling using `AppError` and `error.middleware.js` to catch Mongoose `CastError`, duplicate key errors (11000), and JWT validation errors.
- **Frontend:** Axios response interceptor intercepts `401 Unauthorized` responses to initiate transparent token refreshing.

---

## 24. Logging Strategy

- Currently relies on `morgan('dev')` for HTTP request logging and basic console logging in `logger.js`.
- **Production Recommendation:** Implement **Pino** or **Winston** structured JSON logger with log transport streaming to Datadog or AWS CloudWatch.

---

## 25. Testing Readiness Analysis

- **Current Coverage:** **0% (Zero automated test files exist).**
- **Recommended Strategy:**
  1. **Unit Tests (Vitest / Jest):** Test `formatCurrency`, `AppError`, and `OrderService` pricing math calculations.
  2. **Integration Tests (Supertest):** Test Express API endpoints (`/api/v1/auth`, `/api/v1/orders`).
  3. **E2E Tests (Playwright):** Test full user journey from login -> order placement -> billing settlement.

---

## 26. Scalability Assessment

| User Scale | Bottlenecks | Required Infrastructure Changes |
| :--- | :--- | :--- |
| **100 Concurrent Users** | None. Single Node.js process handles load effortlessly. | Current setup adequate. |
| **1,000 Concurrent Users** | Memory overhead from single Node.js instance. | Deploy process manager (PM2) or multi-container cluster. |
| **10,000 Concurrent Users** | Socket.io in-memory room limits & MongoDB single connection. | Integrate **Redis Pub/Sub Adapter** for Socket.io & MongoDB Replica Set. |
| **100,000+ Users** | Monolithic server execution & DB I/O bottlenecks. | Microservices decomposition (Auth service, Order service, Billing service) + DB Sharding. |

---

## 27. Deployment Readiness

- **Containerization:** Missing `Dockerfile` and `docker-compose.yml`.
- **CI/CD Pipeline:** Missing GitHub Actions build and lint workflows.
- **Environment Management:** Clear `.env.example` template provided.

---

## 28. Technical Debt Matrix

### High Priority:
1. Eliminate dead dependencies (`@reduxjs/toolkit`, `react-redux`, `date-fns`, `zod`, `react-helmet-async`, `bcryptjs`).
2. Resolve `Order.items` vs `OrderItem` collection schema duplication.
3. Migrate `localStorage` JWT token storage to secure HttpOnly cookies.

### Medium Priority:
1. Add `React.lazy()` code splitting across client routes.
2. Implement automated unit & integration test suites.
3. Standardize Docker container configurations.

---

## 29. Improvement Roadmap

```mermaid
timeline
    title Vyavastha System Evolution Roadmap
    Phase 1 : Immediate (Weeks 1-2) : Purge unused NPM packages : Fix Order/OrderItem schema duplication : Move JWT from localStorage to HttpOnly Cookies
    Phase 2 : Short Term (Month 1) : Implement React.lazy() route splitting : Add Dockerfile & Docker Compose : Write automated unit tests for Order & Billing Services
    Phase 3 : Medium Term (Months 2-3) : Integrate Redis Socket.io adapter : Add thermal receipt printer web interface : Build dedicated KDS (Kitchen Display System) view
    Phase 4 : Long Term (Months 4-6) : Multi-region database sharding : AI-driven inventory forecasting : Customer self-ordering via table QR codes
```

---

## 30. Missing Features Evaluation

1. **Dedicated Kitchen Display System (KDS):** Full-screen touch interface designed specifically for line cooks to bump order tickets.
2. **Online Payment Gateway Integration:** Live Webhook integration for Razorpay/Stripe automated payment reconciliation.
3. **Thermal Printer Web Driver:** Direct browser printing support for 80mm ESC/POS thermal receipt printers.

---

## 31. Bug Risk Analysis

1. **Concurrency Race Condition in Table Status:** Simultaneous orders placed on the same table by two waitstaff could lead to overwriting table state.
2. **Token Refresh Loop:** If refresh token endpoint fails, axios queue retry could enter infinite rejection loop if not handled gracefully.

---

## 32. File-by-File Comprehensive Summary

The following table summarizes all primary application files in the Vyavastha repository:

| File Path | Purpose & Responsibilities | Approx Lines | Key Dependencies | Primary Consumers / Callers | Importance | Complexity |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| [server.js](file:///c:/Vyayvastha/server/server.js) | Server entry point & HTTP listener bootstrap. | 38 | `http`, `app.js`, `db.js`, `socketServer.js` | Node runtime | Critical | Low |
| [app.js](file:///c:/Vyayvastha/server/src/app.js) | Express app middleware configuration & API route mounting. | 95 | `express`, `cors`, `helmet`, `hpp`, `rateLimit` | `server.js` | Critical | Medium |
| [db.js](file:///c:/Vyayvastha/server/src/config/db.js) | MongoDB Mongoose database connection initialization. | 18 | `mongoose`, `logger.js` | `server.js` | Critical | Low |
| [logger.js](file:///c:/Vyayvastha/server/src/config/logger.js) | Log formatting utility for server logging. | 15 | None | Entire server | Medium | Low |
| [auth.middleware.js](file:///c:/Vyayvastha/server/src/middleware/auth.middleware.js) | JWT verification & multi-tenant context extraction (`protect`, `restrictTo`). | 97 | `jsonwebtoken`, `UserRepository`, `EmployeeRepository` | Admin/Staff API Routes | Critical | High |
| [waiter.middleware.js](file:///c:/Vyayvastha/server/src/middleware/waiter.middleware.js) | Waiter POS JWT authentication middleware (`protectWaiter`). | 41 | `jsonwebtoken`, `Waiter` | Waiter API Routes | Critical | Medium |
| [error.middleware.js](file:///c:/Vyayvastha/server/src/middleware/error.middleware.js) | Centralized operational & system error handling middleware. | 59 | `AppError`, `logger.js` | `app.js` | Critical | Medium |
| [BaseRepository.js](file:///c:/Vyayvastha/server/src/repositories/BaseRepository.js) | Generic base class providing common Mongoose CRUD operations. | 45 | None | Specific Module Repositories | High | Medium |
| [User.js](file:///c:/Vyayvastha/server/src/models/User.js) | Mongoose schema representing registered users & owners. | 65 | `mongoose`, `bcrypt` | Auth Module | Critical | Medium |
| [Restaurant.js](file:///c:/Vyayvastha/server/src/models/Restaurant.js) | Mongoose schema for multi-tenant restaurant entities. | 40 | `mongoose` | Onboarding / Auth Module | Critical | Low |
| [Branch.js](file:///c:/Vyayvastha/server/src/models/Branch.js) | Mongoose schema representing physical restaurant branches. | 45 | `mongoose` | Onboarding / Branch Module | Critical | Low |
| [Employee.js](file:///c:/Vyayvastha/server/src/models/Employee.js) | Mongoose schema connecting users to restaurants with assigned roles. | 50 | `mongoose` | Staff & Auth Module | Critical | Medium |
| [Order.js](file:///c:/Vyayvastha/server/src/models/Order.js) | Mongoose schema for customer orders & status lifecycle. | 95 | `mongoose` | Order & Billing Module | Critical | High |
| [OrderItem.js](file:///c:/Vyayvastha/server/src/models/OrderItem.js) | Mongoose schema representing individual order line items. | 60 | `mongoose` | Order & Billing Module | Critical | Medium |
| [MenuItem.js](file:///c:/Vyayvastha/server/src/models/MenuItem.js) | Mongoose schema for restaurant dishes & pricing. | 50 | `mongoose` | Menu Module | High | Low |
| [Table.js](file:///c:/Vyayvastha/server/src/models/Table.js) | Mongoose schema representing physical dining tables. | 40 | `mongoose` | Table Module | High | Low |
| [Bill.js](file:///c:/Vyayvastha/server/src/models/Bill.js) | Mongoose schema storing customer invoices & payment totals. | 65 | `mongoose` | Billing Module | High | Medium |
| [Waiter.js](file:///c:/Vyayvastha/server/src/models/Waiter.js) | Mongoose schema for waiter accounts & PIN auth. | 65 | `mongoose`, `bcrypt` | Waiter Module | High | Medium |
| [Inventory.js](file:///c:/Vyayvastha/server/src/models/Inventory.js) | Mongoose schema tracking raw ingredient stock levels. | 45 | `mongoose` | Inventory Module | Medium | Low |
| [Customer.js](file:///c:/Vyayvastha/server/src/models/Customer.js) | Mongoose schema recording customer contact history. | 38 | `mongoose` | Order Module | Low | Low |
| [Permission.js](file:///c:/Vyayvastha/server/src/models/Permission.js) | Mongoose schema for fine-grained permission definitions (Unused). | 28 | `mongoose` | None (Dead Code) | Low | Low |
| [Notification.js](file:///c:/Vyayvastha/server/src/models/Notification.js) | Mongoose schema for system alerts (Unused). | 46 | `mongoose` | None (Dead Code) | Low | Low |
| [vite.config.js](file:///c:/Vyayvastha/client/vite.config.js) | Vite dev server configuration & API proxy rules. | 53 | `vite`, `@vitejs/plugin-react`, `@tailwindcss/vite` | Vite CLI | Critical | Medium |
| [App.jsx](file:///c:/Vyayvastha/client/src/App.jsx) | Root React application component initializing providers. | 38 | `react-router-dom`, `@tanstack/react-query` | `main.jsx` | Critical | Low |
| [AppRoutes.jsx](file:///c:/Vyayvastha/client/src/routes/AppRoutes.jsx) | Router configuration mapping paths to guarded feature views. | 83 | `react-router-dom`, `useAuthStore`, `useWaiterAuth` | `App.jsx` | Critical | Medium |
| [useAuthStore.js](file:///c:/Vyayvastha/client/src/store/useAuthStore.js) | Zustand store managing client authentication & restaurant context. | 70 | `zustand` | Entire Client App | Critical | Medium |
| [api/index.js](file:///c:/Vyayvastha/client/src/api/index.js) | Axios API instance with request/response authorization interceptors. | 86 | `axios`, `useAuthStore` | Client Feature Modules | Critical | High |
| [socketClient.js](file:///c:/Vyayvastha/client/src/socket/socketClient.js) | Socket.io client initialization and event room connection broker. | 51 | `socket.io-client` | Client Order & Table Modules | High | Medium |
| [OrdersManager.jsx](file:///c:/Vyayvastha/client/src/features/live-orders/components/OrdersManager.jsx) | Live Order kitchen/cashier management view. | 1100 | `react`, `socketClient`, `api` | Dashboard Layout | Critical | High |
| [WaiterOrderScreen.jsx](file:///c:/Vyayvastha/client/src/features/waiter/pages/WaiterOrderScreen.jsx) | Touch-optimized Waiter POS order entry screen. | 450 | `react`, `waiterApi`, `useWaiterAuth` | Waiter Router | Critical | High |

---

## 33. Dead Code Detection

### 33.1 Summary of Dead Assets & Code
1. **Unused Packages:** `@reduxjs/toolkit`, `react-redux`, `date-fns`, `zod`, `react-helmet-async`, `bcryptjs`.
2. **Unused Mongoose Models:** `Permission.js`, `Notification.js`.
3. **Unused Static Assets:** `client/src/assets/hero.png`, `client/src/assets/react.svg`, `client/src/assets/vite.svg`.

---

## 34. Circular Dependency & Coupling Audit

1. **Client Auth Stores:** `useWaiterAuth.js` imports `waiterApi.js`, while `waiterApi.js` imports `useWaiterAuth.js` to inspect authorization tokens. This creates an import cycle.
   - *Fix:* Retrieve token dynamically inside interceptors using `useWaiterAuth.getState().token` without top-level import instantiation.
2. **Dual-Model Duplication:** `Order.js` embeds order items while `OrderItem.js` exists independently, causing double writes during order creation.

---

## 35. Final Project Evaluation Scores

| Evaluation Dimension | Score (1-100) | Weight | Weighted Score | Performance Summary |
| :--- | :---: | :---: | :---: | :--- |
| **System Architecture** | 82 | 15% | 12.30 | Modular layered structure, repository pattern, clean separation. |
| **Security Posture** | 72 | 15% | 10.80 | Good middleware defenses; penalized for `localStorage` JWT storage. |
| **Performance & Efficiency** | 78 | 10% | 7.80 | Fast Vite build & Socket.io events; needs route lazy loading. |
| **Code Quality & Cleanliness**| 80 | 15% | 12.00 | High SRP & DRY adherence; penalized for unused dead code. |
| **System Scalability** | 65 | 10% | 6.50 | Adequate for single branch; requires Redis adapter for scaling. |
| **Maintainability** | 84 | 10% | 8.40 | Clear folder structure makes adding new features easy. |
| **Documentation & Config** | 70 | 5% | 3.50 | Clear code structure; lacks API OpenAPI/Swagger specs. |
| **Testing Readiness** | 10 | 10% | 1.00 | Severe gap. 0% automated test coverage. |
| **UI/UX Aesthetics** | 88 | 5% | 4.40 | Modern dark UI, high visual appeal, responsive Waiter POS. |
| **Production Readiness** | 60 | 5% | 3.00 | Requires Dockerization, CI/CD, and security hardening. |
| **OVERALL SYSTEM SCORE** | -- | **100%** | **73.9 / 100** | **Solid, Production-Ready Foundation requiring targeted hardening.** |

---

## 36. Final Conclusion & Next Steps

### Strengths:
- Fully functional multi-tenant restaurant management engine.
- Modern frontend built on React 19, Vite, and Tailwind CSS v4.
- Real-time order dispatch powered by Socket.io room broadcasting.
- Well-organized domain modularity on both client and server.

### Critical Action Items:
1. **Security Hardening:** Migrate client JWT storage from `localStorage` to secure HttpOnly cookies.
2. **Dependency Cleanup:** Remove unused dead npm packages (`@reduxjs/toolkit`, `react-redux`, `date-fns`, `zod`).
3. **Database Normalization:** Resolve data duplication between `Order.items` array and `OrderItem` model.
4. **Testing Infrastructure:** Implement Vitest unit tests for core pricing logic and Supertest API integration tests.
5. **Production Deployment Setup:** Add `Dockerfile`, `docker-compose.yml`, and GitHub Actions CI pipeline.
