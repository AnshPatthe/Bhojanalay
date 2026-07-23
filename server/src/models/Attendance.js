import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
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
  date: {
    type: Date,
    required: [true, 'Date is required'],
    index: true
  },
  clockIn: {
    type: Date
  },
  clockOut: {
    type: Date
  },
  status: {
    type: String,
    enum: ['Present', 'Absent', 'Leave', 'Half-day'],
    default: 'Present'
  },
  overtimeHours: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Ensure only one attendance sheet per employee/waiter per day
attendanceSchema.index({ waiterId: 1, date: 1 });
attendanceSchema.index({ employeeId: 1, date: 1 });

const Attendance = mongoose.model('Attendance', attendanceSchema);
export default Attendance;
