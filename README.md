# 🌿 Terra Nova — NGO Management & Donation Platform

> A full-stack web application for managing NGOs, campaigns, donations, and volunteers — built for environmental non-profit organisations.

---

## 📋 Table of Contents

- [About the Project](#about-the-project)
- [Live Demo](#live-demo)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [System Architecture](#system-architecture)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [User Roles & Dashboards](#user-roles--dashboards)
- [Email Notifications](#email-notifications)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Utility Scripts](#utility-scripts)
- [Security](#security)
- [Screenshots](#screenshots)

---

## 🌍 About the Project

**Terra Nova** is a comprehensive NGO management platform that connects donors, volunteers, and environmental NGOs on a single platform. It provides:

- A public-facing website with campaign listings, donation widget, and volunteer sign-up
- Role-based dashboards for **Donors**, **Volunteers**, **NGOs**, and **Admins**
- A secure NGO verification workflow using Darpan ID whitelisting
- Razorpay payment gateway for real-time donation processing
- Automated email notifications for every key platform event

---

## 🚀 Live Demo

| Service    | URL                          |
|------------|------------------------------|
| Frontend   | Deployed on **Vercel**       |
| Backend    | Deployed on **Render**       |
| Database   | **MongoDB Atlas** (Cloud)    |

---

## ✨ Features

### 🌐 Public Website
- Hero section with impact statistics (142 countries, ₹48M raised, 18K volunteers)
- Dynamic campaign grid with category filters (Environment, Water, Education, Health)
- Donation widget with preset amounts (₹100–₹5000) and custom amount input
- One-time, Monthly, and Annual donation frequency options
- Volunteer application form with role selection
- Impact counter animations and testimonials carousel
- Newsletter subscription with welcome email
- Leaderboard page showing top donors

### 💚 Donor Features
- Register with OTP email verification
- JWT-authenticated login with persistent session
- Donate to specific campaigns or general fund via Razorpay
- View donation history with printable receipts
- Manage campaign wishlist
- Update profile (name, phone)
- Forgot/reset password via email token

### 🙋 Volunteer Features
- Register with OTP email verification
- JWT-authenticated login
- Log volunteer hours against campaigns and NGOs
- View total hours, sessions, and campaigns contributed to
- Download/print volunteer participation certificate
- Update profile (name, phone, skills, location)
- Forgot/reset password via email token

### 🏛️ NGO Features
- Register with Darpan ID (validated against admin whitelist)
- Pending verification state — cannot login until admin approves
- Email notification on registration, approval, and rejection
- Create and manage campaigns (title, description, category, goal, raised amount, urgency tag, days left)
- Upload campaign images (max 5MB, JPEG/PNG/WebP/GIF)
- View donations received per campaign
- Update organisation profile (name, mission, location, founded year, phone, website, category)
- Forgot/reset password via email token

### 🛡️ Admin Features
- Secure login (username + password, bcrypt hashed)
- Dashboard overview: total NGOs, pending approvals, total donations, volunteer count
- **NGO Management:** View all NGOs with status filter, approve/reject with optional reason
- **Darpan ID Whitelist:** Add/remove approved NGO IDs for registration validation
- **Donations:** View all donations with donor details, campaign, amount, frequency — export CSV
- **Volunteers:** View all volunteer applications — export CSV, delete entries
- **Volunteer Hours:** View all logged hours across all campaigns
- **Subscribers:** View/delete newsletter subscribers — export CSV
- **Analytics:** Chart.js charts for donations over time, NGO registrations, volunteer hours, donations by campaign
- Quick approve/reject NGOs directly from email links (token-secured)

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| HTML5 | Page structure and semantic markup |
| CSS3 (Flexbox/Grid) | Responsive layout and styling |
| Vanilla JavaScript (ES6+) | DOM manipulation, API calls, form handling |
| Google Fonts (Playfair Display, DM Sans) | Typography |
| Chart.js 4.4.0 | Analytics charts in admin dashboard |
| Razorpay Checkout.js | Client-side payment widget |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Node.js | LTS | JavaScript runtime |
| Express.js | ^4.18.0 | Web framework and REST API |
| Mongoose | ^7.0.0 | MongoDB ODM for schema and queries |
| bcryptjs | ^3.0.3 | Password hashing (cost factor 12) |
| jsonwebtoken | ^9.0.3 | JWT generation and verification |
| nodemailer | ^8.0.3 | SMTP email sending |
| multer | ^2.1.1 | Multipart file upload handling |
| express-rate-limit | ^8.3.1 | API rate limiting middleware |
| razorpay | ^2.9.6 | Server-side payment order creation |
| cors | ^2.8.5 | Cross-Origin Resource Sharing |
| dotenv | ^16.0.0 | Environment variable management |
| nodemon | ^3.0.0 | Dev server auto-restart |

### Database
| Technology | Purpose |
|---|---|
| MongoDB Atlas | Cloud-hosted NoSQL database |
| Mongoose ODM | Schema definition, validation, relationships |

### Infrastructure & Services
| Service | Purpose |
|---|---|
| Vercel | Frontend static hosting |
| Render | Backend Node.js hosting |
| MongoDB Atlas | Cloud database (free tier) |
| Brevo (SMTP) | Transactional email delivery |
| Razorpay | Payment gateway (test mode) |
| GitHub | Version control |

---

## 📁 Project Structure

```
Project/
├── Frontend/                        # Static frontend files
│   ├── index.html                   # Public homepage (hero, campaigns, donate, volunteer)
│   ├── donor-login.html             # Donor login page
│   ├── donor-dashboard.html         # Donor dashboard (overview, history, wishlist, profile)
│   ├── volunteer-login.html         # Volunteer login page
│   ├── volunteer-dashboard.html     # Volunteer dashboard (log hours, history, certificate)
│   ├── volunteer-hours.html         # Public volunteer hours tracker
│   ├── ngo-login.html               # NGO login page
│   ├── ngo-dashboard.html           # NGO dashboard (campaigns, donations, profile)
│   ├── ngo.html                     # Public NGO profile/listing page
│   ├── admin-login.html             # Admin login page
│   ├── admin-dashboard.html         # Admin dashboard (full platform management)
│   ├── leaderboard.html             # Public donor leaderboard
│   ├── reset-password.html          # Password reset page (all roles)
│   ├── config.js                    # API base URL configuration
│   ├── script.js                    # Main homepage JavaScript
│   ├── styles.css                   # Global stylesheet
│   └── system-architecture.html    # System architecture diagram
│
├── ngo-backend/                     # Node.js backend
│   ├── server.js                    # Main Express server (all routes)
│   ├── createAdmin.js               # Utility: create default admin account
│   ├── seedApprovedNgos.js          # Utility: seed Darpan ID whitelist
│   ├── .env                         # Environment variables (not committed)
│   ├── .gitignore                   # Git ignore rules
│   ├── package.json                 # Dependencies and scripts
│   ├── models/
│   │   ├── admin.js                 # Admin schema (username, password)
│   │   ├── donor.js                 # Donor schema (name, email, password, wishlist, OTP)
│   │   ├── volunteer.js             # Volunteer application schema
│   │   ├── volunteerAccount.js      # Volunteer login account schema
│   │   ├── volunteerLog.js          # Volunteer hours log schema
│   │   ├── ngo.js                   # NGO schema (profile + campaigns[] sub-documents)
│   │   ├── ApprovedNgo.js           # Darpan ID whitelist schema
│   │   ├── donation.js              # Donation record schema
│   │   └── subscriber.js            # Newsletter subscriber schema
│   └── uploads/                     # Campaign image uploads (served statically)
│
├── COCOMO_TerraNova.md              # Software project estimation document
└── README.md                        # This file
```

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER (Frontend)                 │
│         HTML5 · CSS3 · Vanilla JS · Chart.js · Razorpay.js      │
│   index.html · dashboards · login pages · leaderboard           │
└──────────────────────────┬──────────────────────────────────────┘
                           │  REST API (HTTP/HTTPS)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                 APPLICATION LAYER (Backend)                      │
│                   Node.js + Express.js                           │
│  ┌─────────────┐ ┌──────────────┐ ┌────────────┐ ┌──────────┐  │
│  │ Auth Module │ │ NGO Module   │ │Donor/Vol   │ │  Admin   │  │
│  │ JWT + OTP   │ │ Darpan ID    │ │ Module     │ │  Module  │  │
│  │ bcrypt ×12  │ │ Campaigns    │ │ Donations  │ │ Approve/ │  │
│  │ Rate Limit  │ │ Image Upload │ │ Hours Log  │ │ Reports  │  │
│  └─────────────┘ └──────────────┘ └────────────┘ └──────────┘  │
└──────────────────────────┬──────────────────────────────────────┘
                           │  Mongoose ODM
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATA LAYER (MongoDB Atlas)                    │
│  Donors · VolunteerAccounts · Ngos · Admins · Donations         │
│  VolunteerLogs · Volunteers · Subscribers · ApprovedNgos        │
└─────────────────────────────────────────────────────────────────┘
         │              │              │              │
         ▼              ▼              ▼              ▼
    Razorpay       Nodemailer      MongoDB         Multer
   (Payments)      (Emails)        Atlas          (Uploads)
```

---

## 🗄️ Database Schema

### Collections

| Collection | Key Fields |
|---|---|
| `donors` | name, email, password (hashed), phone, wishlist[], donations[], OTP, resetToken |
| `volunteeraccounts` | name, email, password (hashed), phone, skills, location, OTP, resetToken |
| `volunteers` | firstName, lastName, email, phone, skills, availability, message |
| `volunteerlogs` | volunteerName, volunteerEmail, campaign, ngoName, hours, date, description |
| `ngos` | name, email, password (hashed), mission, category, location, verificationStatus, campaigns[], registrationNumber |
| `ngos.campaigns` | title, description, category, goal, raised, volunteers, daysLeft, urgency, imageUrl |
| `admins` | username, password (hashed) |
| `donations` | amount, currency, frequency, campaign, ngoId, donorId, donorName, razorpayOrderId, razorpayPaymentId |
| `subscribers` | email |
| `approvedngos` | darpanId, ngoName, addedBy |

---

## 🔌 API Endpoints

### Auth — Donor
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/donor/register` | Register with OTP email verification |
| POST | `/api/donor/verify-otp` | Verify OTP to activate account |
| POST | `/api/donor/login` | Login, returns JWT |
| GET | `/api/donor/profile` | Get profile + donation history |
| PUT | `/api/donor/profile` | Update name/phone |
| POST | `/api/donor/forgot-password` | Send reset token email |
| POST | `/api/donor/reset-password` | Reset password with token |
| DELETE | `/api/donor/wishlist` | Remove campaign from wishlist |

### Auth — Volunteer
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/volunteer/register` | Register with OTP verification |
| POST | `/api/volunteer/verify-otp` | Verify OTP |
| POST | `/api/volunteer/login` | Login, returns JWT |
| GET | `/api/volunteer/profile` | Get profile + hour logs |
| PUT | `/api/volunteer/profile` | Update profile |
| POST | `/api/volunteer/forgot-password` | Send reset token |
| POST | `/api/volunteer/reset-password` | Reset password |
| POST | `/api/volunteer-hours` | Log volunteer hours |

### Auth — NGO
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/ngo/register` | Register (validates Darpan ID, sets pending) |
| POST | `/api/ngo/login` | Login (only if verified) |
| GET | `/api/ngo/profile` | Get NGO profile + campaigns |
| PUT | `/api/ngo/profile` | Update NGO profile |
| POST | `/api/ngo/forgot-password` | Send reset token |
| POST | `/api/ngo/reset-password` | Reset password |
| GET | `/api/ngo/donations` | Get donations for this NGO's campaigns |
| POST | `/api/ngo/campaigns` | Add new campaign |
| PUT | `/api/ngo/campaigns/:id` | Edit campaign |
| DELETE | `/api/ngo/campaigns/:id` | Delete campaign |
| POST | `/api/ngo/campaigns/:id/image` | Upload campaign image (Multer) |

### Auth — Admin
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/admin/login` | Admin login |
| GET | `/api/admin/ngos` | List all NGOs (filter by status) |
| POST | `/api/admin/ngo/:id/verify` | Approve or reject NGO |
| GET | `/api/admin/ngo/:id/verify` | Quick approve/reject via email link |
| GET | `/api/admin/donations` | All donations |
| GET | `/api/admin/volunteers` | All volunteer applications |
| DELETE | `/api/admin/volunteers/:id` | Delete volunteer |
| GET | `/api/admin/subscribers` | All subscribers |
| DELETE | `/api/admin/subscribers/:id` | Delete subscriber |
| GET | `/api/admin/approved-ngos` | List Darpan ID whitelist |
| POST | `/api/admin/approved-ngos` | Add to whitelist |
| DELETE | `/api/admin/approved-ngos/:id` | Remove from whitelist |

### Public
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/campaigns` | All verified NGO campaigns |
| POST | `/api/donate` | Guest donation (no auth) |
| POST | `/api/payment/create-order` | Create Razorpay order |
| POST | `/api/payment/verify` | Verify Razorpay payment signature |
| POST | `/api/subscribe` | Newsletter subscription |
| POST | `/api/volunteer` | Submit volunteer application |
| GET | `/api/leaderboard` | Top donors by total amount |
| GET | `/uploads/:filename` | Serve uploaded campaign images |

---

## 👥 User Roles & Dashboards

### 💚 Donor Dashboard
- **Overview:** Total donated, donation count, wishlist count, recent donations
- **Donation History:** Full table with printable receipts (browser print)
- **Wishlist:** Saved campaigns with donate/remove actions
- **Profile:** Edit name and phone

### 🙋 Volunteer Dashboard
- **Overview:** Total hours, sessions, campaigns contributed, recent activity
- **Log Hours:** Form to log hours with campaign, NGO, date, description
- **My History:** All logged sessions with hours and dates
- **Profile:** Edit name, phone, skills, location
- **Certificate:** Auto-generated printable volunteer participation certificate

### 🏛️ NGO Dashboard
- **Overview:** Campaign count, total goal, total raised, volunteers needed
- **My Profile:** Edit organisation details (name, mission, category, location, etc.)
- **Campaigns:** Create/edit/delete campaigns with image upload, progress bars, urgency tags
- **Donations:** View all donations received for campaigns

### 🛡️ Admin Dashboard
- **Overview:** Platform stats + pending NGO approvals
- **Analytics:** 4 Chart.js charts (donations over time, NGO registrations, volunteer hours, top campaigns)
- **NGO Management:** Filter by status, approve/reject with modal reason
- **Approved IDs:** Manage Darpan ID whitelist
- **Donations:** Full donation records with CSV export
- **Volunteers:** All applications with CSV export and delete
- **Volunteer Hours:** All logged hours across platform
- **Subscribers:** Newsletter list with CSV export and delete

---

## 📧 Email Notifications

All emails are sent via **Nodemailer** using Brevo SMTP with HTML templates.

| Trigger | Recipient | Email Content |
|---|---|---|
| Donor/Volunteer registers | User | Welcome email with platform stats and CTA |
| Donation completed | Donor | Styled receipt with amount, campaign, receipt ID, impact stats, 80G tax note |
| Volunteer applies | Admin | Alert with volunteer details and dashboard link |
| NGO registers | NGO | Pending review notification with expected timeline |
| NGO registers | Admin | Alert with NGO details + one-click Approve/Reject links |
| NGO approved | NGO | Approval confirmation with login link |
| NGO rejected | NGO | Rejection email with reason |

---

## ⚙️ Environment Variables

Create a `.env` file in `ngo-backend/`:

```env
# MongoDB
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/ngoDB

# Server
PORT=5000
JWT_SECRET=your_jwt_secret_key_here

# Email (Brevo SMTP or any SMTP provider)
EMAIL_HOST=smtp-relay.brevo.com
EMAIL_PORT=587
EMAIL_USER=your_smtp_user
EMAIL_PASS=your_smtp_password
ADMIN_EMAIL=admin@yourdomain.com
SENDER_EMAIL=noreply@yourdomain.com

# Admin quick-action secret (used in approve/reject email links)
ADMIN_ACTION_SECRET=your_long_random_secret

# URLs (used in email templates)
BACKEND_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000
NGO_LOGIN_URL=http://localhost:3000/ngo-login.html
ADMIN_DASHBOARD_URL=http://localhost:3000/admin-dashboard.html

# Razorpay (get from https://dashboard.razorpay.com)
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas account (free tier works)
- Razorpay account (test mode)
- SMTP credentials (Brevo free tier works)

### 1. Clone the repository
```bash
git clone https://github.com/your-username/terra-nova.git
cd terra-nova
```

### 2. Install backend dependencies
```bash
cd ngo-backend
npm install
```

### 3. Configure environment variables
```bash
# Copy and fill in your values
cp .env.example .env
```

### 4. Seed the database

**Create the admin account:**
```bash
node createAdmin.js
# Default credentials: username=admin, password=terranova123
# Change the password after first login!
```

**Seed the Darpan ID whitelist:**
```bash
node seedApprovedNgos.js
# Adds 3 test NGO IDs for development
```

### 5. Start the backend server
```bash
# Development (with auto-restart)
npm run dev

# Production
npm start
```
Server runs on `http://localhost:5000`

### 6. Serve the frontend

Open `Frontend/index.html` directly in a browser, or use a local server:
```bash
# Using VS Code Live Server extension (recommended)
# Right-click index.html → Open with Live Server

# Or using Python
cd Frontend
python -m http.server 3000
```

### 7. Update the API URL

Edit `Frontend/config.js` to point to your backend:
```js
// For local development
const API = 'http://localhost:5000';

// For production
const API = 'https://your-render-backend.onrender.com';
```

---

## 🔧 Utility Scripts

| Script | Command | Purpose |
|---|---|---|
| Create Admin | `node createAdmin.js` | Creates default admin (username: `admin`, password: `terranova123`) |
| Seed NGO Whitelist | `node seedApprovedNgos.js` | Adds 3 test Darpan IDs to the approved NGO whitelist |

---

## 🔒 Security

| Feature | Implementation |
|---|---|
| Password Hashing | bcryptjs with cost factor **12** |
| Authentication | JWT tokens stored in `localStorage` |
| OTP Verification | 6-digit OTP with expiry for Donor and Volunteer registration |
| Rate Limiting | Auth routes: 10 req/15min · Donations: 20 req/hr · General: 100 req/15min |
| CORS | Enabled via `cors` middleware |
| Input Validation | Mongoose schema validation with `required`, `unique`, `enum` constraints |
| Secrets | All credentials in `.env`, never hardcoded |
| Admin Email Actions | Token-secured approve/reject links (`ADMIN_ACTION_SECRET`) |
| File Upload | Multer restricts to image MIME types only, max 5MB |
| NGO Verification | Two-layer: Darpan ID whitelist + manual admin approval |

---

## 📊 Key Statistics (Platform)

| Metric | Value |
|---|---|
| Total Frontend Pages | 16 HTML files |
| Total Backend Models | 9 Mongoose schemas |
| Total API Endpoints | ~40+ REST endpoints |
| Frontend SLOC | ~8,379 lines |
| Backend SLOC | ~1,827 lines |
| Total SLOC | ~10,206 lines |
| Email Templates | 6 HTML email templates |
| User Roles | 4 (Donor, Volunteer, NGO, Admin) |

---

## 📄 License

This project was developed for academic purposes as part of a Full Stack Web Development mini project.

---

*Built with 💚 by the Terra Nova development team · 2026*
