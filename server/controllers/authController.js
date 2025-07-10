// server/controllers/authController.js

const admin = require('firebase-admin'); // Firebase Admin SDK (already initialized via firestoreService)

// Ensure Firebase Admin SDK is initialized
if (!admin.apps.length) {
    console.error('❌ Firebase Admin SDK not initialized in authController. This should be handled by firestoreService.js.');
    // In a production app, you'd handle this more gracefully or ensure initialization happens.
}

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
        });

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


exports.loginUser = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    try {
        // Find user by email to get UID
        const userRecord = await admin.auth().getUserByEmail(email);

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
