import mongoose from 'mongoose';

const orderItemModifierSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    default: 0
  }
}, { _id: false });

const orderItemSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },
  menuItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1']
  },
  price: {
    type: Number,
    required: true
  },
  subtotal: {
    type: Number,
    required: true
  },
  modifiers: [orderItemModifierSchema],
  status: {
    type: String,
    enum: ['pending', 'preparing', 'ready', 'served', 'cancelled'],
    default: 'pending'
  },
  notes: {
    type: String,
    trim: true
  },
  preparingAt: Date,
  readyAt: Date,
  cancellationReason: String,
  station: {
    type: String,
    enum: ['Main Course', 'Tandoor', 'Chinese', 'Snacks', 'Beverages', 'Desserts', 'General'],
    default: 'General'
  }
}, {
  timestamps: true
});

const OrderItem = mongoose.model('OrderItem', orderItemSchema);
export default OrderItem;
