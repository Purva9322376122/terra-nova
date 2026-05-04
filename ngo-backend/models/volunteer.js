const mongoose = require('mongoose');

const volunteerSchema = new mongoose.Schema({
  firstName:    { type: String, required: true },
  lastName:     { type: String, required: true },
  email:        { type: String, required: true, unique: true },
  phone:        { type: String },
  skills:       { type: String },
  availability: { type: String },
  message:      { type: String },
}, { timestamps: true }); // auto-adds createdAt and updatedAt

module.exports = mongoose.model('Volunteer', volunteerSchema);