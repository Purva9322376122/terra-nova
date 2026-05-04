require('dotenv').config();

// Force Node.js to use Google DNS for Atlas SRV resolution
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto     = require('crypto');

const ApprovedNgo = require('./models/ApprovedNgo');
const Volunteer  = require('./models/volunteer');
const Subscriber = require('./models/subscriber');
const Donation   = require('./models/donation');
const Admin      = require('./models/admin');
const Ngo        = require('./models/ngo');
const Donor      = require('./models/donor');
const VolunteerLog = require('./models/volunteerLog');
const VolunteerAccount = require('./models/volunteerAccount');

const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

// Multer setup — store in /uploads, max 5MB, images only
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'campaign-' + Date.now() + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|jpg|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed.'));
  }
});

const app  = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'terranova_secret_key';

// ── MIDDLEWARE ───────────────────────────────────────────────
const rateLimit = require('express-rate-limit');

// General public API — 100 requests per 15 min
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests. Please try again in 15 minutes.' },
  standardHeaders: true, legacyHeaders: false,
});

// Strict limiter for auth/registration — 10 per 15 min
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many attempts. Please try again in 15 minutes.' },
  standardHeaders: true, legacyHeaders: false,
});

// Donation limiter — 20 per hour
const donateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: 'Too many donation attempts. Please try again later.' },
  standardHeaders: true, legacyHeaders: false,
});

app.use(cors());
app.use(express.json());
app.set('trust proxy', 1); // Required for rate limiting behind Render/proxy

// Apply general limiter to all routes
app.use('/api/', generalLimiter);

// Serve uploaded images
app.use('/uploads', require('express').static(path.join(__dirname, 'uploads')));

// Strict limits on auth routes
app.use('/api/donor/register',       authLimiter);
app.use('/api/donor/login',          authLimiter);
app.use('/api/donor/forgot-password',authLimiter);
app.use('/api/volunteer/register',   authLimiter);
app.use('/api/volunteer/login',      authLimiter);
app.use('/api/ngo/register',         authLimiter);
app.use('/api/ngo/login',            authLimiter);
app.use('/api/admin/login',          authLimiter);

// Donation limits
app.use('/api/donate',               donateLimiter);
app.use('/api/donor/donate',         donateLimiter);
app.use('/api/payment/create-order', donateLimiter);
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// ── MONGODB ──────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 10000,
  family: 4,
})
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err.message));

// ── EMAIL TRANSPORTER ────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: 2525,
  secure: false,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  tls: { rejectUnauthorized: false },
});
transporter.verify(err => {
  if (err) console.error('❌ Email setup error:', err.message);
  else     console.log('✅ Email service ready');
});

// ── EMAIL HELPERS ─────────────────────────────────────────────

const sendWelcomeEmail = async (email) => {
  await transporter.sendMail({
    from: `Terra Nova NGO <${process.env.SENDER_EMAIL}>`,
    to: email,
    subject: '🌿 Welcome to the Terra Nova Movement!',
    html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f0ebe0;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0ebe0;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- HEADER -->
        <tr>
          <td style="background:linear-gradient(135deg,#1a3a2e 0%,#2d6a4f 60%,#3a8a6a 100%);padding:48px;text-align:center;">
            <div style="font-size:48px;margin-bottom:16px;">🌿</div>
            <h1 style="color:#ffffff;font-size:28px;font-weight:700;margin:0 0 8px;font-family:Georgia,serif;">Welcome to Terra Nova!</h1>
            <p style="color:rgba(245,240,232,0.7);font-size:14px;margin:0;letter-spacing:0.05em;">Empowering Communities · Restoring Ecosystems</p>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="padding:40px 48px;">
            <p style="color:#1a3a2e;font-size:18px;font-weight:700;margin:0 0 12px;font-family:Georgia,serif;">Thank you for joining the movement! 💚</p>
            <p style="color:#4a5568;font-size:15px;line-height:1.8;margin:0 0 24px;">
              You're now part of a global community of changemakers working to restore ecosystems and empower communities around the world. We're thrilled to have you with us.
            </p>

            <!-- What you'll receive -->
            <div style="background:#f7f3ec;border-radius:10px;padding:24px;margin-bottom:28px;">
              <p style="color:#1a3a2e;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 16px;">What to expect from us</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#4a5568;">
                    <span style="color:#2d6a4f;font-weight:700;margin-right:8px;">🌱</span> Campaign updates and impact stories
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#4a5568;">
                    <span style="color:#2d6a4f;font-weight:700;margin-right:8px;">💧</span> News about our environmental projects
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#4a5568;">
                    <span style="color:#2d6a4f;font-weight:700;margin-right:8px;">🙋</span> Volunteer opportunities near you
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#4a5568;">
                    <span style="color:#2d6a4f;font-weight:700;margin-right:8px;">📊</span> Transparent impact reports
                  </td>
                </tr>
              </table>
            </div>

            <!-- CTA -->
            <div style="text-align:center;margin-bottom:28px;">
              <a href="${process.env.FRONTEND_URL || 'http://127.0.0.1:3000'}/index.html"
                 style="background:#1a3a2e;color:#ffffff;padding:14px 36px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;display:inline-block;">
                Explore Our Campaigns →
              </a>
            </div>

            <!-- Stats -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f3ec;border-radius:10px;overflow:hidden;">
              <tr>
                <td style="padding:20px;text-align:center;border-right:1px solid #e8e0d0;">
                  <div style="font-size:22px;font-weight:700;color:#1a3a2e;font-family:Georgia,serif;">142</div>
                  <div style="font-size:11px;color:#5a7365;text-transform:uppercase;letter-spacing:0.05em;margin-top:4px;">Countries</div>
                </td>
                <td style="padding:20px;text-align:center;border-right:1px solid #e8e0d0;">
                  <div style="font-size:22px;font-weight:700;color:#1a3a2e;font-family:Georgia,serif;">2.4M+</div>
                  <div style="font-size:11px;color:#5a7365;text-transform:uppercase;letter-spacing:0.05em;margin-top:4px;">Lives Impacted</div>
                </td>
                <td style="padding:20px;text-align:center;">
                  <div style="font-size:22px;font-weight:700;color:#1a3a2e;font-family:Georgia,serif;">18K</div>
                  <div style="font-size:11px;color:#5a7365;text-transform:uppercase;letter-spacing:0.05em;margin-top:4px;">Volunteers</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background:#1a3a2e;padding:28px 48px;text-align:center;">
            <p style="color:rgba(245,240,232,0.9);font-size:14px;font-weight:600;margin:0 0 6px;font-family:Georgia,serif;">Terra Nova NGO</p>
            <p style="color:rgba(245,240,232,0.45);font-size:12px;margin:0 0 14px;line-height:1.6;">
              You're receiving this because you subscribed at terranova.org<br/>
              <a href="mailto:${process.env.ADMIN_EMAIL}" style="color:#52b788;text-decoration:none;">${process.env.ADMIN_EMAIL}</a>
            </p>
            <p style="color:rgba(245,240,232,0.25);font-size:11px;margin:0;">© 2026 Terra Nova Foundation · All rights reserved</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
  });
};

