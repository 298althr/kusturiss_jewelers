const express = require('express');
const aiService = require('../services/aiService');
const auth = require('../middleware/auth');
const router = express.Router();

/**
 * @route POST /api/ai/generate-content
 * @desc Generate product description and image prompt
 */
router.post('/generate-content', auth.authenticateAdmin, async (req, res) => {
    try {
        const { productName, material } = req.body;

        if (!productName || !material) {
            return res.status(400).json({ error: 'Product name and material are required' });
        }

        const description = await aiService.generateDescription(productName, material);
        const imagePrompt = await aiService.generateImagePrompt(productName, material);

        res.json({
            success: true,
            description,
            imagePrompt
        });
    } catch (error) {
        console.error('AI generation error:', error);
        res.status(500).json({ error: 'Failed to generate content' });
    }
});

module.exports = router;
