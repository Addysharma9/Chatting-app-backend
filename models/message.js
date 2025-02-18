const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the message schema
const messageSchema = new Schema({
  message_id: { type: String, required: true, unique: true },
  senderusername: { type: String, required: true, index:true },
  recipientusername: { type: String, required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  read_status: { type: Boolean, default: false },
  message_type: { type: String, enum: ['text', 'image', 'video', 'file'], required: true }
});

// Create and export the model
const Message = mongoose.model('Message', messageSchema);
module.exports = Message;
