const express = require("express");
const passport = require("passport");
const User = require("../models/User");

const router = express.Router();

// Show Registration Page
router.get("/register", (req, res) => {
  res.render("register", { messages: req.flash() });
});

// Register Route (POST)
router.post("/register", async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) {
      req.flash("error", "Email already registered");
      return res.redirect("/register");
    }

    const formattedRole = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
    if (!["Admin", "Author"].includes(formattedRole)) {
      req.flash("error", "Invalid role selected");
      return res.redirect("/register");
    }

    user = new User({ name, email, password, role: formattedRole });
    await user.save();

    req.flash("success_msg", "Registration successful! You can now log in.");
    res.render("register", { messages: req.flash() }); // Render the same register page with the success message
  } catch (err) {
    console.error("❌ Registration Error:", err);
    req.flash("error", "Registration failed. Please try again.");
    res.redirect("/register");
  }
});


// Show Login Page (always render, even if authenticated)
// Show Login Page
router.get("/login", (req, res) => {
  console.log("🔍 /login GET - Is Authenticated:", req.isAuthenticated(), "User:", req.user);
  if (req.isAuthenticated()) {
    const role = req.user.role.toLowerCase();
    if (role === "admin") {
      return res.redirect("/admin/dashboard");
    } else if (role === "author") {
      return res.redirect("/author/dashboard");
    } else if (role === "reviewer") {
      return res.redirect("/reviewer/dashboard");
    }
  }
  res.render("login", {
    messages: req.flash(),
    isAuthenticated: req.isAuthenticated(),
    user: req.user
  });
});

// Login Route (POST)
router.post("/login", (req, res, next) => {
  const { email, password } = req.body;
  console.log("🔍 /login POST - Email:", email, "Password:", password ? "Provided" : "Not Provided");

  if (!email || !password) {
    req.flash("error", "Please provide both email and password.");
    return res.redirect("/login");
  }

  // Log out existing user before new login attempt
  if (req.isAuthenticated()) {
    req.logout((err) => {
      if (err) {
        console.error("❌ Logout Error during login:", err);
        return next(err);
      }
      proceedWithLogin(req, res, next);
    });
  } else {
    proceedWithLogin(req, res, next);
  }
});

// Helper function to handle authentication
function proceedWithLogin(req, res, next) {
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  })(req, res, () => {
    console.log("🔍 /login POST - Authenticated User:", {
      email: req.user.email,
      role: req.user.role,
      session: req.session
    });
    const role = req.user.role.toLowerCase();
    console.log("🔍 /login POST - Role (lowercase):", role);
    if (role === "admin") {
      return res.redirect("/admin/dashboard");
    } else if (role === "author") {
      return res.redirect("/author/dashboard");
    } else if (role === "reviewer") {
      return res.redirect("/reviewer/dashboard");
    } else {
      return res.redirect("/");
    }
  });
}

// Logout Route
router.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      console.error("❌ Logout Error:", err);
      return next(err);
    }
    req.flash("success_msg", "You are logged out");
    req.session.destroy((err) => {
      if (err) {
        console.error("❌ Session Destroy Error:", err);
        return next(err);
      }
      res.clearCookie("connect.sid");
      console.log("🔍 /logout - Session destroyed, redirecting to /login");
      res.redirect("/login");
    });
  });
});

module.exports = router;