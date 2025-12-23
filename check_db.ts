import * as dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import dbConnect from './src/lib/dbConnect';
import Supply from './src/models/Supply';
import Hub from './src/models/Hub';

async function check() {
  await dbConnect();
  const hubs = await Hub.find({});
  console.log('Hubs in DB:', hubs.length);
  hubs.forEach(h => console.log(`  - ${h.name} (_id: ${h._id})`));

  const supplies = await Supply.find({}).limit(10);
  console.log('Last 10 Supplies in DB:');
  supplies.forEach(s => console.log(`  - ${s.name} (Qty: ${s.quantity}, shelterId: ${s.shelterId}, shelterName: ${s.shelterName})`));
  
  process.exit(0);
}

check().catch(err => {
    console.error(err);
    process.exit(1);
});
