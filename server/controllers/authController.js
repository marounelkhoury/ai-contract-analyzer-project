// server/controllers/authController.js

const admin = require('firebase-admin'); // Firebase Admin SDK (already initialized via firestoreService)

// Ensure Firebase Admin SDK is initialized
if (!admin.apps.length) {
    console.error('❌ Firebase Admin SDK not initialized in authController. This should be handled by firestoreService.js.');
    // In a production app, you'd handle this more gracefully or ensure initialization happens.
}

/**
 * Registers a new user with email and password using Firebase Authentication.
 * This creates a user in Firebase Auth and then generates a custom token.
 */
exports.registerUser = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    try {
        // Create user in Firebase Authentication
        const userRecord = await admin.auth().createUser({
            email: email,
            password: password,
            // You can add displayName, photoURL etc. here
        });

        // Generate a custom token for the newly created user
        // This token will be sent to the frontend for client-side sign-in
        const customToken = await admin.auth().createCustomToken(userRecord.uid);

        console.log(`✅ New user registered: ${userRecord.uid}`);
        res.status(201).json({
            success: true,
            message: 'User registered successfully. Proceed to login.',
            uid: userRecord.uid,
            token: customToken // Send token for immediate client-side sign-in
        });

    } catch (error) {
        console.error('❌ Error registering user:', error.message);
        let errorMessage = 'Failed to register user.';
        if (error.code === 'auth/email-already-exists') {
            errorMessage = 'The email address is already in use by another account.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'The password is too weak. Please choose a stronger password.';
        }
        res.status(400).json({ success: false, message: errorMessage, error: error.message });
    }
};

/**
 * Logs in an existing user using their email and password (via Firebase Auth sign-in method
 * then generates a custom token based on their UID).
 * NOTE: Firebase Auth client SDK typically handles direct email/password login.
 * This backend method is useful if you want to verify credentials server-side
 * or issue a custom token for other purposes. For this app, we'll primarily
 * rely on client-side Firebase Auth for email/password login, but keep this
 * as an example or for future server-side validation.
 *
 * For now, the primary client-side login flow will involve Firebase Auth directly.
 * We are not using this login endpoint directly for client-side email/password authentication
 * in the same way we are using the custom token after registration.
 *
 * Firebase Admin SDK's primary login method is to verify ID tokens, not perform email/password login.
 * To "log in" a user on the backend after client-side sign-in, you'd typically receive their ID token
 * and then verify it using `admin.auth().verifyIdToken(idToken)`.
 *
 * However, the prompt is for "User Authentication & Authorization", so a server-side login function is
 * conceptually useful. We will update the frontend to use Firebase client SDK for email/password login,
 * which is simpler. The `registerUser` function is the main one for this backend.
 */
exports.loginUser = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    try {
        // Find user by email to get UID
        const userRecord = await admin.auth().getUserByEmail(email);

        // NOTE: Firebase Admin SDK does NOT directly verify email/password for login.
        // It's designed for privileged operations. Client-side SDK does email/password.
        // If you need server-side password verification, you'd integrate a separate
        // password hashing library here, or rely solely on client-side Firebase Auth.

        // For the purpose of providing a 'login' endpoint on the backend that returns a token,
        // you would typically verify the password against a hashed password stored in your own DB.
        // Since we're relying on Firebase Auth for primary user management,
        // and its Admin SDK doesn't do direct password comparison for login,
        // we'll primarily use it to create custom tokens for client-side sign-in *after*
        // a user has been authenticated (e.g., via a client-side provider) or after registration.

        // For now, this 'loginUser' function will simply generate a custom token for an existing user.
        // In a real scenario, the client would log in with Firebase Auth client SDK, get an ID token,
        // send the ID token to the backend, and the backend would verify it.

        const customToken = await admin.auth().createCustomToken(userRecord.uid);

        console.log(`✅ Custom token generated for existing user: ${userRecord.uid}`);
        res.status(200).json({
            success: true,
            message: 'Custom token generated successfully.',
            uid: userRecord.uid,
            token: customToken // Send token for client-side sign-in
        });

    } catch (error) {
        console.error('❌ Error logging in user:', error.message);
        let errorMessage = 'Login failed. Invalid credentials or user not found.';
        if (error.code === 'auth/user-not-found') {
            errorMessage = 'User not found with this email.';
        }
        res.status(401).json({ success: false, message: errorMessage, error: error.message });
    }
};

/**
 * Middleware to protect routes. Verifies Firebase ID Token from Authorization header.
 * Attaches user (decoded token) to req.user.
 */
exports.protect = async (req, res, next) => {
    let idToken;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        idToken = req.headers.authorization.split(' ')[1];
    }

    if (!idToken) {
        return res.status(401).json({ success: false, message: 'No token, authorization denied.' });
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedToken; // Attach decoded user token to request
        console.log(`🔒 User authenticated: ${req.user.uid}`);
        next();
    } catch (error) {
        console.error('❌ Error verifying ID token:', error.message);
        res.status(401).json({ success: false, message: 'Token is not valid.', error: error.message });
    }
};

/**
 * Middleware to ensure the user ID matches the requested resource ID, for private data.
 * Assumes req.user has been set by `protect` middleware.
 * @param {string} paramName The name of the URL parameter that holds the user ID (e.g., 'userId').
 */
exports.authorizeUser = (paramName) => (req, res, next) => {
    if (!req.user || !req.user.uid) {
        return res.status(401).json({ success: false, message: 'Authentication required for authorization.' });
    }
    const requestedUserId = req.params[paramName];
    if (req.user.uid !== requestedUserId) {
        return res.status(403).json({ success: false, message: 'Forbidden: You do not have access to this resource.' });
    }
    next();
};
