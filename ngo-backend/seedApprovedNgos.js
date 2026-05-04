require('dotenv').config();
const mongoose = require('mongoose');
const ApprovedNgo = require('./models/ApprovedNgo');

const testNgos = [
  { darpanId: 'MH/2019/0234784', ngoName: 'Green Earth Foundation' },
  { darpanId: 'DL/2020/0187432', ngoName: 'Clean Water Initiative' },
  { darpanId: 'KA/2018/0098321', ngoName: 'Rural Education Trust' },
];

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    await ApprovedNgo.insertMany(testNgos);
    console.log('✅ Approved NGOs added successfully!');
    console.log(testNgos);
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    mongoose.disconnect();
  });


