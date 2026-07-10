# Deployment Guide

This guide explains how to deploy the **Flipbook Publishing Platform** to production using **Supabase** (Database), **Railway** (Backend), and **Vercel** (Frontend).

---

## Architecture Setup

```mermaid
graph LR
    Vercel[Vercel - Frontend] -->|API Requests| Railway[Railway - Backend]
    Railway -->|Prisma Client| Supabase[(Supabase - PostgreSQL)]
    Railway -->|Saves PDF/Covers| Disk[(Railway Persistent Volume)]
```

---

## 1. Database Setup: Supabase

We use Supabase to host our production PostgreSQL database.

1. Go to [Supabase](https://supabase.com) and create a new project.
2. Navigate to **Project Settings** > **Database** in your Supabase dashboard.
3. Locate the **Connection string** (choose **URI** mode). It will look similar to this:
   ```
   postgresql://postgres.[YOUR_PROJECT_ID]:[YOUR_PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
   ```
4. Save this URI; this will be your `DATABASE_URL` in the backend environment configuration.
5. In order for Prisma to perform migrations safely, copy the **Transaction** mode connection URI as well (without `pgbouncer=true` if using direct connection).

---

## 2. Backend Deployment: Railway

We deploy the Node/Express backend to Railway because it supports persistent disk storage (necessary for saving local uploads, PDFs, and cover thumbnails).

### Setup Railway Project:
1. Go to [Railway](https://railway.app) and create a new project.
2. Link your Git repository or use the Railway CLI to deploy the `backend/` subdirectory.
3. In your Railway Service configuration, go to the **Variables** tab and add the following production variables:

| Variable Name | Description / Suggested Value |
| :--- | :--- |
| `PORT` | `5005` (or Railway default) |
| `DATABASE_URL` | Your Supabase connection string URI (with password resolved) |
| `JWT_SECRET` | A secure, random 64-character string |
| `JWT_REFRESH_SECRET` | A secure, random 64-character string |
| `FRONTEND_URL` | Your production Vercel URL (e.g. `https://your-app.vercel.app`) |
| `BACKEND_URL` | Your production Railway domain URL (e.g. `https://your-backend.railway.app`) |
| `UPLOAD_DIR` | `./uploads` (or an absolute path targeting a persistent volume mount) |

### Setup Persistent Volume (CRITICAL for Storage):
1. In your Railway service dashboard, click **+ Add** > **Volume**.
2. Mount the volume to `/app/uploads` (or target it to the folder resolved by `UPLOAD_DIR`). This guarantees that user uploads (PDFs and cover images) are preserved across backend deployments and container restarts.

---

## 3. Frontend Deployment: Vercel

We deploy the Vite React application to Vercel as a static Single Page Application (SPA).

1. Go to [Vercel](https://vercel.com) and select **Add New** > **Project**.
2. Select your repository and target the **`frontend/`** directory as the root.
3. Configure the build settings:
   - **Framework Preset**: `Vite`
   - **Build Command**: `tsc -b && vite build`
   - **Output Directory**: `dist`
4. Add the following **Environment Variable**:

| Variable Name | Value |
| :--- | :--- |
| `VITE_API_URL` | Your production Railway backend domain (e.g., `https://your-backend.railway.app`) |

5. Click **Deploy**.
6. **SPA Routing Config**: To prevent `404 Not Found` errors when refreshing public viewer links (e.g. `/f/slug`), add a `vercel.json` file inside the `frontend/` root folder to route all queries back to `index.html`:
   ```json
   {
     "rewrites": [
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```

---

## 4. Run Migrations & Seed Admin

Once the Supabase database is connected to the Railway environment:

1. Connect to your Railway project environment shell (or run it locally by pointing `DATABASE_URL` in `backend/.env` to the Supabase string).
2. Run the database migration script:
   ```bash
   npx prisma db push
   ```
3. Run the seed script to create the initial admin account:
   ```bash
   npx tsx prisma/seed.ts
   ```

The application is now fully deployed and ready for production!
