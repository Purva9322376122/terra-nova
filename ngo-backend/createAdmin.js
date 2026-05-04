require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./models/admin');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const existing = await Admin.findOne({ username: 'admin' });
  if (existing) {
    console.log('Admin already exists!');
  } else {
    const admin = new Admin({ username: 'admin', password: 'terranova123' });
    await admin.save();
    console.log('✅ Admin created!');
  }
  process.exit();
}).catch(err => { console.error(err); process.exit(); });
