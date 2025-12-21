import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;
import dotenv from 'dotenv';

// Load env vars
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is missing in .env');
  process.exit(1);
}

// ---- DEFINE SCHEMAS LOCALLY TO AVOID IMPORT ISSUES ----

const DailyOccupancySchema = new Schema({
  date: { type: String, required: true },
  checkIn: { type: Number, default: 0 },
  checkOut: { type: Number, default: 0 }
});

const ShelterSchema = new Schema({
  name: { type: String, required: true },
  district: { type: String, required: true },
  subdistrict: { type: String },
  capacity: { type: Number, default: 0 },
  currentOccupancy: { type: Number, default: 0 }, 
  phoneNumbers: [String],
  capacityStatus: { type: String },
  dailyLogs: [DailyOccupancySchema],
  updatedAt: { type: Date, default: Date.now }
});

// Use existing model if available to prevent overwrite error, but since this is standalone script, it's fine.
// We need to match the collection name 'shelters' (lowercase plural is default)
const Shelter = models.Shelter || model('Shelter', ShelterSchema);

// -------------------------------------------------------

async function seedDailyLogs() {
  console.log('🔄 Connecting to Database...');
  try {
     await mongoose.connect(MONGODB_URI as string);
     console.log('✅ Connected.');
  } catch (err) {
     console.error('❌ DB Connection Failed:', err);
     process.exit(1);
  }

  try {
    const shelters = await Shelter.find({});
    console.log(`📊 Found ${shelters.length} shelters. Starting data simulation...`);

    let totalUpdated = 0;

    for (const shelter of shelters) {
      if (!shelter.capacity) continue; // Skip shelters with no capacity/undefined

      const dailyLogs = [];
      // เริ่มต้นที่ประมาณ 0-15% ของความจุ
      let currentOccupancy = Math.floor(Math.random() * (shelter.capacity * 0.15));
      
      const daysHistory = 30;
      
      for (let i = daysHistory; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        // ใช้ Local Time (en-CA จะได้ format YYYY-MM-DD) เพื่อให้ตรงกับ Frontend
        const dateStr = date.toLocaleDateString('en-CA');

        const isBigShelter = shelter.capacity > 500;
        const activityLevel = isBigShelter ? 15 : 3;

        // Random In
        let checkIn = 0;
        // Event spike random
        if (Math.random() > 0.85) {
          checkIn = Math.floor(Math.random() * activityLevel * 4); 
        } else {
          checkIn = Math.floor(Math.random() * activityLevel);
        }

        // Random Out
        const maxOut = currentOccupancy + checkIn;
        let checkOut = 0;
        
        if (i > 15) {
             checkOut = Math.floor(Math.random() * (maxOut * 0.2)); 
        } else {
             checkOut = Math.floor(Math.random() * (maxOut * 0.5)); 
        }

        currentOccupancy = currentOccupancy + checkIn - checkOut;
        if (currentOccupancy < 0) currentOccupancy = 0;
        
        // Cap at 120% capacity roughly
        if (currentOccupancy > shelter.capacity * 1.2) {
             currentOccupancy = Math.floor(shelter.capacity * 1.2);
        }

        dailyLogs.push({
          date: dateStr,
          checkIn,
          checkOut
        });
      }

      // Update Fields
      shelter.dailyLogs = dailyLogs;
      shelter.currentOccupancy = currentOccupancy;
      
      const occupancyRate = (currentOccupancy / shelter.capacity) * 100;
      if (occupancyRate >= 100) {
        shelter.capacityStatus = 'ล้นศูนย์';
      } else if (occupancyRate >= 80) {
        shelter.capacityStatus = 'ใกล้เต็ม';
      } else {
        shelter.capacityStatus = 'รองรับได้';
      }

      await shelter.save();
      totalUpdated++;
      
       if (totalUpdated % 50 === 0) {
        console.log(`⏳ Processed ${totalUpdated}/${shelters.length}...`);
      }
    }

    console.log(`🎉 Success! Updated ${totalUpdated} shelters.`);

  } catch (error) {
    console.error('❌ Error seeding logs:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected.');
    process.exit();
  }
}

seedDailyLogs();
