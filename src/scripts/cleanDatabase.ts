import mongoose from 'mongoose';
import Shelter from '../models/Shelter';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Please define the MONGODB_URI environment variable inside .env');
  process.exit(1);
}

// Same logic as API
const sanitizePhone = (phone: string): string | null => {
  const clean = phone.replace(/\D/g, ''); // Remove non-digits
  
  if (clean.length >= 9 && clean.length <= 10 && !/^0+$/.test(clean)) {
    return clean;
  }
  return null;
};

const cleanDatabase = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const shelters = await Shelter.find({ 
      phoneNumbers: { $exists: true, $not: { $size: 0 } } 
    });

    console.log(`Found ${shelters.length} shelters with phone numbers.`);
    let modifiedCount = 0;

    for (const shelter of shelters) {
      let isChanged = false;
      const newPhones: string[] = [];

      for (const phone of shelter.phoneNumbers) {
        const clean = sanitizePhone(phone);
        if (clean) {
          // Check if the cleaned version is different or if we are filtering out others
          if (clean !== phone) isChanged = true; 
          newPhones.push(clean);
        } else {
          // If null, it means it was invalid (removed), so change occurred
          isChanged = true;
        }
      }

      if (isChanged) {
        shelter.phoneNumbers = newPhones;
        await shelter.save();
        modifiedCount++;
        if (modifiedCount % 100 === 0) console.log(`Processed ${modifiedCount} updates...`);
      }
    }

    console.log('--- Cleanup Complete ---');
    console.log(`Updated ${modifiedCount} documents.`);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error cleaning database:', error);
    process.exit(1);
  }
};

cleanDatabase();
