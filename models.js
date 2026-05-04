// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Naam zaroori hai'],
    trim: true,
    minlength: [2, 'Naam kam se kam 2 characters ka hona chahiye'],
    maxlength: [50, 'Naam zyada se zyada 50 characters ka ho sakta hai']
  },
  email: {
    type: String,
    required: [true, 'Email zaroori hai'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Valid email address daalein']
  },
  password: {
    type: String,
    required: [true, 'Password zaroori hai'],
    minlength: [8, 'Password kam se kam 8 characters ka hona chahiye'],
    select: false // By default password query mein nahi aayega
  },
  avatar: {
    type: String,
    default: null
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user'
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null
  },
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  refreshTokens: [String],
  preferences: {
    notifications: { type: Boolean, default: true },
    emailSummary: { type: Boolean, default: true },
    language: { type: String, default: 'hi' }
  }
}, { timestamps: true });

// Password hash karo save se pehle
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Password compare karo
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Password field hide karo JSON mein
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshTokens;
  return obj;
};

module.exports = mongoose.model('User', userSchema);

// ─────────────────────────────────────────────
// models/Meeting.js
const meetingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Meeting title zaroori hai'],
    trim: true,
    maxlength: [100, 'Title 100 characters se zyada nahi ho sakta']
  },
  meetingId: {
    type: String,
    unique: true,
    required: true
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  participants: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    joinedAt: { type: Date, default: Date.now },
    leftAt: { type: Date, default: null },
    role: { type: String, enum: ['host', 'co-host', 'participant'], default: 'participant' },
    isMuted: { type: Boolean, default: false },
    isVideoOn: { type: Boolean, default: true }
  }],
  status: {
    type: String,
    enum: ['scheduled', 'active', 'ended'],
    default: 'scheduled'
  },
  startedAt: { type: Date, default: null },
  endedAt: { type: Date, default: null },
  duration: { type: Number, default: 0 }, // minutes mein
  transcript: [{
    speaker: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    speakerName: String,
    text: String,
    timestamp: { type: Date, default: Date.now },
    confidence: { type: Number, default: 0.95 }
  }],
  aiSummary: {
    text: { type: String, default: null },
    keyPoints: [String],
    sentiment: { type: String, enum: ['positive', 'neutral', 'negative'], default: 'neutral' },
    generatedAt: { type: Date, default: null }
  },
  actionItems: [{
    text: String,
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assigneeName: String,
    dueDate: { type: Date, default: null },
    status: { type: String, enum: ['pending', 'in-progress', 'done'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
  }],
  recording: {
    url: { type: String, default: null },
    duration: { type: Number, default: 0 },
    size: { type: Number, default: 0 }
  },
  settings: {
    isPublic: { type: Boolean, default: false },
    requirePassword: { type: Boolean, default: false },
    password: { type: String, default: null },
    allowRecording: { type: Boolean, default: true },
    maxParticipants: { type: Number, default: 100 }
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null
  }
}, { timestamps: true });

// Unique meeting ID generate karo
meetingSchema.pre('save', function(next) {
  if (!this.meetingId) {
    this.meetingId = 'IM-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2,4).toUpperCase();
  }
  next();
});

const Meeting = mongoose.model('Meeting', meetingSchema);

// ─────────────────────────────────────────────
// models/Task.js
const taskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  meeting: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting' },
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  status: {
    type: String,
    enum: ['todo', 'in-progress', 'review', 'done'],
    default: 'todo'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  dueDate: { type: Date, default: null },
  tags: [String],
  isFromAI: { type: Boolean, default: false } // AI se automatically bana tha?
}, { timestamps: true });

const Task = mongoose.model('Task', taskSchema);

module.exports = { User: mongoose.model('User', userSchema), Meeting, Task };
