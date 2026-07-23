import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import MenuItem from '../src/models/MenuItem.js';

async function listItems() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const items = await MenuItem.find({}).lean();
    console.log(`FOUND_ITEMS_COUNT:${items.length}`);
    items.forEach(item => {
      console.log(`DISH|${item._id}|${item.name}|${item.image || ''}`);
    });
  } catch (err) {
    console.error('Error fetching menu items:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

listItems();
