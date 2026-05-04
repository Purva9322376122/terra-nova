const mongoose = require('mongoose');

const volunteerLogSchema = new mongoose.Schema({
  volunteerName:  { type: String, required: true },
  volunteerEmail: { type: String, required: true },
  campaign:       { type: String, required: true },
  ngoName:        { type: String, default: '' },
  hours:          { type: Number, required: true, min: 0.5 },
  date:           { type: Date,   required: true },
  description:    { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('VolunteerLog', volunteerLogSchema);
