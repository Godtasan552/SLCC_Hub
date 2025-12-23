import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

async function check() {
  console.log('Connecting to:', MONGODB_URI?.split('@')[1] || 'Unknown');
  await mongoose.connect(MONGODB_URI as string);
  console.log('Connected to DB:', mongoose.connection.name);
  const HubSchema = new Schema({
    name: String,
    phoneNumbers: [String]
  }, { collection: 'hubs' });
  const Hub = models.Hub || model('Hub', HubSchema);
  const hubs = await Hub.find({});
  console.log(`Found ${hubs.length} hubs.`);
  hubs.forEach(h => {
    console.log(`Name: ${h.name}, Phones: ${JSON.stringify(h.phoneNumbers)}`);
  });
  await mongoose.disconnect();
}

check();
