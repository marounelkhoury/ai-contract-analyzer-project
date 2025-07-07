// server/routes/fileRoutes.js

const express = require('express');
const router = express.Router(); // Create a new router instance
const fileController = require('../controllers/fileController');

// Define a POST route for file uploads.
// When a POST request comes to /api/files/upload, it will call the uploadFile function
// from our fileController.
router.post('/upload', fileController.uploadFile);

// You can add more file-related routes here in the future, e.g., for downloading files

module.exports = router; // Export the router so it can be used in server.js
