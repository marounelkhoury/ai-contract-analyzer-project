// server/routes/contractRoutes.js

const express = require('express');
const router = express.Router();
const contractController = require('../controllers/contractController');

// Route to get a list of all contracts
router.get('/', contractController.getAllContracts);

// Route to get details of a specific contract by ID
router.get('/:id', contractController.getContractById);

module.exports = router;
