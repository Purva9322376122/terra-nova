# Software Project Estimation & Analysis

## Terra Nova — NGO Management & Donation Platform

**Prepared for:** Terra Nova Foundation — NGO Operations & Technology Initiative  
**Methodology:** COCOMO (Boehm, 1981)  
**Date:** 22 April 2026  

*Estimating Effort, Schedule, and Resource Allocation for Full Stack Web Application*

---

## 1. Project Overview

### 1.1 Purpose

The project involves developing a comprehensive NGO Management and Donation Platform (Terra Nova) tailored for environmental non-governmental organisations, donors, and volunteers. Unlike generic charity websites, this system provides role-based dashboards for four distinct user types — Donors, Volunteers, NGOs, and Admins — with integrated payment processing, email automation, and a campaign management system.

### 1.2 Target Users

- **Donors:** For browsing NGO campaigns, making one-time or recurring donations, and tracking donation history
- **Volunteers:** For registering, logging volunteer hours, and managing their profile
- **NGOs:** For registering (with admin verification), managing campaigns with image uploads, and tracking fundraising progress
- **Admin:** For verifying NGO registrations, managing all users, and overseeing platform activity

### 1.3 Core Features

- **User Authentication:** Role-based login for Donors, Volunteers, NGOs, and Admin with JWT tokens and OTP email verification
- **NGO Verification Workflow:** Admin-controlled approval/rejection of NGO registrations with email notifications
- **Campaign Management:** CRUD operations for NGO campaigns with image upload via Multer
- **Donation System:** Razorpay payment gateway integration for one-time, monthly, and annual donations
- **Volunteer Management:** Volunteer application form, account registration, and hour logging system
- **Email Notifications:** Automated emails via Nodemailer for welcome messages, donation receipts, volunteer alerts, and NGO status updates
- **Leaderboard:** Donor ranking system based on total contributions
- **Admin Dashboard:** Full platform oversight — user management, NGO approvals, donation analytics
- **Rate Limiting:** Express-rate-limit middleware for auth, donation, and general API endpoints
- **Password Reset:** Token-based forgot/reset password flow for all user types

---

## 2. Requirements Specification

### 2.1 Functional Requirements

| ID  | Requirement              | Description                                                                 |
|-----|--------------------------|-----------------------------------------------------------------------------|
| FR1 | User Authentication      | Registration and login with JWT tokens, OTP email verification, role-based access for Donor, Volunteer, NGO, Admin |
| FR2 | NGO Verification         | Admin approval/rejection workflow for NGO registrations with Darpan ID validation |
| FR3 | Campaign Management      | CRUD operations for NGO campaigns with image upload via Multer (5MB limit, images only) |
| FR4 | Donation System          | Razorpay payment gateway for one-time, monthly, and annual donations with receipt emails |
| FR5 | Volunteer System         | Volunteer application form, account creation, hour logging with campaign and NGO association |
| FR6 | Email Notifications      | Nodemailer-powered automated emails: welcome, donation receipt, volunteer alert, NGO status |
| FR7 | Leaderboard              | Donor ranking by cumulative donation amount with public display |
| FR8 | Admin Dashboard          | Platform-wide management: user lists, NGO approvals, donation records, subscriber management |
| FR9 | Password Reset           | Secure token-based forgot/reset password flow for Donor, Volunteer, and NGO accounts |
| FR10| Rate Limiting            | Express-rate-limit middleware: 10 req/15min for auth, 20 req/hr for donations, 100 req/15min general |
| FR11| Subscriber Management    | Newsletter subscription with welcome email and admin visibility |
| FR12| Approved NGO Whitelist   | Pre-seeded ApprovedNgo collection for Darpan ID validation before NGO registration |

### 2.2 Non-Functional Requirements

- **Scalability:** System must handle multiple concurrent users, NGO campaigns, and donation transactions efficiently
- **Latency:** API responses must be returned within acceptable time limits; rate limiting prevents abuse
- **Availability:** 99.9% uptime for deployed application on Vercel (frontend) and Render (backend)
- **Security:** JWT authentication, bcrypt password hashing (cost factor 12), OTP verification, CORS protection, input validation, and environment variables for all secrets
- **Data Integrity:** Mongoose schema validation with required fields, unique constraints, and enum restrictions

---

## 3. System Architecture

The system follows a three-layer architecture: Presentation Layer (Frontend), Application & API Layer (Backend), and Data Layer (Relational DB), accessed by five user types through a web browser via REST API.

### 3.1 Architecture Layers

