import mongoose from 'mongoose';

const modifierOptionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    default: 0
  }
});

const modifierSchema = new mongoose.Schema({
  menuItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Modifier name is required (e.g., "Add-ons")'],
    trim: true
  },
  isRequired: {
    type: Boolean,
    default: false
  },
  minSelection: {
    type: Number,
    default: 0
  },
  maxSelection: {
    type: Number,
    default: 1
  },
  options: [modifierOptionSchema]
}, {
  timestamps: true
});

const Modifier = mongoose.model('Modifier', modifierSchema);
export default Modifier;
