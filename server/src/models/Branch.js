import mongoose from 'mongoose';

const branchSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Branch name is required'],
    trim: true
  },
  country: {
    type: String,
    required: [true, 'Country is required']
  },
  state: {
    type: String,
    required: [true, 'State/Region is required']
  },
  city: {
    type: String,
    required: [true, 'City is required']
  },
  address: {
    type: String,
    required: [true, 'Address is required']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required']
  },
  gstNumber: {
    type: String,
    default: '27AAAAA1111A1Z1'
  },
  gstPercentage: {
    type: Number,
    default: 5
  },
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const Branch = mongoose.model('Branch', branchSchema);
export default Branch;
