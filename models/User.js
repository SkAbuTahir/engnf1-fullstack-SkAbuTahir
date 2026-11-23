const mongoose = require('mongoose');
const { ROLES } = require('../lib/constants');
const jsonOpts = require('./_json');

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, default: 'USER' },
  },
  { timestamps: { createdAt: true, updatedAt: false }, toJSON: jsonOpts }
);

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
