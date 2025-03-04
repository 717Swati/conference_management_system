const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

// Ensure the uploads directory exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); // Use the absolute path
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

const upload = multer({ storage });

// ✅ Route to handle paper submission (upload)
router.post("/upload", upload.single("paperFile"), (req, res) => {
    if (!req.file) {
        return res.status(400).send("No file uploaded.");
    }

    console.log("✅ File uploaded successfully:", req.file.filename);
    res.send(`File uploaded successfully: ${req.file.filename}`);
});

// ✅ Route to serve files for downloading
router.get("/download/:filename", (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadDir, filename);

    console.log("📂 Download requested:", filePath);

    if (!fs.existsSync(filePath)) {
        console.error("❌ File not found:", filePath);
        return res.status(404).send("File not found.");
    }

    res.download(filePath, filename, (err) => {
        if (err) {
            console.error("❌ Error downloading file:", err);
            res.status(500).send("Error downloading file.");
        }
    });
});

module.exports = router;
