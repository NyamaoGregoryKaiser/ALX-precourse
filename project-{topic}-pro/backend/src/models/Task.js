```javascript
const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    minlength: [3, 'Task title must be at least 3 characters long'],
    maxlength: [150, 'Task title cannot exceed 150 characters'],
  },
  description: {
    type: String,
    required: [true, 'Task description is required'],
    maxlength: [1000, 'Task description cannot exceed 1000 characters'],
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Task must belong to a project'],
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Task must be assigned to a user'],
  },
  status: {
    type: String,
    enum: ['To Do', 'In Progress', 'Done', 'Blocked', 'Cancelled'],
    default: 'To Do',
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Medium',
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required for the task'],
  },
  completedAt: {
    type: Date,
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt
});

// Add indexes for faster queries
taskSchema.index({ projectId: 1, status: 1 });
taskSchema.index({ assignedTo: 1, dueDate: 1 });

// Middleware to set `completedAt` when status changes to 'Done'
taskSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    if (this.status === 'Done' && !this.completedAt) {
      this.completedAt = new Date();
    } else if (this.status !== 'Done' && this.completedAt) {
      this.completedAt = undefined; // Clear if status changes from Done
    }
  }
  next();
});

module.exports = mongoose.model('Task', taskSchema);
```