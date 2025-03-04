const express = require("express");
const path = require("path");
require("dotenv").config();
const connectDB = require("./config/db");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const passport = require("passport");
const flash = require("connect-flash");

require("./config/passport");

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const authorRoutes = require("./routes/authorRoutes");
const reviewerRoutes = require("./routes/reviewerRoutes");
const uploadRoutes = require("./routes/uploadRoutes");

const app = express();
app.set("view engine", "ejs");

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

connectDB();

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: { maxAge: 1000 * 60 * 60 * 24, httpOnly: true },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(flash());
app.use((req, res, next) => {
  // Ensure flash messages are strings or empty strings
  res.locals.success_msg = (req.flash("success_msg")[0] || "").toString().trim() || "";
  res.locals.error_msg = (req.flash("error_msg")[0] || "").toString().trim() || "";
  res.locals.error = (req.flash("error")[0] || "").toString().trim() || "";
  next();
});

// Routes
app.use("/", authRoutes);
app.use("/admin", adminRoutes);
app.use("/author", authorRoutes);
app.use("/reviewer", reviewerRoutes);
app.use("/files", uploadRoutes);
app.use(express.static("public"));
app.use(express.json());


app.get("/", (req, res) => res.render("index"));

app.get('/index', (req, res) => {
  res.render('index'); // Assuming your file is 'contact.ejs'
});

app.get('/contact', (req, res) => {
  res.render('contact'); // Assuming your file is 'contact.ejs'
});

// For sending feedback form to adimn
const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

app.post("/send-feedback", async (req, res) => {
  const { name, email, message } = req.body;
  console.log(email);

  try {
    await transporter.sendMail({
      from: `"${name} via YourWebsite" <swatimehta9065@gmail.com>`,  // ✅ Safe
      replyTo: email,  // ✅ Replies go to user

      to: process.env.EMAIL_USER, // ✅ Admin email (receiver)

      subject: "New Feedback Received",
      text: `Dear Admin,\n\nYou have received a new feedback from ${name}:\n\n"${message}"\n\nBest regards,\nYour Website`,
    });


    res.json({ success: true, message: "Feedback sent successfully!" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.json({ success: false, message: "Failed to send feedback." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));