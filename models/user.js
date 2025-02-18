const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    profilePicture: { type: String, default: "" }, // URL of profile picture
    status: { type: String, default: "Hey there! I'm using ChatApp." },
    isOnline: { type: Boolean, default: false }, // Online status
    lastSeen: { type: Date, default: Date.now },
    dod:{
        type:String,
        require:true
    },
    contacts: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }] // List of contacts (friends)
}, { timestamps: true });

const Schema = mongoose.model('users',UserSchema);
module.exports = Schema;