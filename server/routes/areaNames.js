// routes/areaNames.js
const express = require("express");
const router = express.Router();
const AreaName = require("../models/AreaName");

// Get all area names
router.get("/", async (req, res) => {
  try {
    const areaNames = await AreaName.find().maxTimeMS(10000); // 10 second timeout
    res.json(areaNames);
  } catch (error) {
    console.error("Get area names error:", error);
    if (
      error.name === "MongooseError" &&
      error.message.includes("buffering timed out")
    ) {
      return res.status(503).json({
        message: "Database connection timeout. Please try again.",
      });
    }
    res.status(500).json({ message: error.message });
  }
});

// Get area name by ID
router.get("/:id", async (req, res) => {
  try {
    const areaName = await AreaName.findById(req.params.id).maxTimeMS(10000);
    if (!areaName) {
      return res.status(404).json({ message: "Area name not found" });
    }
    res.json(areaName);
  } catch (error) {
    console.error("Get area name error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Create new area name
router.post("/", async (req, res) => {
  console.log("Post area name request hit:", req.body);
  try {
    const { name, latitude, longitude } = req.body;

    // Validate required fields
    if (!name || latitude == null || longitude == null) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Validate coordinates range
    if (latitude < -90 || latitude > 90) {
      return res.status(400).json({ message: "Invalid latitude value" });
    }
    if (longitude < -180 || longitude > 180) {
      return res.status(400).json({ message: "Invalid longitude value" });
    }

    const areaNameData = {
      name: name.trim(),
      coordinates: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
      },
    };

    const areaName = new AreaName(areaNameData);
    const savedAreaName = await areaName.save();

    res.status(201).json({
      data: savedAreaName,
      success: true,
      message: "Area Name added successfully",
    });
  } catch (error) {
    console.error("Create area name error:", error);

    // Handle duplicate name error
    if (error.code === 11000) {
      return res.status(400).json({ message: "Area name already exists" });
    }

    res.status(400).json({ message: error.message });
  }
});

// Update area name
router.put("/:id", async (req, res) => {
  try {
    const { name, latitude, longitude } = req.body;
    const { id } = req.params;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ message: "Area name is required" });
    }

    if (latitude == null || longitude == null) {
      return res.status(400).json({ message: "Valid coordinates required" });
    }

    // Validate coordinates range
    if (latitude < -90 || latitude > 90) {
      return res.status(400).json({ message: "Invalid latitude value" });
    }
    if (longitude < -180 || longitude > 180) {
      return res.status(400).json({ message: "Invalid longitude value" });
    }

    const updateData = {
      name: name.trim(),
      coordinates: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
      },
      updatedAt: Date.now(),
    };

    const areaName = await AreaName.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).maxTimeMS(10000);

    if (!areaName) {
      return res.status(404).json({ message: "Area name not found" });
    }

    res.json(areaName);
  } catch (error) {
    console.error("Update area name error:", error);

    // Handle duplicate name error
    if (error.code === 11000) {
      return res.status(400).json({ message: "Area name already exists" });
    }

    res.status(400).json({ message: error.message });
  }
});

// Delete area name
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deletedAreaName = await AreaName.findByIdAndDelete(id).maxTimeMS(
      10000
    );

    if (!deletedAreaName) {
      return res.status(404).json({ message: "Area name not found" });
    }

    res.json({
      message: "Area name deleted successfully",
      deletedAreaName,
    });
  } catch (error) {
    console.error("Delete area name error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Get area name statistics for dashboard
router.get("/stats/dashboard", async (req, res) => {
  try {
    const totalAreaNames = await AreaName.countDocuments().maxTimeMS(10000);

    res.json({
      totalAreaNames,
    });
  } catch (error) {
    console.error("Area name stats error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Search area names by name (optional - useful for filtering)
router.get("/search/name", async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }

    const areaNames = await AreaName.find({
      name: { $regex: query, $options: "i" }, // Case-insensitive search
    }).maxTimeMS(10000);

    res.json(areaNames);
  } catch (error) {
    console.error("Search area names error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Get area names within a radius (optional - useful for map filtering)
router.post("/nearby", async (req, res) => {
  try {
    const { latitude, longitude, radiusInMeters = 5000 } = req.body;

    if (latitude == null || longitude == null) {
      return res.status(400).json({ message: "Coordinates are required" });
    }

    // Calculate using Haversine formula
    const areaNames = await AreaName.find().maxTimeMS(10000);

    const nearby = areaNames.filter((area) => {
      const R = 6371e3; // Earth's radius in meters
      const φ1 = (latitude * Math.PI) / 180;
      const φ2 = (area.coordinates.latitude * Math.PI) / 180;
      const Δφ = ((area.coordinates.latitude - latitude) * Math.PI) / 180;
      const Δλ = ((area.coordinates.longitude - longitude) * Math.PI) / 180;

      const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      const distance = R * c;

      return distance <= radiusInMeters;
    });

    res.json(nearby);
  } catch (error) {
    console.error("Nearby area names error:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
