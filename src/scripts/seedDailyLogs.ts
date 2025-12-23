import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is missing in .env');
  process.exit(1);
}

// ---- Local Schema Definitions to avoid Next.js import errors in standalone script ----

const DailyOccupancySchema = new Schema({
  date: { type: String, required: true }, // Format "YYYY-MM-DD"
  checkIn: { type: Number, default: 0 },
  checkOut: { type: Number, default: 0 }
});

const ShelterSchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['Hub', 'Shelter'], default: 'Shelter' },
  district: { type: String, required: true },
  subdistrict: { type: String },
  capacity: { type: Number, default: 0 },
  currentOccupancy: { type: Number, default: 0 },
  capacityStatus: { type: String },
  dailyLogs: [DailyOccupancySchema],
  updatedAt: { type: Date, default: Date.now }
});

const Shelter = models.Shelter || model('Shelter', ShelterSchema);

// -------------------------------------------------------

async function seedData() {
  console.log('🌱 [Seed] Starting Population Simulation...');
  
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI as string);
    console.log('✅ Connected.');

    // Fetch all records from the shelters collection
    console.log('🔎 Searching for records in "Shelter" model...');
    const allCenters = await Shelter.find({});
    console.log(`🔍 Total records in 'shelters' collection: ${allCenters.length}`);

    const shelters = allCenters.filter(c => !c.type || c.type === 'Shelter');
    console.log(`📊 Found ${shelters.length} active Shelters to process. Starting simulation...`);

    if (shelters.length === 0) {
      console.log('⚠️ No shelters found to update. Check your database collection name or content.');
      return;
    }

    let totalUpdated = 0;

    for (const shelter of shelters) {
      // Default capacity if not set to prevent math errors
      const capacity = shelter.capacity || 100;
      
      const dailyLogs = [];
      // Start with a small random number of people (5-15% of capacity)
      let runningOccupancy = Math.floor(Math.random() * (capacity * 0.1)) + Math.floor(capacity * 0.05);
      
      const daysHistory = 30; // 30 days of data
      
      for (let i = daysHistory; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString('en-CA'); // YYYY-MM-DD format

        // Simulation parameters
        const isBigShelter = capacity > 300;
        const activityScale = isBigShelter ? 15 : 5;

        // 1. Check In: Random influx
        let checkIn = 0;
        const rand = Math.random();
        if (rand > 0.8) { // Busy day (event/rain)
          checkIn = Math.floor(Math.random() * activityScale * 3);
        } else {
          checkIn = Math.floor(Math.random() * activityScale);
        }

        // 2. Check Out: People leaving
        let checkOut = 0;
        const canLeave = runningOccupancy + checkIn;
        
        // As we get closer to today (i=0), simulation might have more checkouts (recovery phase)
        if (i < 7) {
          checkOut = Math.floor(Math.random() * (canLeave * 0.3));
        } else {
          checkOut = Math.floor(Math.random() * (canLeave * 0.1));
        }

        runningOccupancy = runningOccupancy + checkIn - checkOut;
        
        // Constraints
        if (runningOccupancy < 0) runningOccupancy = 0;
        
        // Peak capacity simulation (can go up to 120% in emergencies)
        if (runningOccupancy > capacity * 1.2) {
          runningOccupancy = Math.floor(capacity * 1.2);
        }

        dailyLogs.push({
          date: dateStr,
          checkIn,
          checkOut
        });
      }

      // Final update to the shelter document
      shelter.dailyLogs = dailyLogs;
      shelter.currentOccupancy = runningOccupancy;
      
      // Update Status String
      const occupancyRate = (runningOccupancy / capacity) * 100;
      if (occupancyRate >= 100) {
        shelter.capacityStatus = 'ล้นศูนย์';
      } else if (occupancyRate >= 80) {
        shelter.capacityStatus = 'ใกล้เต็ม';
      } else {
        shelter.capacityStatus = 'รองรับได้';
      }

      shelter.updatedAt = new Date();
      await shelter.save();
      totalUpdated++;
      
      if (totalUpdated % 10 === 0) {
        console.log(`⏳ Progress: ${totalUpdated}/${shelters.length} centers updated...`);
      }
    }

    console.log(`\n✨ Success! Generated 30-day history for ${totalUpdated} centers.`);
    console.log('📈 All charts should now display randomized data trends.');

  } catch (error) {
    console.error('❌ Seeding Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Database connection closed.');
    process.exit();
  }
}

seedData();
