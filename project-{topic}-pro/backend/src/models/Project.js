```javascript
const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    minlength: [3, 'Project name must be at least 3 characters long'],
    maxlength: [100, 'Project name cannot exceed 100 characters'],
  },
  description: {
    type: String,
    required: [true, 'Project description is required'],
    maxlength: [500, 'Project description cannot exceed 500 characters'],
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['developer', 'manager'], // Role within this specific project
      default: 'developer',
    },
    _id: false // Do not create an _id for subdocuments in this array
  }],
  status: {
    type: String,
    enum: ['active', 'archived', 'on-hold', 'completed'],
    default: 'active',
  },
  startDate: {
    type: Date,
    default: Date.now,
  },
  endDate: Date,
}, {
  timestamps: true, // Adds createdAt and updatedAt
});

// Ensure that the owner is automatically added as a manager member
projectSchema.pre('save', async function (next) {
  if (this.isNew || this.isModified('owner')) {
    // If the owner is changed or it's a new project, ensure the owner is a member
    const ownerId = this.owner;
    const isOwnerAMember = this.members.some(member => member.user.equals(ownerId));

    if (!isOwnerAMember) {
      this.members.push({ user: ownerId, role: 'manager' });
    } else {
      // Ensure owner's role is manager if they are already a member
      this.members = this.members.map(member =>
        member.user.equals(ownerId) ? { ...member.toObject(), role: 'manager' } : member
      );
    }
  }
  next();
});

// Add index for faster queries by owner and member
projectSchema.index({ owner: 1 });
projectSchema.index({ 'members.user': 1 });

module.exports = mongoose.model('Project', projectSchema);
```