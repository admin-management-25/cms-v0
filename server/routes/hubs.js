// routes/hubs.js
const express = require("express");
const router = express.Router();
const Hub = require("../models/Hub");
const Admin = require("../models/Admin");

// Optional: Validate Cloudinary URL
const isValidCloudinaryUrl = (url) => {
  try {
    const u = new URL(url);
    return (
      u.hostname === "res.cloudinary.com" &&
      u.pathname.startsWith(`/${process.env.CLOUDINARY_CLOUD_NAME}/`)
    );
  } catch {
    return false;
  }
};

// Get all hubs
router.get("/", async (req, res) => {
  try {
    const hubs = await Hub.find().maxTimeMS(10000); // 10 second timeout
    res.json(hubs);
  } catch (error) {
    console.error("Get hubs error:", error);
    if (
      error.name === "MongooseError" &&
      error.message.includes("buffering timed out")
    ) {
      return res.status(503).json({
        message: "Database connection timeout. Please Login again",
      });
    }
    res.status(500).json({ message: error.message });
  }
});

// Get hub by ID
router.get("/:id", async (req, res) => {
  try {
    const hub = await Hub.findById(req.params.id).maxTimeMS(10000);
    if (!hub) {
      return res.status(404).json({ message: "Hub not found" });
    }
    res.json(hub);
  } catch (error) {
    console.error("Get hub error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Create new hub
router.post("/", async (req, res) => {
  console.log("Post request hit :-", req.body);
  try {
    const { name, notes, latitude, longitude, image, image2 } = req.body;

    // Validate required fields
    if (!name || latitude == null || longitude == null) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Validate Cloudinary URLs (optional but recommended)
    if (image && !isValidCloudinaryUrl(image)) {
      return res.status(400).json({ message: "Invalid Cloudinary image URL" });
    }
    if (image2 && !isValidCloudinaryUrl(image2)) {
      return res.status(400).json({ message: "Invalid Cloudinary image2 URL" });
    }

    const hubData = {
      name,
      notes: notes || "",
      coordinates: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
      },
      ...(image && { image }),
      ...(image2 && { image2 }),
    };

    const hub = new Hub(hubData);
    const savedHub = await hub.save();

    res.status(201).json({
      success: true,
      message: "Hub added successfully",
      data: savedHub,
    });
  } catch (error) {
    console.error("Create hub error:", error);
    res.status(400).json({ message: error.message });
  }
});

// Update hub
router.put("/:id", async (req, res) => {
  try {
    const { name, notes, latitude, longitude, image, image2 } = req.body;
    const { id } = req.params;

    if (!name) {
      return res.status(400).json({ message: "Hub name is required" });
    }

    if (!latitude || !longitude) {
      return res.status(400).json({ message: "Valid coordinates required" });
    }

    const updateData = {
      name,
      notes,
      coordinates: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
      },
      ...(image !== undefined && { image }),
      ...(image2 !== undefined && { image2 }),
      updatedAt: Date.now(),
    };

    // Validate Cloudinary URLs
    if (image && !isValidCloudinaryUrl(image)) {
      return res.status(400).json({ message: "Invalid Cloudinary image URL" });
    }
    if (image2 && !isValidCloudinaryUrl(image2)) {
      return res.status(400).json({ message: "Invalid Cloudinary image2 URL" });
    }

    const hub = await Hub.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).maxTimeMS(10000);

    if (!hub) {
      return res.status(404).json({ message: "Hub not found" });
    }
    res.json(hub);
  } catch (error) {
    console.error("Update hub error:", error);
    res.status(400).json({ message: error.message });
  }
});

// Delete hub
router.delete("/:id/:adminId", async (req, res) => {
  try {
    const { id, adminId } = req.params;

    // Find and delete the hub
    const deletedHub = await Hub.findOneAndDelete({
      _id: id,
    }).maxTimeMS(10000);

    if (!deletedHub) {
      return res.status(404).json({ message: "Hub not found" });
    }

    // Extract coordinates from deleted hub
    const { latitude, longitude } = deletedHub.coordinates;

    // Find the admin
    const admin = await Admin.findById(adminId).maxTimeMS(10000);
    if (!admin || !admin.geojson) {
      return res.status(404).json({ message: "Admin or geojson not found" });
    }

    // Remove that specific coordinate from admin.geojson.features
    const updatedAdmin = await Admin.findByIdAndUpdate(
      adminId,
      {
        $pull: {
          "geojson.features": {
            "coordinates.longitude": longitude,
            "coordinates.latitude": latitude,
          },
        },
      },
      { new: true }
    ).maxTimeMS(10000);

    res.json({
      message: "Hub deleted and geojson updated successfully",
      updatedUser: {
        id: updatedAdmin._id,
        username: updatedAdmin.username,
        role: updatedAdmin.role,
        geojson: updatedAdmin.geojson,
      },
      deletedHub,
    });
  } catch (error) {
    console.error("Delete hub error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Get hub statistics for dashboard
router.get("/stats/dashboard", async (req, res) => {
  try {
    const totalHubs = await Hub.countDocuments().maxTimeMS(10000);

    res.json({
      totalHubs,
    });
  } catch (error) {
    console.error("Hub stats error:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
