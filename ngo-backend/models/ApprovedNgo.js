const mongoose = require('mongoose');

const approvedNgoSchema = new mongoose.Schema({
  darpanId: { type: String, required: true, unique: true, uppercase: true, trim: true },
  ngoName:  { type: String, required: true, trim: true },
  addedBy:  { type: String, default: 'admin' },
}, { timestamps: true });

module.exports = mongoose.model('ApprovedNgo', approvedNgoSchema);