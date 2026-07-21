import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Waiter from '../src/models/Waiter.js';
import Restaurant from '../src/models/Restaurant.js';
import Branch from '../src/models/Branch.js';

dotenv.config();

const createWaiter = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to Database.');

    // Find first restaurant and branch to attach the waiter to
    const restaurant = await Restaurant.findOne();
    const branch = await Branch.findOne();

    if (!restaurant || !branch) {
      console.log('Error: No restaurant or branch found in the database. Please create an owner account and setup a restaurant first.');
      process.exit(1);
    }

    // Waiter Details
    const waiterData = {
      restaurantId: restaurant._id,
      branchId: branch._id,
      name: 'John Doe',
      email: 'waiter@restaurant.com',
      password: 'password123',
      status: 'active'
    };

    // Check if waiter already exists
    const existing = await Waiter.findOne({ email: waiterData.email });
    if (existing) {
      console.log('Waiter already exists!');
      process.exit(0);
    }

    const newWaiter = await Waiter.create(waiterData);
    console.log('Successfully created Waiter!');
    console.log('Email:', newWaiter.email);
    console.log('Password:', 'password123');
    
    process.exit(0);
  } catch (err) {
    console.error('Failed to create waiter:', err);
    process.exit(1);
  }
};

createWaiter();
