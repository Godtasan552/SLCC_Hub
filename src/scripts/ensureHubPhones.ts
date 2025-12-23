import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

async function migrate() {
  await mongoose.connect(MONGODB_URI as string);
  
  // Define Schema with phoneNumbers
  const HubSchema = new Schema({
    name: String,
    phoneNumbers: [String]
  }, { collection: 'hubs' });

  // Use a different name for the model in script to avoid conflicts
  const Hub = models.HubScript || model('HubScript', HubSchema);

  // Update all hubs that don't have phoneNumbers array
  const hubs = await Hub.find({});
  console.log(`Checking ${hubs.length} hubs...`);

  for (const hub of hubs) {
    if (!hub.phoneNumbers || hub.phoneNumbers.length === 0) {
      // Add a dummy or empty array if missing
      await Hub.updateOne({ _id: hub._id }, { $set: { phoneNumbers: [] } });
      console.log(`Fixed phoneNumbers for ${hub.name}`);
    }
  }

  await mongoose.disconnect();
}

migrate();
