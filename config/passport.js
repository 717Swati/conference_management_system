const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

passport.use(
  new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
    try {
      const user = await User.findOne({ email });
      console.log("🔍 Passport - Email:", email);
      console.log("🔍 Passport - Found User:", user);
      if (!user) {
        return done(null, false, { message: "Invalid Email or Password" });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      console.log("🔍 Passport - Password Match:", isMatch);
      if (!isMatch) {
        return done(null, false, { message: "Invalid Email or Password" });
      }

      return done(null, user);
    } catch (error) {
      console.error("❌ Passport Error:", error);
      return done(error);
    }
  })
);

passport.serializeUser((user, done) => {
  console.log("🔍 Passport - Serializing User ID:", user.id);
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    console.log("🔍 Passport - Deserialized User:", user);
    if (!user) return done(null, false);
    done(null, user);
  } catch (error) {
    console.error("❌ Deserialize Error:", error);
    done(error);
  }
});

module.exports = passport;