# FAILOI — Flipbook Publishing Platform

FAILOI is a state-of-the-art, self-hosted web application for converting static PDFs into interactive, responsive, and beautifully animated 3D page-flip books. It includes robust administrative controls, advanced tracking and analytics, secure user session management, and multi-factor authentication.

---

## 🚀 Key Features

* **High-Fidelity PDF Conversion**: Seamless, background processing to convert PDFs into high-quality page textures and thumbnails.
* **Responsive 3D Viewer**: Beautiful page-flip presentation layout optimized for desktop, tablet, and mobile.
* **Super Admin Console**:
  * **Interactive Telemetry Monitoring**: Track server core CPU, RAM, and DB status.
  * **Session Controller**: View and terminate active user login sessions.
  * **Security Dashboard**: Custom IP Whitelist/Blacklist rules editor and logs.
  * **Backup Serializer**: Export and restore full PostgreSQL database snapshots.
  * **SMTP Configurations**: Dynamic email template editing and SMTP server management.
* **Enterprise Authentication**:
  * **Two-Factor Authentication (TOTP)**: Multi-factor security via Google Authenticator or compatible app.
  * **Account Locking**: Automatically locks accounts after 5 failed login attempts to prevent brute-force attacks.
  * **Impersonation Mode**: Allows Super Admins to securely log in as any user to assist with debugging.
* **Comprehensive Analytics**: Tracking views, duration, referral origins, and page read logs.

---

## 🛠️ Technology Stack

* **Frontend**: React, TypeScript, Vite, React Router DOM, Lucide Icons.
* **Backend**: Node.js, Express, TypeScript, Prisma ORM, PDF-Lib.
* **Database**: PostgreSQL (Prisma Client).
* **Caching & Jobs**: In-Memory background queue worker.
* **Containerization**: Docker, Docker Compose.

---

## 📂 Folder Structure

```text
failoi/
├── backend/                   # Backend Express server code
│   ├── prisma/                # Prisma ORM schema & migrations
│   ├── src/
│   │   ├── config/            # Application settings & constants
│   │   ├── controllers/       # Auth and Admin route controllers
│   │   ├── middlewares/       # Rate limit, CSRF, security headers
│   │   ├── routes/            # Express endpoint routers
│   │   ├── services/          # Email service & background PDF worker
│   │   └── utils/             # TOTP, Backups, and Audit logging utilities
│   ├── package.json
│   └── tsconfig.json
├── frontend/                  # Frontend Vite SPA React client
│   ├── public/                # Static files and assets
│   ├── src/
│   │   ├── components/        # Layout wrappers & routing guards
│   │   ├── hooks/             # Custom React Hooks (useAuth)
│   │   ├── pages/             # Login, Dashboard, Admin panels
│   │   └── services/          # Axios/Fetch API client service
│   ├── package.json
│   └── tsconfig.json
├── docker-compose.yml         # Container configuration orchestration
└── README.md                  # Root documentation
```

---

## ⚙️ Environment Variables

Copy the example configuration to establish your local values:

```bash
cp backend/.env.example backend/.env
```

The server reads the following variables:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/db` |
| `JWT_SECRET` | Secret key used to sign Access Tokens | *generated-secret* |
| `JWT_REFRESH_SECRET` | Secret key used to sign Refresh Tokens | *generated-secret* |
| `FRONTEND_URL` | Trusted CORS origins URL | `http://localhost:5173` |
| `PORT` | Backend server port | `5000` |
| `UPLOAD_DIR` | PDF upload folder path on server | `./uploads` |
| `NODE_ENV` | Running node environment mode | `development` |
| `SMTP_HOST` | Outgoing mail server host | `smtp.resend.com` |
| `SMTP_PORT` | Outgoing mail server port | `465` |
| `SMTP_USER` | SMTP username | `resend` |
| `SMTP_PASS` | SMTP access credential token | *api-key* |
| `SMTP_FROM` | Sender display name email | `noreply@yourdomain.com` |

---

## 📦 Installation & Database Setup

### Prerequisites

Ensure you have **Node.js (v20+)**, **npm (v10+)**, and **PostgreSQL (v15+)** installed.

### 1. Database Provisioning
Create a blank database in your PostgreSQL instance:

```sql
CREATE DATABASE failoi;
```

### 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Push database tables schema:
   ```bash
   npx prisma db push
   ```
4. Start the backend development server:
   ```bash
   npm run dev
   ```

### 3. Frontend Setup
1. Open a new terminal session and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the client development server:
   ```bash
   npm run dev
   ```
4. Access the web interface at `http://localhost:5173`.

---

## 🐳 Docker Setup

To orchestrate the environment with Docker Compose:

1. Build and run containers in the background:
   ```bash
   docker-compose up -d --build
   ```
2. Run database migrations inside the backend container:
   ```bash
   docker-compose exec backend npx prisma db push
   ```
3. Stop the containers:
   ```bash
   docker-compose down
   ```

---

## 🌐 Deployment Guide

### Backend (Railway / Render / Heroku)
1. Setup a PostgreSQL database addon.
2. Link your repository.
3. Configure the environment variables (`DATABASE_URL`, `JWT_SECRET`, etc.).
4. Set the build command to `npm run build` and start command to `npm run start`.

### Frontend (Vercel / Netlify)
1. Configure project build settings:
   - Build Command: `npm run build`
   - Output Directory: `dist`
2. Add environment variable `VITE_API_URL` pointing to your deployed backend API URL.

---

## 🖼️ Screenshots

* **Admin Console Overview**:
  ![Admin Console](https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80)
* **3D Page Flip Reader**:
  ![Page Flip Reader](https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80)

---

## 🤝 Contributing

1. Fork the project.
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Submit a Pull Request.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
