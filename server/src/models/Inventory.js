import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema({
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
  itemName: {
    type: String,
    required: [true, 'Inventory item name is required'],
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 0
  },
  unit: {
    type: String, // kg, liters, pcs, etc.
    required: true
  },
  reorderLevel: {
    type: Number,
    required: true,
    default: 10
  },
  costPrice: {
    type: Number,
    required: true,
    default: 0
  },
  supplierName: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Unique item per branch
inventorySchema.index({ branchId: 1, itemName: 1 }, { unique: true });

const Inventory = mongoose.model('Inventory', inventorySchema);
export default Inventory;
