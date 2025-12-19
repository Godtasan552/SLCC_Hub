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

const analyzePhones = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const shelters = await Shelter.find({ 
      phoneNumbers: { $exists: true, $not: { $size: 0 } } 
    }).select('name phoneNumbers');

    console.log(`Analyzing ${shelters.length} shelters with phone numbers...`);

    let shortPhones = 0;
    let longPhones = 0;
    let normalPhones = 0;
    const examples: { short: string[], long: string[], normal: string[] } = { short: [], long: [], normal: [] };

    for (const shelter of shelters) {
        for (const phone of shelter.phoneNumbers) {
            // Remove non-digit characters for counting length
            const cleanPhone = phone.replace(/\D/g, '');
            if (cleanPhone.length > 0) { // Should check length of clean phone, but context implies stored as strings potentially with dashes
                if (cleanPhone.length < 9) {
                    shortPhones++;
                    if (examples.short.length < 5) examples.short.push(`${phone} (${shelter.name})`);
                } else if (cleanPhone.length > 10) {
                    longPhones++;
                    if (examples.long.length < 5) examples.long.push(`${phone} (${shelter.name})`);
                } else {
                    normalPhones++;
                     if (examples.normal.length < 2) examples.normal.push(`${phone} (${shelter.name})`);
                }
            }
        }
    }

    console.log('--- Analysis Result ---');
    console.log(`Total Valid Phone Entries Processed: ${shortPhones + longPhones + normalPhones}`);
    console.log(`Short (< 9 digits): ${shortPhones}`);
    console.log('Examples:', examples.short);
    console.log(`Long (> 10 digits): ${longPhones}`);
    console.log('Examples:', examples.long);
    console.log(`Normal (9-10 digits): ${normalPhones}`);
    console.log('Examples:', examples.normal);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error analyzing phones:', error);
    process.exit(1);
  }
};

analyzePhones();
