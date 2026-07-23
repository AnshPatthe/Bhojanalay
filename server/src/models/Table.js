import mongoose from 'mongoose';

const tableSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true,
    index: true
  },
  tableNumber: {
    type: String,
    required: [true, 'Table number is required'],
    trim: true
  },
  capacity: {
    type: Number,
    default: 4
  },
  floor: {
    type: String,
    default: 'Ground Floor',
    trim: true
  },
  status: {
    type: String,
    enum: ['Available', 'Occupied', 'Reserved', 'Cleaning', 'Billing', 'Preparing'],
    default: 'Available'
  }
}, {
  timestamps: true
});

tableSchema.index({ branchId: 1, tableNumber: 1 }, { unique: true });

const Table = mongoose.model('Table', tableSchema);
export default Table;