const sendDonationReceipt = async (email, amount, campaign, frequency, donorName = '') => {
  const receiptId = 'TN' + Date.now().toString().slice(-8).toUpperCase();
  const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const freqLabel = { once: 'One-time', monthly: 'Monthly', annual: 'Annual' }[frequency] || 'One-time';
  const campaignLabel = campaign && campaign !== 'General' ? campaign : 'General Fund';
  const amountFormatted = `₹${Number(amount).toLocaleString('en-IN')}`;

  // Impact message based on amount
  let impactMsg = 'Your generosity helps restore ecosystems and empower communities.';
  if (amount >= 5000) impactMsg = 'Your generous gift can plant 100+ trees and provide clean water to a family for a year.';
  else if (amount >= 1000) impactMsg = 'Your gift can plant 20 trees and support a child\'s education for a month.';
  else if (amount >= 500) impactMsg = 'Your gift can plant 10 trees and provide clean water access to 2 families.';
  else if (amount >= 250) impactMsg = 'Your gift can plant 5 trees and support a community health visit.';

  await transporter.sendMail({
    from: `Terra Nova NGO <${process.env.SENDER_EMAIL}>`,
    to: email,
    subject: `🌿 Donation Receipt — ${amountFormatted} | Terra Nova`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f0ebe0;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0ebe0;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- HEADER -->
        <tr>
          <td style="background:linear-gradient(135deg,#1a3a2e 0%,#2d6a4f 60%,#3a8a6a 100%);padding:40px 48px;text-align:center;">
            <div style="display:inline-block;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);border-radius:50px;padding:6px 18px;margin-bottom:20px;">
              <span style="color:#e8c57a;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">Official Donation Receipt</span>
            </div>
            <div style="font-size:48px;margin-bottom:12px;">🌿</div>
            <h1 style="color:#ffffff;font-size:28px;font-weight:700;margin:0 0 6px;font-family:Georgia,serif;">Terra Nova</h1>
            <p style="color:rgba(245,240,232,0.7);font-size:13px;margin:0;letter-spacing:0.05em;">Empowering Communities · Restoring Ecosystems</p>
          </td>
        </tr>

        <!-- THANK YOU BANNER -->
        <tr>
          <td style="background:#f7f3ec;padding:28px 48px;text-align:center;border-bottom:1px solid #e8e0d0;">
            <p style="color:#1a3a2e;font-size:20px;font-weight:700;margin:0 0 8px;font-family:Georgia,serif;">Thank you${donorName ? ', ' + donorName : ''}! 💚</p>
            <p style="color:#5a7365;font-size:14px;margin:0;line-height:1.6;">${impactMsg}</p>
          </td>
        </tr>

        <!-- AMOUNT HIGHLIGHT -->
        <tr>
          <td style="padding:32px 48px 0;text-align:center;">
            <div style="background:linear-gradient(135deg,#1a3a2e,#2d6a4f);border-radius:12px;padding:24px;display:inline-block;width:100%;box-sizing:border-box;">
              <p style="color:rgba(245,240,232,0.6);font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin:0 0 8px;">Donation Amount</p>
              <p style="color:#e8c57a;font-size:42px;font-weight:700;margin:0;font-family:Georgia,serif;">${amountFormatted}</p>
              <p style="color:rgba(245,240,232,0.6);font-size:12px;margin:8px 0 0;">${freqLabel} · ${campaignLabel}</p>
            </div>
          </td>
        </tr>

        <!-- RECEIPT DETAILS TABLE -->
        <tr>
          <td style="padding:28px 48px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8e0d0;border-radius:10px;overflow:hidden;">
              <tr style="background:#f7f3ec;">
                <td colspan="2" style="padding:14px 20px;font-size:11px;font-weight:700;color:#5a7365;letter-spacing:0.08em;text-transform:uppercase;border-bottom:1px solid #e8e0d0;">Receipt Details</td>
              </tr>
              <tr style="border-bottom:1px solid #f0ebe0;">
                <td style="padding:13px 20px;font-size:13px;color:#5a7365;width:45%;">Receipt ID</td>
                <td style="padding:13px 20px;font-size:13px;color:#1a3a2e;font-weight:700;font-family:monospace;">#${receiptId}</td>
              </tr>
              <tr style="background:#fafaf8;border-bottom:1px solid #f0ebe0;">
                <td style="padding:13px 20px;font-size:13px;color:#5a7365;">Date</td>
                <td style="padding:13px 20px;font-size:13px;color:#1a3a2e;font-weight:600;">${date}</td>
              </tr>
              <tr style="border-bottom:1px solid #f0ebe0;">
                <td style="padding:13px 20px;font-size:13px;color:#5a7365;">Donor Email</td>
                <td style="padding:13px 20px;font-size:13px;color:#1a3a2e;font-weight:600;">${email}</td>
              </tr>
              <tr style="background:#fafaf8;border-bottom:1px solid #f0ebe0;">
                <td style="padding:13px 20px;font-size:13px;color:#5a7365;">Campaign</td>
                <td style="padding:13px 20px;font-size:13px;color:#1a3a2e;font-weight:600;">${campaignLabel}</td>
              </tr>
              <tr style="border-bottom:1px solid #f0ebe0;">
                <td style="padding:13px 20px;font-size:13px;color:#5a7365;">Frequency</td>
                <td style="padding:13px 20px;font-size:13px;color:#1a3a2e;font-weight:600;">${freqLabel}</td>
              </tr>
              <tr style="background:#fafaf8;">
                <td style="padding:13px 20px;font-size:13px;color:#5a7365;">Status</td>
                <td style="padding:13px 20px;">
                  <span style="background:#d1fae5;color:#065f46;font-size:12px;font-weight:700;padding:3px 10px;border-radius:100px;border:1px solid #6ee7b7;">✅ Completed</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- IMPACT STATS -->
        <tr>
          <td style="padding:0 48px 28px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#f7f3ec;border-radius:10px;padding:20px;text-align:center;">
                  <p style="color:#5a7365;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 14px;">Your Impact at a Glance</p>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="text-align:center;padding:0 8px;">
                        <div style="font-size:24px;margin-bottom:4px;">🌳</div>
                        <div style="font-size:18px;font-weight:700;color:#1a3a2e;font-family:Georgia,serif;">${Math.floor(amount/50)}</div>
                        <div style="font-size:11px;color:#5a7365;margin-top:2px;">Trees Planted</div>
                      </td>
                      <td style="text-align:center;padding:0 8px;border-left:1px solid #e8e0d0;border-right:1px solid #e8e0d0;">
                        <div style="font-size:24px;margin-bottom:4px;">💧</div>
                        <div style="font-size:18px;font-weight:700;color:#1a3a2e;font-family:Georgia,serif;">${Math.floor(amount/100)}</div>
                        <div style="font-size:11px;color:#5a7365;margin-top:2px;">Families Helped</div>
                      </td>
                      <td style="text-align:center;padding:0 8px;">
                        <div style="font-size:24px;margin-bottom:4px;">👶</div>
                        <div style="font-size:18px;font-weight:700;color:#1a3a2e;font-family:Georgia,serif;">${Math.floor(amount/80)}</div>
                        <div style="font-size:11px;color:#5a7365;margin-top:2px;">Children Supported</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- TAX NOTE -->
        <tr>
          <td style="padding:0 48px 28px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#fffbeb;border:1px solid #fbbf24;border-radius:10px;padding:16px 20px;">
                  <p style="color:#92400e;font-size:13px;margin:0;line-height:1.6;">
                    <strong>🧾 Tax Exemption:</strong> Terra Nova is registered under Section 80G of the Income Tax Act. This receipt is valid for claiming tax deductions. Please retain it for your records.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background:#1a3a2e;padding:28px 48px;text-align:center;">
            <p style="color:rgba(245,240,232,0.9);font-size:14px;font-weight:600;margin:0 0 6px;font-family:Georgia,serif;">Terra Nova NGO</p>
            <p style="color:rgba(245,240,232,0.45);font-size:12px;margin:0 0 14px;line-height:1.6;">
              This is an auto-generated receipt. For queries, contact us at<br/>
              <a href="mailto:${process.env.ADMIN_EMAIL}" style="color:#52b788;text-decoration:none;">${process.env.ADMIN_EMAIL}</a>
            </p>
            <div style="border-top:1px solid rgba(255,255,255,0.1);padding-top:14px;margin-top:4px;">
              <p style="color:rgba(245,240,232,0.3);font-size:11px;margin:0;">© 2026 Terra Nova · All rights reserved · Receipt ID: #${receiptId}</p>
            </div>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
  });
};

const sendAdminVolunteerAlert = async (volunteer) => {
  await transporter.sendMail({
    from: `Terra Nova NGO <${process.env.SENDER_EMAIL}>`,
    to: process.env.ADMIN_EMAIL,
    subject: `🙋 New Volunteer Application — ${volunteer.firstName} ${volunteer.lastName}`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f0ebe0;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0ebe0;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- HEADER -->
        <tr>
          <td style="background:linear-gradient(135deg,#1a3a2e 0%,#2d6a4f 60%,#3a8a6a 100%);padding:36px 48px;text-align:center;">
            <div style="font-size:40px;margin-bottom:12px;">🙋</div>
            <h1 style="color:#ffffff;font-size:24px;font-weight:700;margin:0 0 6px;">New Volunteer Application</h1>
            <p style="color:rgba(245,240,232,0.65);font-size:13px;margin:0;">Requires your attention</p>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="padding:36px 48px;">
            <p style="color:#4a5568;font-size:15px;line-height:1.8;margin:0 0 24px;">A new volunteer has registered on Terra Nova. Here are their details:</p>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
              <tr style="border-bottom:1px solid #f3f4f6;">
                <td style="padding:12px 18px;color:#6b7280;font-size:14px;width:40%;">Full Name</td>
                <td style="padding:12px 18px;color:#1a3a2e;font-size:14px;font-weight:600;">${volunteer.firstName} ${volunteer.lastName}</td>
              </tr>
              <tr style="background:#fafaf8;border-bottom:1px solid #f3f4f6;">
                <td style="padding:12px 18px;color:#6b7280;font-size:14px;">Email</td>
                <td style="padding:12px 18px;font-size:14px;"><a href="mailto:${volunteer.email}" style="color:#2d6a4f;text-decoration:none;">${volunteer.email}</a></td>
              </tr>
              <tr style="border-bottom:1px solid #f3f4f6;">
                <td style="padding:12px 18px;color:#6b7280;font-size:14px;">Phone</td>
                <td style="padding:12px 18px;color:#1a3a2e;font-size:14px;">${volunteer.phone || '—'}</td>
              </tr>
              <tr style="background:#fafaf8;border-bottom:1px solid #f3f4f6;">
                <td style="padding:12px 18px;color:#6b7280;font-size:14px;">Skills</td>
                <td style="padding:12px 18px;color:#1a3a2e;font-size:14px;">${volunteer.skills || '—'}</td>
              </tr>
              <tr>
                <td style="padding:12px 18px;color:#6b7280;font-size:14px;">Message</td>
                <td style="padding:12px 18px;color:#1a3a2e;font-size:14px;">${volunteer.message || '—'}</td>
              </tr>
            </table>

            <div style="text-align:center;margin-top:28px;">
              <a href="${process.env.ADMIN_DASHBOARD_URL || 'http://127.0.0.1:3000/admin-dashboard.html'}"
                 style="background:#1a3a2e;color:#ffffff;padding:13px 32px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;">
                View in Admin Dashboard →
              </a>
            </div>

            <p style="color:#9ca3af;font-size:13px;margin-top:32px;border-top:1px solid #e5e7eb;padding-top:16px;text-align:center;">
              Terra Nova Admin System · Automated alert
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
  });
};

