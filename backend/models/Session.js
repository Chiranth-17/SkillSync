const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  fromName: { type: String, default: 'Unknown' },
  text: { type: String },
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

const SessionSchema = new mongoose.Schema({
  mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  learner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  skillRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill' },
  skillName: { type: String },
  scheduledAt: { type: Date, required: true },
  durationMins: { type: Number, default: 60 },
  pointsCost: { type: Number, default: 1 },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'confirmed', 'scheduled', 'completed', 'cancelled'],
    default: 'pending',
  },
  messages: [MessageSchema],
  feedback: { type: String },
  rating: { type: Number, min: 1, max: 5 },
  meetingLink: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

const ExchangeSchema = new mongoose.Schema({
  participants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  ],
  skills: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Skill',
      required: true
    }
  ],
  status: {
    type: String,
    enum: ['pending', 'accepted', 'completed', 'cancelled'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const ChatMessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = {
  Session: mongoose.model('Session', SessionSchema),
  Exchange: mongoose.model('Exchange', ExchangeSchema),
  ChatMessage: mongoose.model('ChatMessage', ChatMessageSchema)
};
