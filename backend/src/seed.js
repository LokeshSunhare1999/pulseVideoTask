/**
 * Seed script - creates demo users for testing
 * Run: node src/seed.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const demoUsers = [
  { username: 'admin',  email: 'admin@demo.com',  password: 'admin123',  role: 'admin',  organization: 'demo-org' },
  { username: 'editor', email: 'editor@demo.com', password: 'editor123', role: 'editor', organization: 'demo-org' },
  { username: 'viewer', email: 'viewer@demo.com', password: 'viewer123', role: 'viewer', organization: 'demo-org' },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  for (const userData of demoUsers) {
    const existing = await User.findOne({ email: userData.email });
    if (existing) {
      console.log(`User ${userData.email} already exists, skipping`);
      continue;
    }
    await User.create(userData);
    console.log(`Created user: ${userData.email} (${userData.role})`);
  }

  console.log('Seeding complete');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
