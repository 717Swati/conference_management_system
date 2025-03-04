const express = require("express");
const router = express.Router();
const { ensureAuthenticated, roleBasedAccess } = require("../middleware/authMiddleware");
const Conference = require("../models/Conference");
const Paper = require("../models/Paper");
const User = require("../models/User");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");

// Ensure only admins can access these routes
router.use(ensureAuthenticated, roleBasedAccess(["Admin"]));

// Admin Dashboard: View Conferences & Papers
router.get("/dashboard", async (req, res) => {
  try {
    const conferences = await Conference.find();
    const papers = await Paper.find()
      .populate("author", "name email")
      .populate("conference", "name")
      .populate("reviewers", "name email");

    res.render("admin_dashboard", { conferences, papers });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    res.status(500).send("Server Error");
  }
});

// Create Conference
router.post("/create-conference", async (req, res) => {
  try {
    const { name, description, startDate, endDate } = req.body;
    if (!name || !startDate || !endDate) {
      req.flash("error", "All fields are required.");
      return res.redirect("/admin/dashboard");
    }

    await Conference.create({ name, description, startDate, endDate });
    req.flash("success", "Conference created successfully.");
    res.redirect("/admin/dashboard");
  } catch (error) {
    console.error("Error creating conference:", error);
    req.flash("error", "Could not create conference.");
    res.redirect("/admin/dashboard");
  }
});

// Show Edit Conference Page
router.get("/edit-conference/:id", async (req, res) => {
  const conference = await Conference.findById(req.params.id);
  res.render("edit_conference", { conference });
});

// Handle Conference Update
router.post("/update-conference/:id", async (req, res) => {
  const { name, description, startDate, endDate } = req.body;
  await Conference.findByIdAndUpdate(req.params.id, { name, description, startDate, endDate });
  res.redirect("/admin/dashboard");
});

// Handle Conference Deletion
router.post("/delete-conference/:id", async (req, res) => {
  const paperCount = await Paper.countDocuments({ conference: req.params.id });

  if (paperCount > 0) {
    return res.send("Cannot delete conference with assigned papers.");
  }

  await Conference.findByIdAndDelete(req.params.id);
  res.redirect("/admin/dashboard");
});

// View Paper Details
router.get("/view-paper/:id", async (req, res) => {
  try {
    const paper = await Paper.findById(req.params.id)
      .populate("author", "name email")
      .populate("conference", "name")
      .populate("reviewers", "name email")
      .populate("reviews.reviewer", "name email")
      .populate("rejectedReviewers", "name email");

    if (!paper) {
      req.flash("error", "Paper not found.");
      return res.redirect("/admin/dashboard");
    }

    const reviewers = await User.find({ role: "Reviewer" });
    console.log("🔍 Reviewers found:", reviewers);
    res.render("view_paper", { paper, reviewers });
  } catch (error) {
    console.error("Error fetching paper details:", error);
    res.status(500).send("Server Error");
  }
});

// Assign Reviewer to Paper
router.post("/assign-reviewer/:paperId", async (req, res) => {
  try {
    const { reviewerId } = req.body;
    const paper = await Paper.findById(req.params.paperId);
    const reviewer = await User.findById(reviewerId);

    if (!paper || !reviewer) {
      req.flash("error", "Paper or Reviewer not found");
      return res.redirect(`/admin/view-paper/${req.params.paperId}`);
    }

    if (paper.reviewers.includes(reviewerId)) {
      req.flash("error", "Reviewer already assigned");
      return res.redirect(`/admin/view-paper/${req.params.paperId}`);
    }

    await Paper.findByIdAndUpdate(req.params.paperId, { $push: { reviewers: reviewerId } });

    const confirmationLink = `${process.env.BASE_URL}/reviewer/confirm-review?paperId=${paper._id}&reviewerId=${reviewer._id}`;
    const loginLink = `${process.env.BASE_URL}/login`; // Changed to login link
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    let reviewerPassword = "password123"; // Default for seeded reviewers
    if (!reviewer.password) {
      reviewerPassword = Math.random().toString(36).slice(-8); // Random 8-char password
      reviewer.password = await bcrypt.hash(reviewerPassword, 10);
      await reviewer.save();
    }

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: reviewer.email,
      subject: "Review Assignment Confirmation",
      html: `
        <p>Hello ${reviewer.name},</p>
        <p>You have been assigned to review: <b>${paper.title}</b>.</p>
        <p><strong>Your Login Credentials:</strong></p>
        <ul>
          <li>Email: ${reviewer.email}</li>
          <li>Password: ${reviewerPassword}</li>
        </ul>
        <p>Please confirm your assignment below and then log in at: <a href="${loginLink}">${loginLink}</a></p>
        <p><strong>Please confirm your assignment:</strong></p>
        <a href="${confirmationLink}&response=accept" style="padding:10px; background-color:green; color:white; text-decoration:none;">Accept</a>
        <a href="${confirmationLink}&response=reject" style="padding:10px; background-color:red; color:white; text-decoration:none;">Reject</a>
      `,
    });

    req.flash("success", "Reviewer assigned and email sent.");
    res.redirect(`/admin/view-paper/${req.params.paperId}`);
  } catch (error) {
    console.error("Error assigning reviewer:", error);
    req.flash("error", "Could not assign reviewer.");
    res.redirect(`/admin/view-paper/${req.params.paperId}`);
  }
});

// Add New Reviewer
router.post("/add-reviewer", async (req, res) => {
  const { name, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  await User.create({ name, email, password: hashedPassword, role: "Reviewer" });
  req.flash("success", "Reviewer added successfully.");
  res.redirect("back");
});

// Accept Paper
router.post("/accept-paper/:paperId", async (req, res) => {
  try {
    const paper = await Paper.findById(req.params.paperId)
      .populate("author", "name email")
      .populate("conference", "name");
    if (!paper) {
      req.flash("error", "Paper not found.");
      return res.redirect("/admin/dashboard");
    }

    paper.status = "Accepted";
    await paper.save();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: paper.author.email,
      subject: "Paper Accepted",
      html: `
        <p>Hello ${paper.author.name},</p>
        <p>Your paper titled <b>${paper.title}</b> has been accepted for the conference <b>${paper.conference.name}</b>.</p>
        <p>Congratulations!</p>
      `,
    });

    req.flash("success", "Paper accepted and author notified.");
    res.redirect(`/admin/view-paper/${req.params.paperId}`);
  } catch (error) {
    console.error("Error accepting paper:", error);
    req.flash("error", "Failed to accept paper.");
    res.redirect(`/admin/view-paper/${req.params.paperId}`);
  }
});

// Reject Paper
router.post("/reject-paper/:paperId", async (req, res) => {
  try {
    const paper = await Paper.findById(req.params.paperId)
      .populate("author", "name email")
      .populate("conference", "name");
    if (!paper) {
      req.flash("error", "Paper not found.");
      return res.redirect("/admin/dashboard");
    }

    paper.status = "Rejected";
    await paper.save();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: paper.author.email,
      subject: "Paper Rejected",
      html: `
        <p>Hello ${paper.author.name},</p>
        <p>We regret to inform you that your paper titled <b>${paper.title}</b> has been rejected for the conference <b>${paper.conference.name}</b>.</p>
        <p>Thank you for your submission.</p>
      `,
    });

    req.flash("success", "Paper rejected and author notified.");
    res.redirect(`/admin/view-paper/${req.params.paperId}`);
  } catch (error) {
    console.error("Error rejecting paper:", error);
    req.flash("error", "Failed to reject paper.");
    res.redirect(`/admin/view-paper/${req.params.paperId}`);
  }
});

module.exports = router;