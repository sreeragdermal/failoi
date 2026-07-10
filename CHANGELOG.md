# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to Semantic Versioning.

---

## [1.0.0-beta] - 2026-07-10

### Added
- **Git Repository Scopes**: Initialized isolated git control and created `.gitignore` configurations.
- **Enterprise Security Middleware**:
  - Double-Submit Cookie validation for CSRF defense on state-changing endpoints.
  - Global Helmet-based HTTP security headers policy.
  - Client request rate-limiting.
  - Latency monitor interceptor.
  - Maintenance Mode filter.
- **Access Locking & Security Rules**:
  - Security lockout rules (5 attempts, 15 minutes hold).
  - Administration Whitelist and Blacklist IP controller.
  - Severity-classified Security Alerts Log.
- **Two-Factor Authentication**:
  - Secure TOTP registration/verification using native Node.js crypto (HMAC-SHA1).
  - Front-end conditional redirect to TOTP input view during authentication validation.
- **Super Admin Console Panels**:
  - Live resource telemetry (CPU core load, RAM, DB connection state).
  - Session Manager for remote active browser token revoking.
  - Searchable System and Security Audit log viewers.
  - Dynamic SMTP email template editor.
  - JSON database snapshots exporter and restoration gate.
- **Impersonation Framework**:
  - Super Admin target account swapping with persistent warning banner and single-click return.
- **Docker Compose**:
  - Full containerization of frontend client, Express API server, and PostgreSQL database instance.

### Security
- Excluded `.env` files from version tracking.
- Removed all debug tokens and private credential entries.
