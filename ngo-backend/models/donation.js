const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
  amount:            { type: Number, required: true },
  currency:          { type: String, default: 'INR' },
  frequency:         { type: String, default: 'once' },
  campaign:          { type: String, default: 'General' },
  campaignId:        { type: mongoose.Schema.Types.ObjectId, default: null },
  ngoId:             { type: mongoose.Schema.Types.ObjectId, ref: 'Ngo', default: null },
  ngoName:           { type: String, default: '' },
  status:            { type: String, default: 'completed' },
  donorId:           { type: mongoose.Schema.Types.ObjectId, ref: 'Donor', default: null },
  donorName:         { type: String, default: '' },
  donorEmail:        { type: String, default: '' },
  razorpayOrderId:   { type: String, default: '' },
  razorpayPaymentId: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Donation', donationSchema);
