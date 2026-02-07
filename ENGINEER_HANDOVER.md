# Engineer Handover: Kusturiss Jewelers

## 🏗️ Technical Architecture
- **Frontend**: Next.js 15+ (App Router, Standalone mode enabled).
- **Backend**: Express.js (Monolithic API).
- **Database**: PostgreSQL (PostGIS ready).
- **Cache**: Redis (Session & Rate limit tracking).
- **Styling**: Tailwind CSS + Custom Design Tokens.

## 🗝️ Critical Credentials Needed (Railway Secrets)
| Variable | Usage |
|----------|-------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Primary auth key |
| `JWT_REFRESH_SECRET` | Token rotation key |
| `FRONTEND_URL` | Used for email links (reset pw) |

## 📦 Deployment Instructions (Pitch Ready)
To show the client the working site, you only need to push the `frontend` and `backend` folders. The root-level `.gitignore` handles skipping the heavy `node_modules` automatically.

### 🔋 Do we need Database & Redis?
- **PostgreSQL**: **YES**. This stores your jewelry catalog, high-res images, and user accounts. Without it, the site will show no products.
- **Redis**: **OPTIONAL**. The backend intelligently falls back to memory if Redis is missing. For a simple pitch, you can skip it to save time/cost, though it's recommended for production.

## 🚀 Pushing to GitHub
Run these commands from the root folder:
```bash
git init
git remote add origin https://github.com/298althr/kusturiss_jewelers
git add frontend/ backend/ .gitignore ROADMAP.md ENGINEER_HANDOVER.md
git commit -m "Build: Luxury Jewelry Platform (Frontend + Backend)"
git branch -M main
git push -u origin main
```

## 🔒 Security Notes
- **XSS Sanitization**: I have modified `backend/middleware/security.js` to skip sanitization on fields with "password" in the name. This is crucial for maintaining hash integrity during login.
- **Session Logging**: All user activity is logged via the `ActivityLogger` service into the `user_activity_log` table. Ensure the next engineer monitors this to ensure sessions are being captured correctly.

## 🧪 Testing Credentials (Local)
- **Admin**: `admin@example.com` / `admin123`
- **Customer**: Use the `/register` flow on frontend.

## 📦 Deployment Command Reference
```bash
# Backend startup
cd backend && npm run dev

# Frontend startup
cd frontend && npm run dev
```

---
*Signed: Antigravity AI (Lead Developer)*
