// server/controllers/aiController.js

const geminiService = require('../services/geminiService');

exports.analyzeContract = async (req, res) => {
    const { text, type, prompt } = req.body;

    if (!text) {
        return res.status(400).json({ success: false, message: 'Contract text is required for analysis.' });
    }

    let aiResult = '';
    try {
        if (type === 'summary') {
            aiResult = await geminiService.summarizeContract(text);
        } else if (type === 'clauses') {
            aiResult = await geminiService.extractKeyClauses(text);
        } else if (type === 'custom' && prompt) {
            aiResult = await geminiService.generateText(prompt + '\n\nContract Text:\n' + text);
        } else {
            return res.status(400).json({ success: false, message: 'Invalid analysis type or missing custom prompt.' });
        }

        res.status(200).json({ success: true, analysisResult: aiResult });

    } catch (error) {
        console.error('Error during AI analysis:', error);
        res.status(500).json({ success: false, message: 'Failed to perform AI analysis.', error: error.message });
    }
};
