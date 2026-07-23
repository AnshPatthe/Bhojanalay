import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
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
    type: String, // e.g., "12" or "T4" or "Delivery"
    default: 'Takeaway'
  },
  orderType: {
    type: String,
    enum: ['dine-in', 'takeaway', 'delivery'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'preparing', 'ready', 'billing', 'completed', 'cancelled'],
    default: 'pending',
    index: true
  },
  subtotal: {
    type: Number,
    required: true,
    default: 0
  },
  tax: {
    type: Number,
    required: true,
    default: 0
  },
  discount: {
    type: Number,
    required: true,
    default: 0
  },
  total: {
    type: Number,
    required: true,
    default: 0
  },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'paid', 'refunded'],
    default: 'unpaid'
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    default: null
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default: null
  },
  waiterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Waiter',
    default: null
  },
  tableId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Table',
    default: null
  },
  items: [{
    menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
    name: String,
    quantity: Number,
    price: Number,
    subtotal: Number,
    modifiers: Array,
    notes: String
  }],
  notes: {
    type: String,
    trim: true
  },
  preparingAt: Date,
  readyAt: Date,
  cancellationReason: String,
  priority: {
    type: String,
    enum: ['Normal', 'High', 'VIP', 'Urgent'],
    default: 'Normal'
  }
}, {
  timestamps: true
});

const Order = mongoose.model('Order', orderSchema);
export default Order;
