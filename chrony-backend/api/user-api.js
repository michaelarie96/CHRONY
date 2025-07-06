const express = require("express");
const router = express.Router();
const User = require("../models/user");

// Register
router.post("/register", async (req, res) => {
  const { username, password } = req.body;

  try {
    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(409).json({ message: "Username already exists" });
    }

    const user = new User({
      username,
      password,
      // Default settings will be applied by the schema
    });
    await user.save();

    res.status(200).json({
      message: "User registered successfully",
      needsSetup: true, // Flag to indicate user needs to complete settings setup
    });
    console.log(`Register:\nUsername: ${username}\nPassword: ${password}`);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    console.log(`Login:\nUsername: ${username}\nPassword: ${password}`);
    console.log(`Setup completed flag in DB: ${user.setupCompleted}`);

    res.status(200).json({
      message: "Login successful",
      username: user.username,
      userId: user._id,
      settings: user.settings,
      setupCompleted: user.setupCompleted || false,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user settings
router.put("/settings", async (req, res) => {
  const { userId, activeStartTime, activeEndTime, restDay } = req.body;

  try {
    // Validate required fields
    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update settings (only update provided fields)
    if (activeStartTime !== undefined) {
      user.settings.activeStartTime = activeStartTime;
    }
    if (activeEndTime !== undefined) {
      user.settings.activeEndTime = activeEndTime;
    }
    if (restDay !== undefined) {
      user.settings.restDay = restDay;
    }

    // Mark setup as completed when settings are saved
    user.setupCompleted = true;

    // Save user
    await user.save();

    res.status(200).json({
      message: "Settings updated successfully",
      settings: user.settings,
      setupCompleted: user.setupCompleted,
    });

    console.log(
      `Settings updated for user: ${user.username}, setup marked as completed`
    );
  } catch (err) {
    // Handle validation errors specifically
    if (err.name === "ValidationError") {
      return res.status(400).json({
        message: "Invalid settings data",
        details: err.message,
      });
    }
    res.status(500).json({ error: err.message });
  }
});

// Get user settings
router.get("/settings/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      settings: user.settings,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user settings
router.get("/settings/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      settings: user.settings,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user categories
router.get("/categories/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      categories: user.categories || [],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a new category
router.post("/categories", async (req, res) => {
  const { userId, id, name, color } = req.body;

  try {
    if (!userId || !id || !name) {
      return res
        .status(400)
        .json({ message: "userId, id, and name are required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if category with this ID already exists
    const existingCategory = user.categories.find((cat) => cat.id === id);
    if (existingCategory) {
      return res
        .status(409)
        .json({ message: "Category with this ID already exists" });
    }

    // Add new category
    const newCategory = {
      id,
      name: name.trim(),
      color: color || "#00AFB9",
      created: new Date(),
    };

    user.categories.push(newCategory);
    await user.save();

    res.status(201).json({
      message: "Category added successfully",
      category: newCategory,
      categories: user.categories,
    });

    console.log(`Category added for user ${user.username}: ${name}`);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a category
router.put("/categories/:categoryId", async (req, res) => {
  const { userId, name, color } = req.body;
  const { categoryId } = req.params;

  try {
    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find and update category
    const categoryIndex = user.categories.findIndex(
      (cat) => cat.id === categoryId
    );
    if (categoryIndex === -1) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Update category fields
    if (name !== undefined) {
      user.categories[categoryIndex].name = name.trim();
    }
    if (color !== undefined) {
      user.categories[categoryIndex].color = color;
    }

    await user.save();

    res.status(200).json({
      message: "Category updated successfully",
      category: user.categories[categoryIndex],
      categories: user.categories,
    });

    console.log(`Category updated for user ${user.username}: ${categoryId}`);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a category
router.delete("/categories/:categoryId", async (req, res) => {
  const { userId } = req.body;
  const { categoryId } = req.params;

  try {
    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find and remove category
    const categoryIndex = user.categories.findIndex(
      (cat) => cat.id === categoryId
    );
    if (categoryIndex === -1) {
      return res.status(404).json({ message: "Category not found" });
    }

    const deletedCategory = user.categories[categoryIndex];
    user.categories.splice(categoryIndex, 1);
    await user.save();

    res.status(200).json({
      message: "Category deleted successfully",
      deletedCategory,
      categories: user.categories,
    });

    console.log(`Category deleted for user ${user.username}: ${categoryId}`);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
