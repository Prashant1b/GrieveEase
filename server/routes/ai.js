const router = require('express').Router();
const { analyzeComplaint } = require('../services/claudeAI');

router.post('/analyze', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || text.trim().length < 10) {
      return res.status(400).json({ error: 'Complaint text too short' });
    }
    const result = await analyzeComplaint(text);
    res.json(result);
  } catch (err) {
    console.error('AI analyze error:', err);
    res.status(500).json({ error: 'AI analysis failed' });
  }
});

module.exports = router;
