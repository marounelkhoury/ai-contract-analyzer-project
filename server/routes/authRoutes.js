// server/routes/authRoutes.js

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Route for user registration
router.post('/register', authController.registerUser);

// Route for generating a custom token for an existing user (conceptual login via backend)
// As discussed, client-side Firebase Auth will handle direct email/password login.
router.post('/login', authController.loginUser); // This endpoint is less critical for typical client-side email/password auth

module.exports = router;
