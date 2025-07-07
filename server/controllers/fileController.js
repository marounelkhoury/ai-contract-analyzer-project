// server/controllers/fileController.js

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const Contract = require('../models/Contract'); // ADD THIS LINE: Import the Contract model

// --- Multer Storage Configuration ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// --- Multer File Filter Configuration ---
const fileFilter = (req, file, cb) => {
    const allowedFileTypes = process.env.ALLOWED_FILE_TYPES ? process.env.ALLOWED_FILE_TYPES.split(',') : ['application/pdf'];

    if (allowedFileTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDFs are allowed.'), false);
    }
};

// --- Multer Upload Instance ---
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: process.env.MAX_FILE_SIZE ? parseInt(process.env.MAX_FILE_SIZE) : 10 * 1024 * 1024
    }
});

// --- Controller Function for Uploading a Single File and Extracting Text ---
exports.uploadFile = (req, res) => {
    upload.single('contract')(req, res, async (err) => {
        if (err) {
            if (err instanceof multer.MulterError) {
                return res.status(400).json({ success: false, message: `Multer error: ${err.message}` });
            } else if (err.message === 'Invalid file type. Only PDFs are allowed.') {
                return res.status(400).json({ success: false, message: err.message });
            } else {
                console.error('File upload error:', err);
                return res.status(500).json({ success: false, message: 'File upload failed due to an unexpected error.', error: err.message });
            }
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded.' });
        }

        const uploadedFileDetails = {
            filename: req.file.filename,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            path: req.file.path
        };

        let extractedText = '';

        try {
            const dataBuffer = fs.readFileSync(uploadedFileDetails.path);
            const data = await pdfParse(dataBuffer);
            extractedText = data.text;
            console.log('PDF text extracted successfully.');
        } catch (pdfError) {
            console.error('Error extracting text from PDF:', pdfError);
            return res.status(500).json({
                success: false,
                message: 'File uploaded, but text extraction failed.',
                file: uploadedFileDetails,
                error: pdfError.message
            });
        }

        // --- Save Contract Data to MongoDB ---
        try {
            const newContract = new Contract({
                filename: uploadedFileDetails.filename,
                originalname: uploadedFileDetails.originalname,
                mimetype: uploadedFileDetails.mimetype,
                size: uploadedFileDetails.size,
                path: uploadedFileDetails.path,
                extractedText: extractedText // Save the extracted text
            });

            const savedContract = await newContract.save();
            console.log('Contract metadata saved to DB:', savedContract.filename);

            // Respond with saved contract details and extracted text
            res.status(200).json({
                success: true,
                message: 'File uploaded and contract data saved successfully!',
                file: savedContract, // Return the saved contract object
                extractedText: extractedText
            });

        } catch (dbError) {
            console.error('Error saving contract to DB:', dbError);
            // If DB save fails, you might want to delete the uploaded file
            fs.unlink(uploadedFileDetails.path, (unlinkErr) => {
                if (unlinkErr) console.error('Error deleting file after DB save failure:', unlinkErr);
            });
            return res.status(500).json({
                success: false,
                message: 'File uploaded, but failed to save contract data to database.',
                error: dbError.message
            });
        }
    });
};
