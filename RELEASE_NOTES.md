# Release Notes: FAILOI v1.0.0-beta

Welcome to the initial beta release of **FAILOI**, a comprehensive, self-hosted web application that transforms standard PDF files into animated 3D page-flip electronic books.

---

## 🌟 Release Summary

This release compiles all core publication structures, administrative telemetry dashboards, role-based controls, sessions tracking, and enterprise security gates into a single, cohesive, Docker-ready codebase.

### 🛡️ Enterprise Security Suite
* **CSRF Shielding**: Employs double-submitted cookies validated through custom Express and Fetch API headers.
* **Brute-Force Lockouts**: Automatically locks user accounts after 5 failed login attempts for a duration of 15 minutes.
* **2FA (TOTP)**: Secure multi-factor logins via authenticators using Node.js crypto HMAC-SHA1 algorithms.
* **Telemetry Latency Tracking**: Rolling, non-blocking calculations of average API request duration.

### 👑 Super Admin Dashboard Panel
* **Live System Telemetry**: CPU core loads, memory allocation, and database connectivity health.
* **Session Manager**: Track active logins by location, OS, and browser, and terminate them instantly.
* **Security & IP Rules Editor**: Edit Whitelists/Blacklists directly and inspect classified security logs.
* **Backups Serializer**: Run transactional snapshots of database tables and restore system states instantly.
* **SMTP Gateway Control**: Customize mail settings and transactional templates in real-time.

---

## 🚀 Deployment Options

* **Docker**: Build the entire platform locally with `docker-compose up -d --build`.
* ** Railway & Vercel**: Connect your GitHub repository to Railway (backend + DB) and Vercel (frontend) for instant CD.
