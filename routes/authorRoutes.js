const express = require("express");
const router = express.Router();
const multer = require("multer");
const { ensureAuthenticated, roleBasedAccess } = require("../middleware/authMiddleware");
const Paper = require("../models/Paper");
const Conference = require("../models/Conference");

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// Ensure only authors can access
router.use(ensureAuthenticated, roleBasedAccess(["Author"])); // Capitalized "Author"

// Author Dashboard: View Conferences & Papers
router.get("/dashboard", async (req, res) => {
  try {
    console.log("🔍 /author/dashboard - Current User:", req.user);
    console.log("🔍 /author/dashboard - User Role:", req.user?.role);
    const conferences = await Conference.find();
    const papers = await Paper.find({ author: req.user._id }).populate("conference", "name");
    res.render("author_dashboard", { conferences, papers });
  } catch (error) {
    console.error("❌ Error fetching author dashboard:", error);
    req.flash("error_msg", "Something went wrong. Please try again.");
    res.redirect("/login");
  }
});

// Submit Paper
router.post("/submit-paper", upload.single("file"), async (req, res) => {
  try {
    const { title, abstract, conference } = req.body;
    await Paper.create({
      title,
      abstract,
      filename: req.file.filename, // Store the filename from multer
      author: req.user._id,
      conference,
    });
    req.flash("success_msg", "Paper submitted successfully.");
    res.redirect("/author/dashboard");
  } catch (error) {
    console.error("❌ Error submitting paper:", error);
    req.flash("error_msg", "Failed to submit paper.");
    res.redirect("/author/dashboard");
  }
});

module.exports = router;