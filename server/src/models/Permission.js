import mongoose from 'mongoose';

const permissionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  key: {
    type: String,
    required: true,
    unique: true,
    index: true // e.g., 'menu:write', 'orders:read'
  },
  description: {
    type: String,
    required: true
  },
  module: {
    type: String,
    required: true // e.g., 'orders', 'menu', 'inventory', 'users'
  }
}, {
  timestamps: true
});

const Permission = mongoose.model('Permission', permissionSchema);
export default Permission;
