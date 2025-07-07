// server/routes/aiRoutes.js

const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// Define a POST route for AI analysis.
// When a POST request comes to /api/ai/analyze, it will call the analyzeContract function
router.post('/analyze', aiController.analyzeContract);

module.exports = router;
