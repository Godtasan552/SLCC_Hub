import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

async function fix() {
  await mongoose.connect(MONGODB_URI as string);
  console.log('Connected to DB');

  // Define Schema with phoneNumbers
  const HubSchema = new Schema({
    name: String,
    phoneNumbers: [String]
  }, { collection: 'hubs' });

  const Hub = models.Hub || model('Hub', HubSchema);

  // For testing, let's manually add a number to one if it's missing
  const result = await Hub.updateMany(
    { phoneNumbers: { $exists: false } },
    { $set: { phoneNumbers: [] } }
  );
  console.log(`Updated ${result.modifiedCount} hubs to have phoneNumbers array.`);

  await mongoose.disconnect();
}

fix();
