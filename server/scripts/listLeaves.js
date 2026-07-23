import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import Leave from '../src/models/Leave.js';

async function listLeaves() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const leaves = await Leave.find({}).lean();
    console.log(`FOUND_LEAVES_COUNT:${leaves.length}`);
    leaves.forEach(l => {
      console.log(`LEAVE|${l._id}|${l.waiterId}|${l.type}|${l.status}|${l.startDate}|${l.endDate}`);
    });
  } catch (err) {
    console.error('Error fetching leaves:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

listLeaves();
