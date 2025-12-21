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

const seedStaff = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const staffUsername = process.env.STAFF_USERNAME;
    const staffPassword = process.env.STAFF_PASSWORD;
    const staffName = process.env.STAFF_NAME || 'Staff Officer';

    if (!staffUsername || !staffPassword) {
      console.error('Please define STAFF_USERNAME and STAFF_PASSWORD in .env');
      process.exit(1);
    }

    // Check if staff already exists
    const existingStaff = await User.findOne({ username: staffUsername });

    if (existingStaff) {
      console.log('Staff user already exists.');
    } else {
      // Hash password
      const hashedPassword = await bcrypt.hash(staffPassword, 10);

      const newStaff = new User({
        username: staffUsername,
        password: hashedPassword,
        name: staffName,
        role: 'staff',
      });

      await newStaff.save();
      console.log(`Staff user created successfully.`);
      console.log(`Username: ${staffUsername}`);
      console.log(`Password: ${staffPassword}`);
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding staff:', error);
    process.exit(1);
  }
};

seedStaff();
