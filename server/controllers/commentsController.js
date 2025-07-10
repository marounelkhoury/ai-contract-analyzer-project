// server/controllers/commentsController.js

const firestoreService = require('../services/firestoreService'); // Import firestoreService

/**
 * Gets all comments for a specific contract.
 */
exports.getCommentsForContract = async (req, res) => {
    const { contractId } = req.params;

    if (!contractId) {
        return res.status(400).json({ success: false, message: 'Contract ID is required.' });
    }

    try {
        const comments = await firestoreService.getComments(contractId);
        res.status(200).json({ success: true, comments });
    } catch (error) {
        console.error('Error fetching comments for contract:', contractId, error);
        res.status(500).json({ success: false, message: 'Failed to retrieve comments.', error: error.message });
    }
};