**Users / Actors**
- Volunteer, Donor, NGO Organisation, Admin, Guest User — all interact through a web browser

**Presentation Layer (Frontend)**
- **Tech Stack:** React.js / Next.js, Tailwind CSS
- **Features & Pages:** NGO browsing, events, volunteer applications, donation pages, authentication forms
- **Key Responsibilities:** User interface, responsive design

**Application & API Layer (Backend)** *(REST API)*
- **Backend Tech:** Node.js + Express
- **Authentication Module:** User registration, login authentication, role-based access
- **Core Logic:** Business logic for all platform operations
- **Volunteer & Donor Module:** Browse NGOs and events, apply for volunteering, make donations
- **Admin Module:** Platform management, reports generation, certificate generation

**External Services**
- **Payment Gateway:** GPay / PhonePe
- **Email Service:** Gmail / Outlook (SMTP)
- **Cloud Storage:** AWS S3 / Cloudinary (profile images & documents)
- **SMS Notifications:** Google Messages

**Data Layer (Relational DB)**
- **Database:** MySQL or PostgreSQL
- **Main Tables:** Users · NGOs · Events · Volunteers · Applications · Donations · Reports

### 3.2 Architecture Workflow

- **Authentication:** User (Donor/Volunteer/NGO/Admin) opens web browser → submits login/register form → REST API call to backend → JWT token generated → role-based dashboard loaded
- **NGO Registration:** NGO submits registration form → backend validates Darpan ID → admin alerted via email → admin approves/rejects → NGO notified
- **Campaign/Event Flow:** NGO creates campaign/event → image uploaded to AWS S3 / Cloudinary → record saved in DB → displayed on frontend for donors and volunteers
- **Donation Flow:** Donor selects campaign → payment initiated via GPay/PhonePe gateway → payment verified by backend → Donation record saved in DB → receipt sent via Gmail/Outlook
- **Volunteer Flow:** Volunteer browses NGOs and events → submits application → application stored in Applications table → admin reviews → volunteer logs hours
- **Admin Flow:** Admin logs in → views reports and platform data → manages users, NGOs, donations → generates certificates
- **Guest User:** Can browse NGO listings and campaigns without authentication

### 3.3 Technology Stack

| Layer                | Technology                                          |
|----------------------|-----------------------------------------------------|
| Frontend             | React.js / Next.js, Tailwind CSS                    |
| Backend API          | Node.js (Express.js)                                |
| Database             | MySQL or PostgreSQL (Relational DB)                 |
| Payment Gateway      | GPay / PhonePe                                      |
| Email Service        | Gmail / Outlook (SMTP)                              |
| Cloud Storage        | AWS S3 / Cloudinary                                 |
| SMS Notifications    | Google Messages                                     |
| Authentication       | JWT (role-based access control)                     |
| Infrastructure       | Vercel (Frontend), Render (Backend), Cloud DB Host  |
| Version Control      | GitHub                                              |

---

## 4. Development Methodology: Incremental Model

**Recommendation:** Incremental Model

The Incremental Model is recommended for Terra Nova as the platform was developed in stages, with each increment delivering a working subset of functionality. This allowed core features to be tested and validated before adding complex integrations like payment processing and email automation.

**Phases:**

- **Phase 1:** Project setup, MongoDB connection, basic Express server, Admin model and login
- **Phase 2:** Donor and Volunteer authentication — registration, OTP verification, JWT login, password reset
- **Phase 3:** NGO registration with Darpan ID whitelist validation, admin verification workflow, and email notifications
- **Phase 4:** Campaign management — CRUD operations, Multer image upload, campaign listing on frontend
- **Phase 5:** Donation system — Razorpay integration, donation records, receipt emails, donor dashboard
- **Phase 6:** Volunteer hour logging, leaderboard, subscriber system, and admin dashboard
- **Phase 7:** Final deployment on Vercel and Render with environment configuration and rate limiting

---

## 5. COCOMO Analysis (Boehm, 1981)

This estimation uses the Basic COCOMO model for an **Organic** project type — a relatively small team working in a familiar environment (Node.js/MongoDB/HTML stack) with stable, well-understood requirements.

### 5.1 SLOC Measurement

COCOMO is designed to measure logical source lines of code — executable program logic, not markup or styling. Following standard COCOMO practice, only the backend application logic (Node.js) is counted, as HTML/CSS are presentation layers and not part of the estimable software logic.

