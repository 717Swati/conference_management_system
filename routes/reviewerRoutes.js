const express = require("express");
const router = express.Router();
const Paper = require("../models/Paper");
const { ensureAuthenticated, roleBasedAccess } = require("../middleware/authMiddleware");

// Reviewer Confirms or Rejects the Review Assignment
router.get("/confirm-review", async (req, res) => {
  const { paperId, reviewerId, response } = req.query;

  if (!paperId || !reviewerId || !response) {
    return res.status(400).send("Invalid request");
  }

  const paper = await Paper.findById(paperId);

  if (!paper) {
    return res.status(404).send("Paper not found");
  }

  if (response === "accept") {
    await Paper.findByIdAndUpdate(paperId, { $push: { confirmedReviewers: reviewerId } });
    res.send(`You have accepted the review request for "${paper.title}". Please log in to submit your review at: <a href="/login">Login Page</a>`);
  } else {
    await Paper.findByIdAndUpdate(paperId, { 
      $pull: { reviewers: reviewerId },
      $addToSet: { rejectedReviewers: reviewerId }
    });
    res.send("You have declined the review request.");
  }
});

// Reviewer Dashboard (Protected Route)
router.get("/dashboard", ensureAuthenticated, roleBasedAccess(["Reviewer"]), async (req, res) => {
  try {
    const papers = await Paper.find({ confirmedReviewers: req.user._id })
      .populate("author", "name email")
      .populate("conference", "name");
    res.render("reviewer_dashboard", { papers, reviewer: req.user });
  } catch (error) {
    console.error("Error fetching reviewer dashboard:", error);
    res.status(500).send("Server Error");
  }
});

// Submit Review (Comments and Score)
router.post("/submit-review/:paperId", ensureAuthenticated, roleBasedAccess(["Reviewer"]), async (req, res) => {
  const { comments, score } = req.body;
  const paperId = req.params.paperId;

  try {
    const paper = await Paper.findById(paperId);
    if (!paper || !paper.confirmedReviewers.includes(req.user._id)) {
      return res.status(403).send("You are not authorized to review this paper.");
    }

    paper.reviews = paper.reviews || [];
    paper.reviews.push({
      reviewer: req.user._id,
      comments,
      score: Number(score),
      date: new Date(),
    });

    await paper.save();
    req.flash("success_msg", "Review submitted successfully.");
    res.redirect("/reviewer/dashboard");
  } catch (error) {
    console.error("Error submitting review:", error);
    req.flash("error_msg", "Failed to submit review.");
    res.redirect("/reviewer/dashboard");
  }
});

module.exports = router;