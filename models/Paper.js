const mongoose = require("mongoose");

const PaperSchema = new mongoose.Schema({
  title: String,
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  conference: { type: mongoose.Schema.Types.ObjectId, ref: "Conference" },
  status: { type: String, default: "Pending" },
  reviewers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  confirmedReviewers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  rejectedReviewers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // New field for rejected reviewers
  filename: { type: String },
  abstract: { type: String },
  reviews: [{
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    comments: String,
    score: Number,
    date: Date
  }]
});

module.exports = mongoose.model("Paper", PaperSchema);