const mongoose = require("mongoose");
const connectDB = require("./config/db");
const User = require("./models/User"); // Adjust path if needed
const bcrypt = require("bcrypt");

connectDB();

const seedReviewers = async () => {
  try {
    console.log("🔹 Connecting to MongoDB...");

    // Create reviewers
    const reviewers = [
      {
        name: "Swati Mehta",
        email: "21052717@kiit.ac.in",
        password: await bcrypt.hash("password123", 10),
        role: "Reviewer",
      },
      {
        name: "Prakhar Parth",
        email: "raviparth88@gmail.com",
        password: await bcrypt.hash("password123", 10),
        role: "Reviewer",
      },
      {
        name: "Riya Chanda",
        email: "21052711@kiit.ac.in",
        password: await bcrypt.hash("password123", 10),
        role: "Reviewer",
      },
      {
        name: "Ankit Kumar",
        email: "21052565@kiit.ac.in",
        password: await bcrypt.hash("password123", 10),
        role: "Reviewer",
      },
    ];

    console.log("🔹 Inserting reviewers into database...");
    await User.insertMany(reviewers);
    console.log("✅ Reviewers successfully seeded!");

    mongoose.connection.close();
    console.log("🔹 Connection closed.");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    mongoose.connection.close();
  }
};

seedReviewers();
