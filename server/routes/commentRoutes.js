// server/routes/commentRoutes.js

const express = require('express');
const router = express.Router();
const commentsController = require('../controllers/commentsController'); // ADD THIS LINE

// Route to get all comments for a specific contract
// This replaces the inline logic previously here.
router.get('/:contractId', commentsController.getCommentsForContract);

module.exports = router;
