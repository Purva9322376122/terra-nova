const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const donorSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  phone:    { type: String, default: '' },
  wishlist: [{ type: String }],
  donations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Donation' }],
  resetToken:       { type: String, default: null },
  resetTokenExpiry: { type: Date,   default: null },
  isVerified:       { type: Boolean, default: false },
  otp:              { type: String,  default: null },
  otpExpiry:        { type: Date,    default: null },
}, { timestamps: true });

donorSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

donorSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.resetToken;
  return obj;
};

module.exports = mongoose.model('Donor', donorSchema);
