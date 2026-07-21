import mongoose from 'mongoose';

const restaurantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Restaurant name is required'],
    trim: true
  },
  logo: {
    type: String, // Cloudinary URL
    default: ''
  },
  type: {
    type: String,
    required: [true, 'Restaurant type is required'],
    enum: ['fine_dining', 'casual_dining', 'quick_service', 'cafe', 'bar', 'bakery', 'food_truck', 'other']
  },
  currency: {
    type: String,
    required: [true, 'Currency is required'],
    default: 'USD'
  },
  timezone: {
    type: String,
    required: [true, 'Timezone is required'],
    default: 'UTC'
  },
  status: {
    type: String,
    enum: ['active', 'trial', 'past_due', 'suspended'],
    default: 'trial'
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

const Restaurant = mongoose.model('Restaurant', restaurantSchema);
export default Restaurant;
