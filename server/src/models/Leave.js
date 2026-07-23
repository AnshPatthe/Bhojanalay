import mongoose from 'mongoose';

const leaveSchema = new mongoose.Schema({
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
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  type: {
    type: String,
    enum: ['Sick', 'Casual', 'Earned', 'Other'],
    required: [true, 'Leave type is required']
  },
  reason: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  adminRemarks: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true
});

const Leave = mongoose.model('Leave', leaveSchema);
export default Leave;
