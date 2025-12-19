import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Please define the MONGODB_URI environment variable inside .env');
  process.exit(1);
}

const seedAdmin = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminName = process.env.ADMIN_NAME || 'Admin Officer';

    if (!adminUsername || !adminPassword) {
      console.error('Please define ADMIN_USERNAME and ADMIN_PASSWORD in .env');
      process.exit(1);
    }

    // Check if admin already exists
    const existingAdmin = await User.findOne({ username: adminUsername });

    if (existingAdmin) {
      console.log('Admin user already exists.');
    } else {
      // Hash password
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      const newAdmin = new User({
        username: adminUsername,
        password: hashedPassword,
        name: adminName,
        role: 'admin',
      });

      await newAdmin.save();
      console.log(`Admin user created successfully.`);
      console.log(`Username: ${adminUsername}`);
      console.log(`Password: ${adminPassword}`);
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();
