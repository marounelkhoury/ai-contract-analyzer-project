// server/controllers/contractController.js

const Contract = require('../models/Contract');
const mongoose = require('mongoose'); // ADD THIS LINE to import mongoose for ObjectId validation

/**
 * Gets a list of all saved contracts.
 */
exports.getAllContracts = async (req, res) => {
    try {
        const contracts = await Contract.find({}, '_id originalname uploadDate filename').sort({ uploadDate: -1 });
        res.status(200).json({ success: true, contracts });
    } catch (error) {
        console.error('Error fetching all contracts:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve contracts.', error: error.message });
    }
};

/**
 * Gets details of a single contract by its ID.
 */
exports.getContractById = async (req, res) => {
    try {
        const { id } = req.params;

        // NEW: Validate if the provided ID is a valid MongoDB ObjectId format
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid contract ID format.' });
        }

        const contract = await Contract.findById(id);

        if (!contract) {
            return res.status(404).json({ success: false, message: 'Contract not found.' });
        }

        res.status(200).json({ success: true, contract });
    } catch (error) {
        console.error('Error fetching contract by ID:', error);
        // Specifically catch CastError if it's still somehow not caught by isValidObjectId
        if (error.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid contract ID provided.' });
        }
        res.status(500).json({ success: false, message: 'Failed to retrieve contract details.', error: error.message });
    }
};
