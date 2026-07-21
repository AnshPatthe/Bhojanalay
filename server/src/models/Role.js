import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    default: null, // null for system-wide default roles
    index: true
  },
  name: {
    type: String,
    required: [true, 'Role name is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  permissions: [{
    type: String // We will store permission keys directly for simplicity and performance (e.g. "menu:read", "order:write")
  }],
  isSystemRole: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Ensure roles are unique per restaurant
roleSchema.index({ restaurantId: 1, name: 1 }, { unique: true });

const Role = mongoose.model('Role', roleSchema);
export default Role;
