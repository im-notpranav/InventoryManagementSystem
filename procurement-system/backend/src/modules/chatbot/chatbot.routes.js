const express = require('express');
const router = express.Router();

const prisma = require('../../config/db');
const { requireAuth, requireRole } = require('../../middleware/auth.middleware');
const { processMessage } = require('./chatbot.engine');

// GET /api/chatbot/status
router.get('/status', (req, res) => {
  return res.json({
    success: true,
    data: { ready: true, type: 'custom' },
  });
});

// POST /api/chatbot/message
router.post('/message', requireAuth, requireRole('Admin', 'Department User'), async (req, res) => {
  try {
    const { message } = req.body || {};
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message must be a non-empty string',
      });
    }

    const result = await processMessage({
      prisma,
      message: message.trim(),
      userId: req.user?.user_id,
      userRole: req.user?.role,
      userName: req.user?.name,
      userDept: req.user?.department,
    });

    return res.json({
      success: true,
      data: {
        reply: result.text,
        suggestions: Array.isArray(result.suggestions) ? result.suggestions.slice(0, 4) : [],
        action_result: result.actionResult || null,
        intent: result.intent,
      },
    });
  } catch (err) {
    console.error('[CHATBOT ENGINE ERROR]', err.message);
    return res.status(500).json({
      success: false,
      message: 'InventBot encountered an error. Please try again.',
    });
  }
});

module.exports = router;