// ── NGO VERIFICATION EMAIL HELPERS ───────────────────────────

const sendNgoPendingEmail = async (ngoEmail, ngoName) => {
  await transporter.sendMail({
    from: `Terra Nova NGO <${process.env.SENDER_EMAIL}>`,
    to: ngoEmail,
    subject: '⏳ NGO Registration Received — Under Review | Terra Nova',
    html: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #f7f3ec; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #1a3a2e, #2d6a4f); padding: 40px; text-align: center;">
          <div style="font-size: 36px; margin-bottom: 12px;">⏳</div>
          <h1 style="color: #fff; font-size: 24px; margin: 0;">Registration Under Review</h1>
        </div>
        <div style="padding: 40px;">
          <p style="color: #4a5568; font-size: 15px; line-height: 1.8;">Dear <strong>${ngoName}</strong>,</p>
          <p style="color: #4a5568; font-size: 15px; line-height: 1.8;">
            Thank you for registering on Terra Nova's NGO Portal. Your application has been received and is currently being reviewed by our admin team.
          </p>
          <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="color: #856404; margin: 0; font-size: 14px;">
              ⚠️ <strong>Your account is pending verification.</strong> You will not be able to log in until an admin approves your registration. This typically takes 1–3 business days.
            </p>
          </div>
          <p style="color: #4a5568; font-size: 14px;">You will receive another email once your account has been reviewed.</p>
          <p style="color: #9ca3af; font-size: 13px; margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 16px;">Terra Nova NGO Portal · Automated notification</p>
        </div>
      </div>
    `
  });
};

const sendAdminNgoAlert = async (ngo) => {
  const approveUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/admin/ngo/${ngo._id}/verify?action=approve&secret=${process.env.ADMIN_ACTION_SECRET}`;
  const rejectUrl  = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/admin/ngo/${ngo._id}/verify?action=reject&secret=${process.env.ADMIN_ACTION_SECRET}`;

  await transporter.sendMail({
    from: `Terra Nova NGO <${process.env.SENDER_EMAIL}>`,
    to: process.env.ADMIN_EMAIL,
    subject: `🏛️ New NGO Registration — ${ngo.name} (Pending Approval)`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #f7f3ec; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #1a3a2e, #2d6a4f); padding: 40px; text-align: center;">
          <div style="font-size: 36px; margin-bottom: 12px;">🏛️</div>
          <h1 style="color: #fff; font-size: 24px; margin: 0;">New NGO Registration</h1>
          <p style="color: rgba(255,255,255,0.7); margin: 8px 0 0; font-size: 13px;">Requires your approval</p>
        </div>
        <div style="padding: 40px;">
          <table style="width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
            <tr style="border-bottom: 1px solid #f3f4f6;">
              <td style="padding: 12px 16px; color: #6b7280; font-size: 14px; width: 40%;">NGO Name</td>
              <td style="padding: 12px 16px; color: #1a3a2e; font-size: 14px; font-weight: 600;">${ngo.name}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f3f4f6;">
              <td style="padding: 12px 16px; color: #6b7280; font-size: 14px;">Email</td>
              <td style="padding: 12px 16px; color: #1a3a2e; font-size: 14px;">${ngo.email}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f3f4f6;">
              <td style="padding: 12px 16px; color: #6b7280; font-size: 14px;">Category</td>
              <td style="padding: 12px 16px; color: #1a3a2e; font-size: 14px; text-transform: capitalize;">${ngo.category}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f3f4f6;">
              <td style="padding: 12px 16px; color: #6b7280; font-size: 14px;">Location</td>
              <td style="padding: 12px 16px; color: #1a3a2e; font-size: 14px;">${ngo.location || '—'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f3f4f6;">
              <td style="padding: 12px 16px; color: #6b7280; font-size: 14px;">Reg. Number</td>
              <td style="padding: 12px 16px; color: #1a3a2e; font-size: 14px; font-family: monospace;">${ngo.registrationNumber || '—'}</td>
            </tr>
            <tr>
              <td style="padding: 12px 16px; color: #6b7280; font-size: 14px;">Mission</td>
              <td style="padding: 12px 16px; color: #1a3a2e; font-size: 14px;">${ngo.mission || '—'}</td>
            </tr>
          </table>
          <div style="display: flex; gap: 12px; margin-top: 28px; flex-wrap: wrap;">
            <a href="${approveUrl}" style="flex: 1; text-align: center; background: #1a3a2e; color: white; padding: 14px 24px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600; min-width: 140px;">
              ✅ Approve NGO
            </a>
            <a href="${rejectUrl}" style="flex: 1; text-align: center; background: #c0392b; color: white; padding: 14px 24px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600; min-width: 140px;">
              ❌ Reject NGO
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 16px; text-align: center;">
            Or manage NGOs from the <a href="${process.env.ADMIN_DASHBOARD_URL || '#'}" style="color: #2d6a4f;">Admin Dashboard</a>
          </p>
          <p style="color: #9ca3af; font-size: 13px; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 16px;">Terra Nova Admin System · Automated alert</p>
        </div>
      </div>
    `
  });
};

const sendNgoApprovedEmail = async (ngoEmail, ngoName) => {
  await transporter.sendMail({
    from: `Terra Nova NGO <${process.env.SENDER_EMAIL}>`,
    to: ngoEmail,
    subject: '✅ Your NGO has been Verified! | Terra Nova',
    html: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #f7f3ec; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #1a3a2e, #2d6a4f); padding: 40px; text-align: center;">
          <div style="font-size: 40px; margin-bottom: 12px;">✅</div>
          <h1 style="color: #fff; font-size: 26px; margin: 0;">You're Verified!</h1>
        </div>
        <div style="padding: 40px;">
          <p style="color: #4a5568; font-size: 15px; line-height: 1.8;">Dear <strong>${ngoName}</strong>,</p>
          <p style="color: #4a5568; font-size: 15px; line-height: 1.8;">
            Great news! Your NGO registration on Terra Nova has been <strong>approved and verified</strong>. You can now log in to your dashboard and start managing your profile and campaigns.
          </p>
          <div style="background: #d1fae5; border: 1px solid #6ee7b7; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
            <p style="color: #065f46; margin: 0; font-size: 15px; font-weight: 600;">🎉 Your account is now active</p>
          </div>
          <div style="text-align: center; margin-top: 28px;">
            <a href="${process.env.NGO_LOGIN_URL || 'http://localhost:5500/Frontend/ngo-login.html'}"
               style="background: #1a3a2e; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600;">
              Login to Your Dashboard →
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 13px; margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 16px;">Terra Nova NGO Portal · Automated notification</p>
        </div>
      </div>
    `
  });
};

const sendNgoRejectedEmail = async (ngoEmail, ngoName, reason) => {
  await transporter.sendMail({
    from: `Terra Nova NGO <${process.env.SENDER_EMAIL}>`,
    to: ngoEmail,
    subject: '❌ NGO Registration Update | Terra Nova',
    html: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #f7f3ec; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #7f1d1d, #991b1b); padding: 40px; text-align: center;">
          <div style="font-size: 36px; margin-bottom: 12px;">❌</div>
          <h1 style="color: #fff; font-size: 24px; margin: 0;">Registration Not Approved</h1>
        </div>
        <div style="padding: 40px;">
          <p style="color: #4a5568; font-size: 15px; line-height: 1.8;">Dear <strong>${ngoName}</strong>,</p>
          <p style="color: #4a5568; font-size: 15px; line-height: 1.8;">
            After reviewing your NGO registration, we were unable to approve your account at this time.
          </p>
          ${reason ? `
          <div style="background: #fee2e2; border: 1px solid #fca5a5; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="color: #991b1b; margin: 0; font-size: 14px;"><strong>Reason:</strong> ${reason}</p>
          </div>
          ` : ''}
          <p style="color: #4a5568; font-size: 14px;">If you believe this is an error, please contact us at <a href="mailto:${process.env.ADMIN_EMAIL}" style="color: #2d6a4f;">${process.env.ADMIN_EMAIL}</a> with your registration details.</p>
          <p style="color: #9ca3af; font-size: 13px; margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 16px;">Terra Nova NGO Portal · Automated notification</p>
        </div>
      </div>
    `
  });
};