| Component         | Files                                       | SLOC  |
|-------------------|---------------------------------------------|-------|
| Frontend (markup) | 16 HTML/CSS files *(excluded from COCOMO)*  | 8,379 |
| Backend Logic     | server.js + 9 model files + utility scripts | 1,827 |
| **COCOMO Input**  | Backend logical SLOC only                   | **1,827** |

**Rounded for COCOMO:** **2 KLOC**

### 5.2 Key Parameters

- **Software Size:** 2,000 SLOC (2 KLOC)
- **Mode:** Organic
- **Constants:** a = 2.4, b = 1.05, c = 2.5, d = 0.38
- **EAF (Effort Adjustment Factor):** 1.10 (accounts for third-party integrations: Razorpay payment gateway, Nodemailer SMTP, multi-role JWT auth, and OTP verification complexity)

### 5.3 Effort Calculation

```
Effort (E) = a × (KLOC)^b × EAF
E = 2.4 × (2)^1.05 × 1.10
E = 2.4 × 2.07 × 1.10
E ≈ 5.5 Person-months
```

> **Estimated Effort: ~5.5 Person-months**

### 5.4 Schedule & Time Calculation

```
Time (T) = c × (E)^d
T = 2.5 × (5.5)^0.38
T = 2.5 × 1.92
T ≈ 4.8 Months
```

> **Estimated Schedule: ~4.8 Months**

### 5.5 Personnel Requirement

```
Staff (S) = E / T
S = 5.5 / 4.8
S ≈ 1.15 (Approx. 1–2 Developers)
```

> **Recommended Team Size: 1–2 Developers**

### 5.6 Cost Estimation (INR)

| Component          | Tool                    | Cost |
|--------------------|-------------------------|------|
| Frontend Hosting   | Vercel Free Tier        | ₹0   |
| Backend Hosting    | Render Free Tier        | ₹0   |
| Database           | MongoDB Atlas Free Tier | ₹0   |
| Payment Gateway    | Razorpay Test Mode      | ₹0   |
| Email Service      | Nodemailer + SMTP       | ₹0   |
| File Storage       | Local Disk (Render)     | ₹0   |
| Version Control    | GitHub Free             | ₹0   |
| **Total Tool Cost**|                         | **₹0** |

> All infrastructure components use free tiers, making the total monetary cost ₹0 for development and testing. Production scaling (Razorpay live mode, paid Render tier) would incur costs based on transaction volume.

---

## 6. Metrics & Risk Management

### 6.1 Project Metrics

- **Code Quality:** Modular Express route structure with separation of concerns; Mongoose schemas enforce data integrity
- **Security:** bcrypt cost factor 12 for password hashing; JWT with secret key; OTP expiry enforced; environment variables for all credentials
- **Performance:** Rate limiting prevents API abuse; API response target under 2 seconds for standard queries
- **Reliability:** Email verification (OTP) ensures valid donor and volunteer accounts before access is granted

### 6.2 Risk Mitigation

| Risk                        | Severity | Mitigation Strategy                                                                 |
|-----------------------------|----------|-------------------------------------------------------------------------------------|
| Razorpay Payment Failure    | High     | Order verification before booking confirmation; error handling with user feedback   |
| Data Privacy Breach         | Critical | JWT authentication, bcrypt hashing (cost 12), environment variables for all secrets |
| NGO Impersonation           | High     | Darpan ID whitelist validation + admin manual approval before NGO can log in        |
| Backend Sleep (Render)      | Medium   | Frontend handles loading states during backend cold-start wake-up time              |
| Email Delivery Failure      | Medium   | SMTP transporter verified on startup; errors logged without crashing the server     |
| SLOC Overrun                | Low      | Modular design with reusable Express middleware and shared HTML/CSS components      |
| MongoDB Atlas Connectivity  | Medium   | DNS forced to Google (8.8.8.8) to resolve Atlas SRV; connection timeout set to 10s |

---

## 7. Conclusion

The COCOMO analysis indicates that the Terra Nova NGO platform falls under a small-scale **Organic** project category. Following standard COCOMO practice, the estimation is based on **2 KLOC** of backend logical source code (Node.js), excluding HTML/CSS presentation layers which are not part of the estimable software logic.

Considering the use of open-source tools and a student development environment, the estimated effort is approximately **5.5 person-months**. With a team of **1–2 student developers**, the project can be realistically completed within **4.8 months**.

By adopting an incremental development approach, the team effectively managed multi-role authentication, third-party payment integration (Razorpay), and automated email workflows (Nodemailer) — delivering a functional, secure, and scalable NGO management platform suitable for both academic demonstration and real-world deployment.
