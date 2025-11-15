const mongoose = require("mongoose");

const hubSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: false, // Image/diagram specific to this location
  },
  image2: {
    type: String,
    required: false, // Additional image/diagram specific to this location
  },
  notes: {
    type: String,
    required: false,
    trim: true,
  },
  coordinates: {
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Hub", hubSchema);
