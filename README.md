# 💎 Kusturiss Jewelers

A legacy of excellence since 1926. This platform is a modern, luxury e-commerce experience designed for Kusturiss Jewelers, featuring artisanal jewelry, bespoke consultations, and a secure administrative gateway.

## ✨ Features

- **Luxury Presentation**: High-resolution jewelry showcase with a focus on heritage and craftsmanship.
- **Secure Authentication**: Robust user registration and login system with cookie-based session management.
- **Administrative Portal**: Comprehensive dashboard for managing inventory, orders, and customer relationships.
- **Activity Monitoring**: Full auditing of site interactions for security and analytics.
- **Responsive Design**: Mobile-first, premium aesthetic tailored for high-end clientele.

## 🚀 Deployment (Railway)

This repository is optimized for deployment on **Railway**.

### **Prerequisites**
- PostgreSQL (provisioned via Railway Plugins)
- Redis (provisioned via Railway Plugins - optional fallback to memory store)

### **Environment Variables**
Ensure the following variables are set in your Railway project:
- `DATABASE_URL`: PostgreSQL connection string.
- `JWT_SECRET`: Secure key for session tokens.
- `JWT_REFRESH_SECRET`: Secure key for token rotation.
- `PORT`: Automatically handled by Railway.

### **Manual Push**
To deploy manually:
1. `git init`
2. `git remote add origin https://github.com/298althr/kusturiss_jewelers`
3. `git add .`
4. `git commit -m "Build: Kusturiss Jewelers Luxury Platform"`
5. `git push -u origin main`

## 🏗️ Architecture

- **Frontend**: Next.js 15+ (App Router, Standalone mode for ultra-fast Docker builds).
- **Backend**: Express.js (Node.js) with PostgreSQL and Redis integration.
- **Database**: Automated SQL migrations for catalog and system setup.

---
*Crafted for Kusturiss Jewelers by the Google Deepmind team.*
