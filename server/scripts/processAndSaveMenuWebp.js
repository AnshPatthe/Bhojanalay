import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import MenuItem from '../src/models/MenuItem.js';

const brainDir = `C:\\Users\\CSTS-02\\.gemini\\antigravity-ide\\brain\\c3d3e58c-e0ef-4c09-9521-124377a0bfa8`;
const outputAssetsDir = path.join(__dirname, '../assets/menu_items');

if (!fs.existsSync(outputAssetsDir)) {
  fs.mkdirSync(outputAssetsDir, { recursive: true });
}

// Map dish names in DB to prefix in brain directory
const dishMapping = [
  { dbName: 'Chicken Tikka', prefix: 'chicken_tikka', targetFilename: 'chicken_tikka.webp' },
  { dbName: 'Egg Curry', prefix: 'egg_curry', targetFilename: 'egg_curry.webp' },
  { dbName: 'Shwarma', prefix: 'shawarma', targetFilename: 'shawarma.webp' },
  { dbName: 'Boil Bhurji', prefix: 'boil_bhurji', targetFilename: 'boil_bhurji.webp' },
  { dbName: 'Veg Kolhapri', prefix: 'veg_kolhapuri', targetFilename: 'veg_kolhapuri.webp' },
  { dbName: 'Paneer', prefix: 'paneer', targetFilename: 'paneer.webp' },
  { dbName: 'Baingan Bharta', prefix: 'baingan_bharta', targetFilename: 'baingan_bharta.webp' },
  { dbName: 'Mix Veg', prefix: 'mix_veg', targetFilename: 'mix_veg.webp' },
  { dbName: 'Rumali Roti', prefix: 'rumali_roti', targetFilename: 'rumali_roti.webp' },
  { dbName: 'Nan', prefix: 'nan', targetFilename: 'nan.webp' },
  { dbName: 'Masala Papad', prefix: 'masala_papad', targetFilename: 'masala_papad.webp' },
  { dbName: 'Manchurian', prefix: 'manchurian', targetFilename: 'manchurian.webp' },
  { dbName: 'Soyabean Chilli', prefix: 'soyabean_chilli', targetFilename: 'soyabean_chilli.webp' }
];

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB.');

    const brainFiles = fs.readdirSync(brainDir);

    for (const item of dishMapping) {
      // Find matching PNG in brainDir
      const matchedFile = brainFiles.find(f => f.startsWith(item.prefix) && f.endsWith('.png'));

      if (!matchedFile) {
        console.warn(`No generated image found for ${item.dbName} (prefix: ${item.prefix})`);
        continue;
      }

      const inputPath = path.join(brainDir, matchedFile);
      const outputPath = path.join(outputAssetsDir, item.targetFilename);

      // Convert to WebP format using sharp
      await sharp(inputPath)
        .webp({ quality: 85 })
        .toFile(outputPath);

      console.log(`Converted ${matchedFile} -> ${item.targetFilename}`);

      const publicUrl = `/assets/menu_items/${item.targetFilename}`;

      // Update MongoDB MenuItem database record
      const updateResult = await MenuItem.updateMany(
        { name: new RegExp(`^${item.dbName}$`, 'i') },
        { image: publicUrl }
      );

      console.log(`Updated DB for "${item.dbName}": matched ${updateResult.matchedCount}, modified ${updateResult.modifiedCount} with URL: ${publicUrl}`);
    }

    console.log('All menu item images processed and database records updated successfully!');
  } catch (err) {
    console.error('Error during image processing:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
