import dbConnect from '../lib/dbConnect';
import Shelter from '../models/Shelter';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

async function checkLogs() {
  await dbConnect();
  const shelters = await Shelter.find({}).limit(10);
  console.log('--- Checking Shelter Logs ---');
  shelters.forEach(s => {
    console.log(`Shelter: ${s.name}`);
    console.log(`Current: ${s.currentOccupancy} / ${s.capacity}`);
    console.log(`Logs:`, JSON.stringify(s.dailyLogs, null, 2));
    console.log('---------------------------');
  });
  process.exit(0);
}

checkLogs();
