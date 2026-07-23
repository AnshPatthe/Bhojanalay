import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import Waiter from '../src/models/Waiter.js';

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const waiters = await Waiter.find({}).lean();
    console.log(`FOUND_WAITERS_COUNT:${waiters.length}`);
    waiters.forEach(w => {
      console.log(`WAITER|${w._id}|${w.name}|${w.email}`);
    });
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
