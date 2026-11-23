const mongoose = require('mongoose');
const { RESOURCE_TYPES } = require('../lib/constants');
const jsonOpts = require('./_json');

const ResourceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 3, maxlength: 60 },
    type: { type: String, enum: RESOURCE_TYPES, required: true },
    capacity: {
      type: Number,
      required: true,
      min: 1,
      max: 500,
      validate: { validator: Number.isInteger, message: 'capacity must be an integer' },
    },
    description: { type: String, default: null, trim: true, maxlength: 300 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, toJSON: jsonOpts }
);

// Case-insensitive uniqueness via collation strength 2.
ResourceSchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });
ResourceSchema.index({ type: 1, capacity: 1 });

module.exports = mongoose.models.Resource || mongoose.model('Resource', ResourceSchema);