// ── AUTH MIDDLEWARES ──────────────────────────────────────────

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided.' });
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

const ngoAuthMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided.' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.ngoId) return res.status(401).json({ error: 'Not an NGO token.' });

    const ngo = await Ngo.findById(decoded.ngoId);
    if (!ngo) return res.status(401).json({ error: 'NGO not found.' });
    if (ngo.verificationStatus === 'pending')
      return res.status(403).json({ error: 'Your account is pending verification by the admin. You will be notified by email once approved.', status: 'pending' });
    if (ngo.verificationStatus === 'rejected')
      return res.status(403).json({ error: 'Your NGO registration was not approved. Please contact support.', status: 'rejected' });

    req.ngo = decoded;
    req.ngoDoc = ngo;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

// ── ROUTE: Admin Login ────────────────────────────────────────
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password required.' });
  try {
    const admin = await Admin.findOne({ username });
    if (!admin) return res.status(401).json({ error: 'Invalid credentials.' });
    const match = await bcrypt.compare(password, admin.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials.' });
    const token = jwt.sign({ id: admin._id, username }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ success: true, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// ── ROUTE: Admin — Approved NGO Whitelist (protected) ─────────

// View all pre-approved NGO IDs
app.get('/api/admin/approved-ngos', authMiddleware, async (req, res) => {
  try {
    const list = await ApprovedNgo.find().sort({ createdAt: -1 });
    res.json({ success: true, data: list });
  } catch {
    res.status(500).json({ error: 'Failed to fetch approved NGO list.' });
  }
});

// Add an NGO ID to the whitelist
app.post('/api/admin/approved-ngos', authMiddleware, async (req, res) => {
  const { darpanId, ngoName } = req.body;
  if (!darpanId || !ngoName)
    return res.status(400).json({ error: 'darpanId and ngoName are required.' });
  try {
    const entry = new ApprovedNgo({
      darpanId: darpanId.trim().toUpperCase(),
      ngoName: ngoName.trim(),
    });
    await entry.save();
    console.log('✅ Added to whitelist:', darpanId);
    res.json({ success: true, message: `${ngoName} added to approved list.`, data: entry });
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ error: 'This Darpan ID is already in the approved list.' });
    res.status(500).json({ error: 'Failed to add to approved list.' });
  }
});

// Remove an NGO ID from the whitelist
app.delete('/api/admin/approved-ngos/:id', authMiddleware, async (req, res) => {
  try {
    await ApprovedNgo.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Removed from approved list.' });
  } catch {
    res.status(500).json({ error: 'Failed to remove from approved list.' });
  }
});

// ── ROUTE: Admin — List all NGOs (protected) ─────────────────
app.get('/api/admin/ngos', authMiddleware, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { verificationStatus: status } : {};
    const ngos = await Ngo.find(filter).select('-password').sort({ createdAt: -1 });
    res.json({ success: true, data: ngos });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch NGOs.' });
  }
});

// ── ROUTE: Admin — Approve or Reject NGO (protected) ─────────
app.post('/api/admin/ngo/:id/verify', authMiddleware, async (req, res) => {
  const { action, reason } = req.body;
  await _verifyNgo(req.params.id, action, reason, res);
});

app.get('/api/admin/ngo/:id/verify', async (req, res) => {
  const { action, secret } = req.query;
  if (secret !== process.env.ADMIN_ACTION_SECRET) {
    return res.status(403).send('<h2>Forbidden — invalid secret.</h2>');
  }
  await _verifyNgo(req.params.id, action, '', res, true);
});

async function _verifyNgo(id, action, reason, res, isHtmlResponse = false) {
  if (!['approve', 'reject'].includes(action)) {
    if (isHtmlResponse) return res.status(400).send('<h2>Invalid action.</h2>');
    return res.status(400).json({ error: 'Action must be "approve" or "reject".' });
  }
  try {
    const ngo = await Ngo.findById(id);
    if (!ngo) {
      if (isHtmlResponse) return res.status(404).send('<h2>NGO not found.</h2>');
      return res.status(404).json({ error: 'NGO not found.' });
    }

    if (action === 'approve') {
      ngo.verificationStatus = 'verified';
      ngo.verifiedAt = new Date();
      ngo.rejectionReason = '';
      await ngo.save();
      console.log('✅ NGO approved:', ngo.email);
      try { await sendNgoApprovedEmail(ngo.email, ngo.name); } catch(e) { console.error('Email err:', e.message); }
      if (isHtmlResponse) return res.send(`<h2 style="font-family:Georgia;color:#1a3a2e;padding:40px">✅ ${ngo.name} has been APPROVED. A confirmation email has been sent to ${ngo.email}.</h2>`);
      return res.json({ success: true, message: `${ngo.name} approved.` });
    }

    if (action === 'reject') {
      ngo.verificationStatus = 'rejected';
      ngo.rejectionReason = reason || '';
      await ngo.save();
      console.log('❌ NGO rejected:', ngo.email);
      try { await sendNgoRejectedEmail(ngo.email, ngo.name, reason); } catch(e) { console.error('Email err:', e.message); }
      if (isHtmlResponse) return res.send(`<h2 style="font-family:Georgia;color:#7f1d1d;padding:40px">❌ ${ngo.name} has been REJECTED. A notification email has been sent to ${ngo.email}.</h2>`);
      return res.json({ success: true, message: `${ngo.name} rejected.` });
    }
  } catch (err) {
    console.error(err);
    if (isHtmlResponse) return res.status(500).send('<h2>Server error.</h2>');
    return res.status(500).json({ error: 'Failed to update NGO status.' });
  }
}

// ── ROUTE: Admin — Get volunteers, donations, subscribers (protected) ──
app.get('/api/admin/volunteers',  authMiddleware, async (req, res) => {
  try { res.json({ success: true, data: await Volunteer.find().sort({ createdAt: -1 }) }); }
  catch(err) { res.status(500).json({ error: 'Failed to fetch volunteers.' }); }
});
app.get('/api/admin/donations',   authMiddleware, async (req, res) => {
  try { res.json({ success: true, data: await Donation.find().sort({ createdAt: -1 }) }); }
  catch(err) { res.status(500).json({ error: 'Failed to fetch donations.' }); }
});
app.get('/api/admin/subscribers', authMiddleware, async (req, res) => {
  try { res.json({ success: true, data: await Subscriber.find().sort({ createdAt: -1 }) }); }
  catch(err) { res.status(500).json({ error: 'Failed to fetch subscribers.' }); }
});

// ── ROUTE: Admin — Delete (protected) ────────────────────────
app.delete('/api/admin/volunteers/:id',  authMiddleware, async (req, res) => {
  try { await Volunteer.findByIdAndDelete(req.params.id); res.json({ success: true }); }
  catch { res.status(500).json({ error: 'Failed to delete.' }); }
});
app.delete('/api/admin/subscribers/:id', authMiddleware, async (req, res) => {
  try { await Subscriber.findByIdAndDelete(req.params.id); res.json({ success: true }); }
  catch { res.status(500).json({ error: 'Failed to delete.' }); }
});

// ── PUBLIC ROUTES ─────────────────────────────────────────────

app.post('/api/volunteer', async (req, res) => {
  const { firstName, lastName, email, phone, skills, availability, message } = req.body;
  if (!firstName || !lastName || !email)
    return res.status(400).json({ error: 'Name and email are required.' });
  try {
    const volunteer = new Volunteer({ firstName, lastName, email, phone, skills, availability, message });
    await volunteer.save();
    try { await sendAdminVolunteerAlert({ firstName, lastName, email, phone, skills, message }); } catch {}
    res.json({ success: true, message: 'Volunteer registered!', id: volunteer._id });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'This email is already registered.' });
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

app.post('/api/newsletter', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });
  try {
    const subscriber = new Subscriber({ email });
    await subscriber.save();
    try { await sendWelcomeEmail(email); } catch {}
    res.json({ success: true, message: 'Subscribed successfully!' });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'This email is already subscribed.' });
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

