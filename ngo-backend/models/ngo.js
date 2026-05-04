const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const campaignSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  category:    { type: String, default: 'environment' },
  goal:        { type: Number, default: 0 },
  raised:      { type: Number, default: 0 },
  volunteers:  { type: Number, default: 0 },
  daysLeft:    { type: Number, default: 30 },
  urgency:     { type: String, default: 'active' },
  imageUrl:    { type: String, default: '' },
}, { timestamps: true });

const ngoSchema = new mongoose.Schema({
  name:             { type: String, required: true },
  email:            { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:         { type: String, required: true },
  mission:          { type: String, default: '' },
  website:          { type: String, default: '' },
  phone:            { type: String, default: '' },
  location:         { type: String, default: '' },
  founded:          { type: String, default: '' },
  category:         { type: String, default: 'environment' },

  // ── VERIFICATION FIELDS ──────────────────────────────────
  // 'pending'  → submitted, waiting for admin approval
  // 'verified' → approved by admin, can login & use dashboard
  // 'rejected' → denied by admin
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending',
  },
  verifiedAt:       { type: Date, default: null },
  rejectionReason:  { type: String, default: '' },

  // Registration number (e.g. 80G / 12A / FCRA / Niti Aayog Darpan ID)
  registrationNumber: { type: String, default: '' },

  // Supporting document filename (stored path or cloud URL)
  documentUrl:      { type: String, default: '' },

  resetToken:       { type: String, default: null },
  resetTokenExpiry: { type: Date,   default: null },

  campaigns: [campaignSchema],
}, { timestamps: true });

// Hash password before save
ngoSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Never return password in JSON
ngoSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('Ngo', ngoSchema);