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

// ---- Local Schema Definitions ----

const ShelterSchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['Hub', 'Shelter'], default: 'Shelter' },
  district: { type: String, required: true },
  subdistrict: { type: String },
  capacity: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now }
});

const ShelterLogSchema = new Schema({
  shelterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shelter', required: true },
  action: { type: String, enum: ['in', 'out'], required: true },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  note: { type: String }
});

const Shelter = models.Shelter || model('Shelter', ShelterSchema);
const ShelterLog = models.ShelterLog || model('ShelterLog', ShelterLogSchema);

// -------------------------------------------------------

async function seedData() {
  console.log('🌱 [Seed] Starting Population Simulation (Direct to ShelterLog)...');
  
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI as string);
    console.log('✅ Connected.');

    // Fetch all active shelters
    const shelters = await Shelter.find({ type: 'Shelter' });
    console.log(`📊 Found ${shelters.length} active Shelters. Clearing old logs and re-seeding...`);

    if (shelters.length === 0) {
      console.log('⚠️ No shelters found to update.');
      return;
    }

    // Optional: Clear existing logs for these shelters to have a clean simulation
    const shelterIds = shelters.map(s => s._id);
    await ShelterLog.deleteMany({ shelterId: { $in: shelterIds } });
    console.log('🧹 Cleared existing ShelterLogs for these shelters.');

    let totalLogsCreated = 0;
    let centersProcessed = 0;

    for (const shelter of shelters) {
      const capacity = shelter.capacity || 100;
      
      // Start with a small random number of people (5-15% of capacity)
      let currentOccupancy = Math.floor(Math.random() * (capacity * 0.1)) + Math.floor(capacity * 0.05);
      
      const daysHistory = 30; // 30 days of data
      const logsToInsert = [];
      
      for (let i = daysHistory; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        // Random time during the day
        const morning = new Date(date); morning.setHours(9, 0, 0);
        const evening = new Date(date); evening.setHours(17, 0, 0);

        // Simulation parameters
        const isBigShelter = capacity > 300;
        const activityScale = isBigShelter ? 15 : 5;

        // 1. Check In: Random influx
        let checkIn = 0;
        if (Math.random() > 0.8) {
          checkIn = Math.floor(Math.random() * activityScale * 3);
        } else {
          checkIn = Math.floor(Math.random() * activityScale);
        }

        if (checkIn > 0) {
          logsToInsert.push({
            shelterId: shelter._id,
            action: 'in',
            amount: checkIn,
            date: morning,
            note: 'Simulated Influx'
          });
        }

        // 2. Check Out: People leaving
        const canLeave = currentOccupancy + checkIn;
        let checkOut = 0;
        if (i < 7) {
          checkOut = Math.floor(Math.random() * (canLeave * 0.3));
        } else {
          checkOut = Math.floor(Math.random() * (canLeave * 0.1));
        }

        if (checkOut > 0) {
          logsToInsert.push({
            shelterId: shelter._id,
            action: 'out',
            amount: checkOut,
            date: evening,
            note: 'Simulated Departure'
          });
        }

        currentOccupancy = currentOccupancy + checkIn - checkOut;
        if (currentOccupancy < 0) currentOccupancy = 0;
      }

      if (logsToInsert.length > 0) {
        await ShelterLog.insertMany(logsToInsert);
        totalLogsCreated += logsToInsert.length;
      }

      centersProcessed++;
      if (centersProcessed % 5 === 0) {
        console.log(`⏳ Progress: ${centersProcessed}/${shelters.length} centers processed...`);
      }
    }

    console.log(`\n✨ Success! Created ${totalLogsCreated} logs for ${centersProcessed} centers.`);
    console.log('📈 Dashboards will now show trends based on the new ShelterLog model.');

  } catch (error) {
    console.error('❌ Seeding Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Database connection closed.');
    process.exit();
  }
}

seedData();