app.post('/api/donate', async (req, res) => {
  const { amount, frequency, campaign, currency, email, campaignId, ngoId } = req.body;
  if (!amount || amount <= 0)
    return res.status(400).json({ error: 'Valid donation amount is required.' });
  try {
    let ngoName = '', resolvedNgoId = null, resolvedCampaignId = null;

    // Link to NGO campaign if provided
    if (ngoId && campaignId) {
      const ngo = await Ngo.findById(ngoId);
      if (ngo) {
        ngoName = ngo.name;
        resolvedNgoId = ngo._id;
        const camp = ngo.campaigns.id(campaignId);
        if (camp) {
          resolvedCampaignId = camp._id;
          camp.raised = (camp.raised || 0) + Number(amount);
          await ngo.save();
        }
      }
    }

    const donation = new Donation({
      amount, frequency, campaign, currency: currency || 'INR',
      campaignId: resolvedCampaignId, ngoId: resolvedNgoId, ngoName,
    });
    await donation.save();
    if (email) { try { await sendDonationReceipt(email, amount, campaign, frequency); } catch {} }
    res.json({ success: true, message: 'Donation recorded!', id: donation._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// ── NGO ROUTES ────────────────────────────────────────────────

// PUBLIC: Let anyone check if a Darpan ID is in the whitelist before filling the full form
app.get('/api/ngo/verify-id/:darpanId', async (req, res) => {
  const darpanId = req.params.darpanId.trim().toUpperCase();
  try {
    const entry = await ApprovedNgo.findOne({ darpanId });
    if (!entry)
      return res.status(404).json({
        valid: false,
        error: `No verified NGO found with ID "${darpanId}". Only NGOs pre-verified by Terra Nova can register. Contact us if you believe this is an error.`
      });
    res.json({ valid: true, ngoName: entry.ngoName });
  } catch {
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// Register — checks whitelist first, then saves as pending
app.post('/api/ngo/register', async (req, res) => {
  const { name, email, password, mission, location, category, phone, website, founded, registrationNumber } = req.body;

  // ── Basic field validation ────────────────────────────────
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Name, email and password are required.' });
  if (password.length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  if (!registrationNumber)
    return res.status(400).json({ error: 'NGO Darpan ID / Registration number is required.' });

  const regNoClean = registrationNumber.trim().toUpperCase();

  // ── Whitelist check — must be a pre-approved Darpan ID ───
  const approvedEntry = await ApprovedNgo.findOne({ darpanId: regNoClean });
  if (!approvedEntry) {
    return res.status(400).json({
      error: `"${regNoClean}" is not a recognised NGO Darpan ID. Only NGOs pre-verified by Terra Nova can register. Please contact us if you believe this is an error.`
    });
  }

  // ── Duplicate account check ───────────────────────────────
  const alreadyRegistered = await Ngo.findOne({ registrationNumber: regNoClean });
  if (alreadyRegistered) {
    return res.status(409).json({
      error: `An account for Darpan ID "${regNoClean}" already exists. If this is your NGO, please log in or contact support.`
    });
  }

  try {
    const ngo = new Ngo({
      name, email, password, mission, location, category, phone, website, founded,
      registrationNumber: regNoClean,
      verificationStatus: 'pending',
    });
    await ngo.save();
    console.log('✅ NGO registration submitted:', email, '| Darpan ID:', regNoClean);

    try { await sendNgoPendingEmail(email, name); } catch(e) { console.error('NGO pending email err:', e.message); }
    try { await sendAdminNgoAlert(ngo); }         catch(e) { console.error('Admin NGO alert err:', e.message); }

    res.json({
      success: true,
      message: 'Registration submitted! Your account is pending verification. You will receive an email once approved.',
      status: 'pending',
    });
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ error: 'An NGO with this email already exists.' });
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// Login — only verified NGOs can get a token
app.post('/api/ngo/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required.' });
  try {
    const ngo = await Ngo.findOne({ email: email.toLowerCase().trim() });
    if (!ngo) return res.status(401).json({ error: 'Invalid email or password.' });

    const match = await bcrypt.compare(password, ngo.password);
    if (!match) return res.status(401).json({ error: 'Invalid email or password.' });

    if (ngo.verificationStatus === 'pending') {
      return res.status(403).json({
        error: 'Your account is pending verification. Please wait for admin approval. You will be notified by email.',
        status: 'pending',
      });
    }
    if (ngo.verificationStatus === 'rejected') {
      return res.status(403).json({
        error: 'Your NGO registration was not approved. Please contact support for more information.',
        status: 'rejected',
      });
    }

    const token = jwt.sign({ ngoId: ngo._id, email: ngo.email, name: ngo.name }, JWT_SECRET, { expiresIn: '8h' });
    console.log('✅ NGO logged in:', email);
    res.json({ success: true, token, ngo: { id: ngo._id, name: ngo.name, email: ngo.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// Check registration status
app.post('/api/ngo/status', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });
  try {
    const ngo = await Ngo.findOne({ email: email.toLowerCase().trim() }).select('verificationStatus name rejectionReason');
    if (!ngo) return res.status(404).json({ error: 'No account found with this email.' });
    res.json({ success: true, status: ngo.verificationStatus, name: ngo.name, rejectionReason: ngo.rejectionReason });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// Profile — protected, verified only
app.get('/api/ngo/profile', ngoAuthMiddleware, async (req, res) => {
  try {
    res.json({ success: true, data: req.ngoDoc });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile.' });
  }
});

app.put('/api/ngo/profile', ngoAuthMiddleware, async (req, res) => {
  const { name, mission, location, category, phone, website, founded } = req.body;
  try {
    const ngo = await Ngo.findByIdAndUpdate(
      req.ngo.ngoId,
      { name, mission, location, category, phone, website, founded },
      { new: true, runValidators: true }
    );
    if (!ngo) return res.status(404).json({ error: 'NGO not found.' });
    console.log('✅ NGO profile updated:', ngo.email);
    res.json({ success: true, data: ngo });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// Campaigns — protected, verified only
app.post('/api/ngo/campaigns', ngoAuthMiddleware, async (req, res) => {
  const { title, description, category, goal, volunteers, daysLeft, urgency } = req.body;
  if (!title) return res.status(400).json({ error: 'Campaign title is required.' });
  try {
    const ngo = req.ngoDoc;
    ngo.campaigns.push({ title, description, category, goal: Number(goal) || 0, volunteers: Number(volunteers) || 0, daysLeft: Number(daysLeft) || 30, urgency });
    await ngo.save();
    const newCampaign = ngo.campaigns[ngo.campaigns.length - 1];
    res.json({ success: true, data: newCampaign });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add campaign.' });
  }
});

app.put('/api/ngo/campaigns/:campaignId', ngoAuthMiddleware, async (req, res) => {
  const { title, description, category, goal, raised, volunteers, daysLeft, urgency } = req.body;
  try {
    const ngo = req.ngoDoc;
    const campaign = ngo.campaigns.id(req.params.campaignId);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found.' });
    if (title !== undefined)       campaign.title       = title;
    if (description !== undefined) campaign.description = description;
    if (category !== undefined)    campaign.category    = category;
    if (goal !== undefined)        campaign.goal        = Number(goal);
    if (raised !== undefined)      campaign.raised      = Number(raised);
    if (volunteers !== undefined)  campaign.volunteers  = Number(volunteers);
    if (daysLeft !== undefined)    campaign.daysLeft    = Number(daysLeft);
    if (urgency !== undefined)     campaign.urgency     = urgency;
    await ngo.save();
    res.json({ success: true, data: campaign });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update campaign.' });
  }
});

app.delete('/api/ngo/campaigns/:campaignId', ngoAuthMiddleware, async (req, res) => {
  try {
    const ngo = req.ngoDoc;
    const campaign = ngo.campaigns.id(req.params.campaignId);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found.' });
    campaign.deleteOne();
    await ngo.save();
    res.json({ success: true, message: 'Campaign deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete campaign.' });
  }
});

// NGO: Upload campaign image
app.post('/api/ngo/campaigns/:campaignId/image', ngoAuthMiddleware, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image file provided.' });
  try {
    const ngo = req.ngoDoc;
    const campaign = ngo.campaigns.id(req.params.campaignId);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found.' });
    // Delete old image if exists
    if (campaign.imageUrl) {
      const oldPath = path.join(__dirname, campaign.imageUrl.replace('/uploads/', 'uploads/'));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    campaign.imageUrl = `/uploads/${req.file.filename}`;
    await ngo.save();
    res.json({ success: true, imageUrl: campaign.imageUrl });
  } catch (err) {
    res.status(500).json({ error: 'Failed to upload image.' });
  }
});

// NGO: Get all donations for this NGO's campaigns
app.get('/api/ngo/donations', ngoAuthMiddleware, async (req, res) => {
  try {
    const donations = await Donation.find({ ngoId: req.ngo.ngoId }).sort({ createdAt: -1 });
    res.json({ success: true, data: donations });
  } catch {
    res.status(500).json({ error: 'Failed to fetch donations.' });
  }
});

// NGO: Get donations for a specific campaign
app.get('/api/ngo/campaigns/:campaignId/donations', ngoAuthMiddleware, async (req, res) => {
  try {
    const donations = await Donation.find({ ngoId: req.ngo.ngoId, campaignId: req.params.campaignId }).sort({ createdAt: -1 });
    res.json({ success: true, data: donations });
  } catch {
    res.status(500).json({ error: 'Failed to fetch campaign donations.' });
  }
});

// ── VOLUNTEER ACCOUNT: Auth middleware ───────────────────────
const volAuthMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided.' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.volId) return res.status(401).json({ error: 'Not a volunteer token.' });
    const vol = await VolunteerAccount.findById(decoded.volId);
    if (!vol) return res.status(401).json({ error: 'Volunteer not found.' });
    req.vol = decoded; req.volDoc = vol; next();
  } catch { res.status(401).json({ error: 'Invalid or expired token.' }); }
};

// Register
app.post('/api/volunteer/register', async (req, res) => {
  const { name, email, password, phone, skills, location } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required.' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    const vol = new VolunteerAccount({ name, email, password, phone, skills, location, otp, otpExpiry, isVerified: false });
    await vol.save();
    await transporter.sendMail({
      from: `Terra Nova NGO <${process.env.SENDER_EMAIL}>`,
      to: email,
      subject: '🔐 Verify Your Email — Terra Nova Volunteers',
      html: `<div style="font-family:Georgia,serif;max-width:480px;margin:0 auto;background:#f7f3ec;border-radius:12px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#1a3a2e,#2d6a4f);padding:32px;text-align:center;">
          <div style="font-size:36px;margin-bottom:10px;">🔐</div>
          <h1 style="color:#fff;font-size:22px;margin:0;">Verify Your Email</h1>
        </div>
        <div style="padding:32px;text-align:center;">
          <p style="color:#4a5568;font-size:15px;margin-bottom:24px;">Hi <strong>${name}</strong>, use this OTP to verify your volunteer account:</p>
          <div style="background:#1a3a2e;color:#e8c57a;font-size:2.5rem;font-weight:700;letter-spacing:0.3em;padding:20px 32px;border-radius:10px;display:inline-block;font-family:monospace;">${otp}</div>
          <p style="color:#9ca3af;font-size:13px;margin-top:20px;">This OTP expires in <strong>10 minutes</strong>.</p>
          <p style="color:#9ca3af;font-size:12px;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px;">Terra Nova NGO · Automated notification</p>
        </div>
      </div>`
    });
    res.json({ success: true, message: 'OTP sent to your email. Please verify to complete registration.', requiresOtp: true });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'An account with this email already exists.' });
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// ── VOLUNTEER: Verify OTP ─────────────────────────────────────
app.post('/api/volunteer/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required.' });
  try {
    const vol = await VolunteerAccount.findOne({ email: email.toLowerCase().trim() });
    if (!vol) return res.status(404).json({ error: 'Account not found.' });
    if (vol.isVerified) return res.json({ success: true, message: 'Already verified.' });
    if (!vol.otp || vol.otp !== otp) return res.status(400).json({ error: 'Invalid OTP.' });
    if (new Date() > vol.otpExpiry) return res.status(400).json({ error: 'OTP has expired. Please register again.' });
    vol.isVerified = true; vol.otp = null; vol.otpExpiry = null;
    await vol.save();
    res.json({ success: true, message: 'Email verified! You can now log in.' });
  } catch { res.status(500).json({ error: 'Something went wrong.' }); }
});

// Login
app.post('/api/volunteer/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
  try {
    const vol = await VolunteerAccount.findOne({ email: email.toLowerCase().trim() });
    if (!vol) return res.status(401).json({ error: 'Invalid email or password.' });
    const match = await bcrypt.compare(password, vol.password);
    if (!match) return res.status(401).json({ error: 'Invalid email or password.' });
    if (!vol.isVerified) return res.status(403).json({ error: 'Please verify your email first. Check your inbox for the OTP.', requiresOtp: true, email: vol.email });
    const token = jwt.sign({ volId: vol._id, email: vol.email, name: vol.name }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ success: true, token, volunteer: { id: vol._id, name: vol.name, email: vol.email } });
  } catch { res.status(500).json({ error: 'Something went wrong.' }); }
});

// Profile
app.get('/api/volunteer/profile', volAuthMiddleware, async (req, res) => {
  try {
    const logs = await VolunteerLog.find({ volunteerEmail: req.vol.email }).sort({ date: -1 });
    const totalHours = logs.reduce((s, l) => s + l.hours, 0);
    res.json({ success: true, data: req.volDoc, logs, totalHours });
  } catch { res.status(500).json({ error: 'Failed to fetch profile.' }); }
});

// Update profile
app.put('/api/volunteer/profile', volAuthMiddleware, async (req, res) => {
  const { name, phone, skills, location } = req.body;
  try {
    const vol = await VolunteerAccount.findByIdAndUpdate(req.vol.volId, { name, phone, skills, location }, { new: true });
    res.json({ success: true, data: vol });
  } catch { res.status(500).json({ error: 'Failed to update profile.' }); }
});

// ── VOLUNTEER HOURS: Log hours ────────────────────────────────
app.post('/api/volunteer-hours', async (req, res) => {
  const { volunteerName, volunteerEmail, campaign, ngoName, hours, date, description } = req.body;
  if (!volunteerName || !volunteerEmail || !campaign || !hours || !date)
    return res.status(400).json({ error: 'Name, email, campaign, hours and date are required.' });
  if (hours < 0.5)
    return res.status(400).json({ error: 'Minimum 0.5 hours.' });
  try {
    const log = new VolunteerLog({ volunteerName, volunteerEmail, campaign, ngoName, hours, date: new Date(date), description });
    await log.save();
    res.json({ success: true, message: 'Hours logged successfully!', id: log._id });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// Get hours by email
app.get('/api/volunteer-hours/:email', async (req, res) => {
  try {
    const logs = await VolunteerLog.find({ volunteerEmail: req.params.email.toLowerCase() }).sort({ date: -1 });
    const totalHours = logs.reduce((s, l) => s + l.hours, 0);
    res.json({ success: true, data: logs, totalHours });
  } catch {
    res.status(500).json({ error: 'Failed to fetch logs.' });
  }
});

// Admin: get all volunteer hours
app.get('/api/admin/volunteer-hours', authMiddleware, async (req, res) => {
  try {
    const logs = await VolunteerLog.find().sort({ createdAt: -1 });
    res.json({ success: true, data: logs });
  } catch {
    res.status(500).json({ error: 'Failed to fetch logs.' });
  }
});

// ── PUBLIC: All campaigns from verified NGOs ──────────────────
app.get('/api/campaigns', async (req, res) => {
  try {
    const { category } = req.query;
    const ngos = await Ngo.find({ verificationStatus: 'verified' })
      .select('name campaigns');
    let campaigns = [];
    ngos.forEach(ngo => {
      (ngo.campaigns || []).forEach(c => {
        if (!category || category === 'all' || c.category === category) {
          campaigns.push({
            _id:         c._id,
            title:       c.title,
            description: c.description,
            category:    c.category,
            goal:        c.goal,
            raised:      c.raised,
            volunteers:  c.volunteers,
            daysLeft:    c.daysLeft,
            urgency:     c.urgency,
            ngoId:       ngo._id,
            ngoName:     ngo.name,
          });
        }
      });
    });
    // Sort by urgency — urgent first
    const urgencyOrder = { urgent: 0, almost: 1, 'needs-help': 2, active: 3 };
    campaigns.sort((a, b) => (urgencyOrder[a.urgency] ?? 4) - (urgencyOrder[b.urgency] ?? 4));
    res.json({ success: true, data: campaigns });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch campaigns.' });
  }
});

// ── PUBLIC: Donor Leaderboard ─────────────────────────────────
app.get('/api/leaderboard', async (req, res) => {
  try {
    const donations = await Donation.find({ status: 'completed' });
    // Aggregate by donor — group anonymous guests too
    const map = {};
    donations.forEach(d => {
      const key   = d.donorId ? d.donorId.toString() : 'guest_' + (d.donorEmail || 'anonymous');
      const label = d.donorName || 'Anonymous Donor';
      if (!map[key]) map[key] = { name: label, total: 0, count: 0, isGuest: !d.donorId };
      map[key].total += d.amount;
      map[key].count += 1;
    });
    const leaderboard = Object.values(map)
      .sort((a, b) => b.total - a.total)
      .slice(0, 20)
      .map((d, i) => ({ rank: i + 1, name: d.name, total: d.total, count: d.count }));
    res.json({ success: true, data: leaderboard });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leaderboard.' });
  }
});

// ── PUBLIC: NGO Directory ─────────────────────────────────────
app.get('/api/ngos', async (req, res) => {
  try {
    const { category, search } = req.query;
    const filter = { verificationStatus: 'verified' };
    if (category && category !== 'all') filter.category = category;
    if (search) filter.$or = [
      { name:     { $regex: search, $options: 'i' } },
      { mission:  { $regex: search, $options: 'i' } },
      { location: { $regex: search, $options: 'i' } },
    ];
    const ngos = await Ngo.find(filter)
      .select('name email mission location category phone website founded campaigns verifiedAt')
      .sort({ verifiedAt: -1 });
    res.json({ success: true, data: ngos });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch NGOs.' });
  }
});

// ── HEALTH CHECK ──────────────────────────────────────────────
app.get('/', (req, res) => res.json({ status: 'Terra Nova backend is running 🌿' }));

// ── PASSWORD RESET: Donor ─────────────────────────────────────

app.post('/api/donor/forgot-password', async (req, res) => {
  const { email, frontendUrl } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });
  try {
    const donor = await Donor.findOne({ email: email.toLowerCase().trim() });
    // Always return success to prevent email enumeration
    if (!donor) return res.json({ success: true, message: 'If this email exists, a reset link has been sent.' });

    const token  = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    donor.resetToken       = token;
    donor.resetTokenExpiry = expiry;
    await donor.save();

    const baseUrl = frontendUrl || process.env.FRONTEND_URL || 'http://127.0.0.1:3000';
    const resetUrl = `${baseUrl}/reset-password.html?token=${token}&type=donor`;
    await transporter.sendMail({
      from: `Terra Nova NGO <${process.env.SENDER_EMAIL}>`,
      to: email,
      subject: '🔑 Reset Your Password — Terra Nova',
      html: `
        <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#f7f3ec;border-radius:12px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#1a3a2e,#2d6a4f);padding:36px;text-align:center;">
            <div style="font-size:36px;margin-bottom:10px;">🔑</div>
            <h1 style="color:#fff;font-size:22px;margin:0;">Reset Your Password</h1>
          </div>
          <div style="padding:36px;">
            <p style="color:#4a5568;font-size:15px;line-height:1.8;">Hi <strong>${donor.name}</strong>,</p>
            <p style="color:#4a5568;font-size:15px;line-height:1.8;">We received a request to reset your donor account password. Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
            <div style="text-align:center;margin:28px 0;">
              <a href="${resetUrl}" style="background:#1a3a2e;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;">Reset Password →</a>
            </div>
            <p style="color:#9ca3af;font-size:13px;">If you didn't request this, ignore this email — your password won't change.</p>
            <p style="color:#9ca3af;font-size:12px;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px;">Terra Nova NGO · Automated notification</p>
          </div>
        </div>`
    });
    res.json({ success: true, message: 'If this email exists, a reset link has been sent.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

app.post('/api/donor/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and password are required.' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  try {
    const donor = await Donor.findOne({ resetToken: token, resetTokenExpiry: { $gt: new Date() } });
    if (!donor) return res.status(400).json({ error: 'Reset link is invalid or has expired.' });
    donor.password         = password;
    donor.resetToken       = null;
    donor.resetTokenExpiry = null;
    await donor.save();
    res.json({ success: true, message: 'Password reset successfully! You can now log in.' });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// ── PASSWORD RESET: NGO ───────────────────────────────────────

app.post('/api/ngo/forgot-password', async (req, res) => {
  const { email, frontendUrl } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });
  try {
    const ngo = await Ngo.findOne({ email: email.toLowerCase().trim() });
    if (!ngo) return res.json({ success: true, message: 'If this email exists, a reset link has been sent.' });

    const token  = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000);
    ngo.resetToken       = token;
    ngo.resetTokenExpiry = expiry;
    await ngo.save();

    const baseUrl = frontendUrl || process.env.FRONTEND_URL || 'http://127.0.0.1:3000';
    const resetUrl = `${baseUrl}/reset-password.html?token=${token}&type=ngo`;
    await transporter.sendMail({
      from: `Terra Nova NGO <${process.env.SENDER_EMAIL}>`,
      to: email,
      subject: '🔑 Reset Your NGO Password — Terra Nova',
      html: `
        <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#f7f3ec;border-radius:12px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#1a3a2e,#2d6a4f);padding:36px;text-align:center;">
            <div style="font-size:36px;margin-bottom:10px;">🔑</div>
            <h1 style="color:#fff;font-size:22px;margin:0;">Reset Your NGO Password</h1>
          </div>
          <div style="padding:36px;">
            <p style="color:#4a5568;font-size:15px;line-height:1.8;">Hi <strong>${ngo.name}</strong>,</p>
            <p style="color:#4a5568;font-size:15px;line-height:1.8;">Click the button below to reset your NGO account password. This link expires in <strong>1 hour</strong>.</p>
            <div style="text-align:center;margin:28px 0;">
              <a href="${resetUrl}" style="background:#1a3a2e;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;">Reset Password →</a>
            </div>
            <p style="color:#9ca3af;font-size:13px;">If you didn't request this, ignore this email.</p>
            <p style="color:#9ca3af;font-size:12px;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px;">Terra Nova NGO Portal · Automated notification</p>
          </div>
        </div>`
    });
    res.json({ success: true, message: 'If this email exists, a reset link has been sent.' });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

app.post('/api/ngo/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and password are required.' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  try {
    const ngo = await Ngo.findOne({ resetToken: token, resetTokenExpiry: { $gt: new Date() } });
    if (!ngo) return res.status(400).json({ error: 'Reset link is invalid or has expired.' });
    ngo.password         = password;
    ngo.resetToken       = null;
    ngo.resetTokenExpiry = null;
    await ngo.save();
    res.json({ success: true, message: 'Password reset successfully! You can now log in.' });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// ── PASSWORD RESET: Volunteer ─────────────────────────────────
app.post('/api/volunteer/forgot-password', async (req, res) => {
  const { email, frontendUrl } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });
  try {
    const vol = await VolunteerAccount.findOne({ email: email.toLowerCase().trim() });
    if (!vol) return res.json({ success: true, message: 'If this email exists, a reset link has been sent.' });
    const token  = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000);
    vol.resetToken = token; vol.resetTokenExpiry = expiry;
    await vol.save();
    const baseUrl = frontendUrl || process.env.FRONTEND_URL || 'http://127.0.0.1:3000';
    const resetUrl = `${baseUrl}/reset-password.html?token=${token}&type=volunteer`;
    await transporter.sendMail({
      from: `Terra Nova NGO <${process.env.SENDER_EMAIL}>`,
      to: email,
      subject: '🔑 Reset Your Volunteer Password — Terra Nova',
      html: `<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#f7f3ec;border-radius:12px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#1a3a2e,#2d6a4f);padding:36px;text-align:center;">
          <div style="font-size:36px;margin-bottom:10px;">🔑</div>
          <h1 style="color:#fff;font-size:22px;margin:0;">Reset Your Password</h1>
        </div>
        <div style="padding:36px;">
          <p style="color:#4a5568;font-size:15px;line-height:1.8;">Hi <strong>${vol.name}</strong>, click below to reset your volunteer account password. This link expires in <strong>1 hour</strong>.</p>
          <div style="text-align:center;margin:28px 0;">
            <a href="${resetUrl}" style="background:#1a3a2e;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;">Reset Password →</a>
          </div>
          <p style="color:#9ca3af;font-size:13px;">If you didn't request this, ignore this email.</p>
          <p style="color:#9ca3af;font-size:12px;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px;">Terra Nova NGO Portal · Automated notification</p>
        </div>
      </div>`
    });
    res.json({ success: true, message: 'If this email exists, a reset link has been sent.' });
  } catch (err) { res.status(500).json({ error: 'Something went wrong.' }); }
});

app.post('/api/volunteer/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and password are required.' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  try {
    const vol = await VolunteerAccount.findOne({ resetToken: token, resetTokenExpiry: { $gt: new Date() } });
    if (!vol) return res.status(400).json({ error: 'Reset link is invalid or has expired.' });
    vol.password = password; vol.resetToken = null; vol.resetTokenExpiry = null;
    await vol.save();
    res.json({ success: true, message: 'Password reset successfully! You can now log in.' });
  } catch { res.status(500).json({ error: 'Something went wrong.' }); }
});

// ── RAZORPAY SETUP ────────────────────────────────────────────
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ── RAZORPAY: Create Order ────────────────────────────────────
// Called before showing the Razorpay payment popup
app.post('/api/payment/create-order', async (req, res) => {
  const { amount, currency = 'INR', campaign, frequency } = req.body;
  if (!amount || amount <= 0)
    return res.status(400).json({ error: 'Valid amount is required.' });
  try {
    const order = await razorpay.orders.create({
      amount:   Math.round(amount * 100), // Razorpay expects paise
      currency,
      receipt:  'TN' + Date.now().toString().slice(-8),
      notes:    { campaign: campaign || 'General', frequency: frequency || 'once' },
    });
    res.json({ success: true, order, key: process.env.RAZORPAY_KEY_ID });
  } catch (err) {
    console.error('Razorpay order error:', err.message);
    res.status(500).json({ error: 'Failed to create payment order.' });
  }
});

// ── RAZORPAY: Verify Payment ──────────────────────────────────
// Called after Razorpay popup closes with success
app.post('/api/payment/verify', async (req, res) => {
  const {
    razorpay_order_id, razorpay_payment_id, razorpay_signature,
    amount, campaign, frequency, currency, donorToken, ngoId, campaignId
  } = req.body;

  // Verify signature
  const body      = razorpay_order_id + '|' + razorpay_payment_id;
  const expected  = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (expected !== razorpay_signature)
    return res.status(400).json({ error: 'Payment verification failed. Invalid signature.' });

  // Signature valid — save donation
  try {
    let donorId = null, donorName = '', donorEmail = '';

    // If donor is logged in, link donation to their account
    if (donorToken) {
      try {
        const decoded = require('jsonwebtoken').verify(donorToken, JWT_SECRET);
        if (decoded.donorId) {
          const donor = await Donor.findById(decoded.donorId);
          if (donor) {
            donorId    = donor._id;
            donorName  = donor.name;
            donorEmail = donor.email;
          }
        }
      } catch {}
    }

    const donation = new Donation({
      amount, frequency, campaign, currency: currency || 'INR',
      status: 'completed',
      donorId, donorName, donorEmail,
      ngoId: ngoId || null, campaignId: campaignId || null,
      razorpayOrderId:   razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
    });
    await donation.save();

    // Update NGO campaign raised amount
    if (ngoId && campaignId) {
      try {
        const ngo = await Ngo.findById(ngoId);
        if (ngo) {
          const camp = ngo.campaigns.id(campaignId);
          if (camp) { camp.raised = (camp.raised||0) + Number(amount); await ngo.save(); }
        }
      } catch {}
    }

    // Link to donor account
    if (donorId) {
      await Donor.findByIdAndUpdate(donorId, { $push: { donations: donation._id } });
      try { await sendDonationReceipt(donorEmail, amount, campaign, frequency, donorName); } catch {}
    }

    console.log(`✅ Payment verified: ₹${amount} | ${campaign} | ${razorpay_payment_id}`);
    res.json({ success: true, message: 'Payment verified and donation recorded!', id: donation._id });
  } catch (err) {
    console.error('Verify save error:', err.message);
    res.status(500).json({ error: 'Payment verified but failed to save donation.' });
  }
});

// ── DONOR AUTH MIDDLEWARE ─────────────────────────────────────
const donorAuthMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided.' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.donorId) return res.status(401).json({ error: 'Not a donor token.' });
    const donor = await Donor.findById(decoded.donorId);
    if (!donor) return res.status(401).json({ error: 'Donor not found.' });
    req.donor    = decoded;
    req.donorDoc = donor;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

// ── DONOR: Register ───────────────────────────────────────────
app.post('/api/donor/register', async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Name, email and password are required.' });
  if (password.length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    const donor = new Donor({ name, email, password, phone, otp, otpExpiry, isVerified: false });
    await donor.save();
    await transporter.sendMail({
      from: `Terra Nova NGO <${process.env.SENDER_EMAIL}>`,
      to: email,
      subject: '🔐 Verify Your Email — Terra Nova',
      html: `<div style="font-family:Georgia,serif;max-width:480px;margin:0 auto;background:#f7f3ec;border-radius:12px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#1a3a2e,#2d6a4f);padding:32px;text-align:center;">
          <div style="font-size:36px;margin-bottom:10px;">🔐</div>
          <h1 style="color:#fff;font-size:22px;margin:0;">Verify Your Email</h1>
        </div>
        <div style="padding:32px;text-align:center;">
          <p style="color:#4a5568;font-size:15px;margin-bottom:24px;">Hi <strong>${name}</strong>, use this OTP to verify your donor account:</p>
          <div style="background:#1a3a2e;color:#e8c57a;font-size:2.5rem;font-weight:700;letter-spacing:0.3em;padding:20px 32px;border-radius:10px;display:inline-block;font-family:monospace;">${otp}</div>
          <p style="color:#9ca3af;font-size:13px;margin-top:20px;">This OTP expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
          <p style="color:#9ca3af;font-size:12px;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px;">Terra Nova NGO · Automated notification</p>
        </div>
      </div>`
    });
    res.json({ success: true, message: 'OTP sent to your email. Please verify to complete registration.', requiresOtp: true });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'An account with this email already exists.' });
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// ── DONOR: Verify OTP ─────────────────────────────────────────
app.post('/api/donor/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required.' });
  try {
    const donor = await Donor.findOne({ email: email.toLowerCase().trim() });
    if (!donor) return res.status(404).json({ error: 'Account not found.' });
    if (donor.isVerified) return res.json({ success: true, message: 'Already verified.' });
    if (!donor.otp || donor.otp !== otp) return res.status(400).json({ error: 'Invalid OTP.' });
    if (new Date() > donor.otpExpiry) return res.status(400).json({ error: 'OTP has expired. Please register again.' });
    donor.isVerified = true; donor.otp = null; donor.otpExpiry = null;
    await donor.save();
    res.json({ success: true, message: 'Email verified! You can now log in.' });
  } catch { res.status(500).json({ error: 'Something went wrong.' }); }
});

// ── DONOR: Login ──────────────────────────────────────────────
app.post('/api/donor/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
  try {
    const donor = await Donor.findOne({ email: email.toLowerCase().trim() });
    if (!donor) return res.status(401).json({ error: 'Invalid email or password.' });
    const match = await bcrypt.compare(password, donor.password);
    if (!match) return res.status(401).json({ error: 'Invalid email or password.' });
    if (!donor.isVerified) return res.status(403).json({ error: 'Please verify your email first. Check your inbox for the OTP.', requiresOtp: true, email: donor.email });
    const token = jwt.sign({ donorId: donor._id, email: donor.email, name: donor.name }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ success: true, token, donor: { id: donor._id, name: donor.name, email: donor.email } });
  } catch {
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// ── DONOR: Profile + donation history ────────────────────────
app.get('/api/donor/profile', donorAuthMiddleware, async (req, res) => {
  try {
    const donations = await Donation.find({ donorId: req.donor.donorId }).sort({ createdAt: -1 });
    res.json({ success: true, data: req.donorDoc, donations });
  } catch {
    res.status(500).json({ error: 'Failed to fetch profile.' });
  }
});

// ── DONOR: Update profile ─────────────────────────────────────
app.put('/api/donor/profile', donorAuthMiddleware, async (req, res) => {
  const { name, phone } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required.' });
  try {
    const donor = await Donor.findByIdAndUpdate(req.donor.donorId, { name, phone }, { new: true });
    res.json({ success: true, data: donor });
  } catch {
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// ── DONOR: Wishlist add ───────────────────────────────────────
app.post('/api/donor/wishlist', donorAuthMiddleware, async (req, res) => {
  const { campaign } = req.body;
  if (!campaign) return res.status(400).json({ error: 'Campaign name required.' });
  try {
    const donor = req.donorDoc;
    if (!donor.wishlist.includes(campaign)) { donor.wishlist.push(campaign); await donor.save(); }
    res.json({ success: true, wishlist: donor.wishlist });
  } catch {
    res.status(500).json({ error: 'Failed to update wishlist.' });
  }
});

// ── DONOR: Wishlist remove ────────────────────────────────────
app.delete('/api/donor/wishlist', donorAuthMiddleware, async (req, res) => {
  const { campaign } = req.body;
  try {
    const donor = req.donorDoc;
    donor.wishlist = donor.wishlist.filter(c => c !== campaign);
    await donor.save();
    res.json({ success: true, wishlist: donor.wishlist });
  } catch {
    res.status(500).json({ error: 'Failed to update wishlist.' });
  }
});

// ── DONOR: Donate (authenticated) ────────────────────────────
app.post('/api/donor/donate', donorAuthMiddleware, async (req, res) => {
  const { amount, frequency, campaign, currency, campaignId, ngoId } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Valid donation amount is required.' });
  try {
    const donor = req.donorDoc;
    let ngoName = '', resolvedNgoId = null, resolvedCampaignId = null;

    // Link to NGO campaign and update raised amount
    if (ngoId && campaignId) {
      const ngo = await Ngo.findById(ngoId);
      if (ngo) {
        ngoName = ngo.name;
        resolvedNgoId = ngo._id;
        const camp = ngo.campaigns.id(campaignId);
        if (camp) {
          resolvedCampaignId = camp._id;
          camp.raised = (camp.raised || 0) + Number(amount);
          await ngo.save();
        }
      }
    }

    const donation = new Donation({
      amount, frequency, campaign, currency: currency || 'INR',
      donorId: donor._id, donorName: donor.name, donorEmail: donor.email,
      campaignId: resolvedCampaignId, ngoId: resolvedNgoId, ngoName,
      status: 'completed',
    });
    await donation.save();
    donor.donations.push(donation._id);
    await donor.save();
    try { await sendDonationReceipt(donor.email, amount, campaign, frequency, donor.name); } catch {}
    res.json({ success: true, message: 'Donation recorded!', id: donation._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));