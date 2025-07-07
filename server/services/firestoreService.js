// server/services/firestoreService.js

const admin = require('firebase-admin');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') }); // Load .env for FIREBASE_PROJECT_ID

// Ensure you have downloaded your Firebase service account key and placed it in the server directory
const serviceAccountFileName = 'firebase-service-account.json'; // Ensure this matches your file name
const serviceAccountPath = path.resolve(__dirname, '../', serviceAccountFileName);

console.log('\n--- Firebase Admin SDK Initialization Debugging ---');
console.log('Attempting to initialize Firebase Admin SDK...');
console.log('Service Account Path being checked:', serviceAccountPath);
console.log('FIREBASE_PROJECT_ID from .env:', process.env.FIREBASE_PROJECT_ID);


let serviceAccountConfig;
try {
    // Attempt to require the service account JSON
    serviceAccountConfig = require(serviceAccountPath);
    console.log('✅ Service Account JSON file loaded successfully from:', serviceAccountPath);
    console.log('Service Account JSON Project ID:', serviceAccountConfig.project_id); // Log project_id from JSON
} catch (error) {
    console.error('❌ ERROR: Firebase service account file not found or is invalid:', serviceAccountPath);
    console.error('Details:', error.message);
    if (error.code === 'MODULE_NOT_FOUND') {
        console.error('HINT: Check if the file exists at the specified path and the filename is correct.');
    } else if (error instanceof SyntaxError) {
        console.error('HINT: The JSON file might be malformed. Check for syntax errors.');
    }
    // DO NOT process.exit(1) yet, let it continue to see if something else breaks
}

// Initialize Firebase Admin SDK
if (serviceAccountConfig && !admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccountConfig),
            projectId: process.env.FIREBASE_PROJECT_ID // Get project ID from .env
        });
        console.log('✅ Firebase Admin SDK initialized successfully with project ID from .env!');
    } catch (error) {
        console.error('❌ ERROR: Failed to initialize Firebase Admin SDK:', error.message);
        console.error('Details:', error); // Log full error object
        if (error.code === 'app/duplicate-app') {
             console.error('HINT: Firebase app might be initialized multiple times. Check for redundant init calls.');
        } else if (error.code === 'app/no-options') {
             console.error('HINT: Missing or invalid configuration options for Firebase Admin SDK.');
        }
        // This is where "There is no configuration corresponding to the provided identifier" usually shows up
    }
} else if (admin.apps.length) {
    console.log('⚠️ Firebase Admin SDK already initialized. Skipping redundant initialization.');
} else {
    console.warn('⚠️ Firebase Admin SDK initialization skipped due to missing service account config.');
}
console.log('--- End Firebase Admin SDK Initialization Debugging ---\n');


const db = admin.firestore(); // This line will throw if admin.apps.length is 0

// ... rest of your firestoreService.js (addComment, getComments, module.exports)


/**
 * Adds a new comment to Firestore.
 * IMPORTANT: After adding, we fetch the document immediately to get the server-generated timestamp
 * in its correct format, which is crucial for consistency.
 * @param {string} contractId The ID of the contract the comment belongs to.
 * @param {string} userId The ID of the user who made the comment.
 * @param {string} userName The name of the user who made the comment.
 * @param {string} text The comment text.
 * @param {string} [highlightedText=''] The text that was highlighted (optional).
 * @param {string} [selectionRange=''] The range of the selection (optional).
 * @returns {Promise<Object>} The added comment document data with resolved timestamp.
 */
async function addComment(contractId, userId, userName, text, highlightedText = '', selectionRange = '') {
    try {
        const commentData = {
            contractId,
            userId,
            userName,
            text,
            highlightedText,
            selectionRange,
            timestamp: admin.firestore.FieldValue.serverTimestamp() // Use server timestamp placeholder
        };

        const docRef = await db.collection('comments').add(commentData);
        
        // NEW: Fetch the document immediately after adding to get the actual server-generated timestamp
        const savedDoc = await docRef.get();
        const fullComment = { id: savedDoc.id, ...savedDoc.data() };

        console.log('Comment added with ID and full data:', fullComment);
        return fullComment; // Return the full document data with resolved timestamp
    } catch (error) {
        console.error('Error adding comment to Firestore:', error);
        throw new Error('Failed to add comment to database.');
    }
}

/**
 * Gets all comments for a specific contract from Firestore.
 * @param {string} contractId The ID of the contract to retrieve comments for.
 * @returns {Promise<Array<Object>>} An array of comment documents.
 */
async function getComments(contractId) {
    try {
        const commentsRef = db.collection('comments');
        const querySnapshot = await commentsRef
            .where('contractId', '==', contractId)
            .orderBy('timestamp', 'asc')
            .get();

        const comments = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        return comments;
    } catch (error) {
        console.error('Error getting comments from Firestore:', error);
        throw new Error('Failed to retrieve comments from database.');
    }
}

module.exports = {
    addComment,
    getComments,
    db
};
