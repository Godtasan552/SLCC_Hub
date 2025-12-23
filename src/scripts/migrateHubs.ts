import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is missing');
  process.exit(1);
}

// ---- Schemas ----
const ResourceRequestSchema = new Schema({
  category: String,
  itemName: String,
  amount: Number,
  unit: String,
  urgency: String,
  status: String,
  requestedAt: Date
});

const ShelterSchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['Hub', 'Shelter'], default: 'Shelter' },
  district: String,
  subdistrict: String,
  capacity: Number,
  currentOccupancy: Number,
  phoneNumbers: [String],
  resources: [ResourceRequestSchema],
  dailyLogs: Array,
  updatedAt: Date
});

const HubSchema = new Schema({
  name: { type: String, required: true, unique: true },
  district: String,
  subdistrict: String,
  resources: [ResourceRequestSchema],
  updatedAt: Date
});

const Shelter = models.Shelter || model('Shelter', ShelterSchema);
const Hub = models.Hub || model('Hub', HubSchema);

async function migrate() {
  await mongoose.connect(MONGODB_URI as string);
  console.log('✅ Connected to DB');

  // 1. Find all Hubs in Shelter collection
  const hubRecords = await Shelter.find({ type: 'Hub' });
  console.log(`🔍 Found ${hubRecords.length} Hubs in the Shelter collection.`);

  for (const record of hubRecords) {
    console.log(`📦 Moving Hub: ${record.name}...`);
    
    // Check if hero already exists in Hub collection
    const existing = await Hub.findOne({ name: record.name });
    
    if (!existing) {
        await Hub.create({
            name: record.name,
            district: record.district,
            subdistrict: record.subdistrict,
            resources: record.resources,
            updatedAt: record.updatedAt || new Date()
        });
        console.log(`✅ Created ${record.name} in Hub collection.`);
    } else {
        console.log(`⚠️ ${record.name} already exists in Hub collection. Skipping creation.`);
    }

    // Remove from Shelter collection
    await Shelter.deleteOne({ _id: record._id });
    console.log(`🗑️ Removed ${record.name} from Shelter collection.`);
  }

  // 2. Ensure all remaining items in Shelter collection are type 'Shelter'
  const result = await Shelter.updateMany(
    { type: { $ne: 'Shelter' } },
    { $set: { type: 'Shelter' } }
  );
  console.log(`🩹 Updated ${result.modifiedCount} old Shelter records to have explicit type: 'Shelter'.`);

  console.log('✨ Migration Complete.');
  await mongoose.disconnect();
}

migrate();
