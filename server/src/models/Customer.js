import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Customer phone number is required'],
    trim: true
  },
  loyaltyPoints: {
    type: Number,
    default: 0
  },
  isVIP: {
    type: Boolean,
    default: false
  },
  allergies: {
    type: String,
    default: ''
  },
  favoriteFood: {
    type: String,
    default: ''
  },
  birthday: Date,
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Unique phone per restaurant
customerSchema.index({ restaurantId: 1, phone: 1 }, { unique: true });

const Customer = mongoose.model('Customer', customerSchema);
export default Customer;
