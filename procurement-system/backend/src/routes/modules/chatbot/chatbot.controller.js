import prisma from '../../../config/db.js';
import { sendSuccess } from '../../../utils/response.js';
import { processQuery } from './chatbot.service.js';

export const query = async (req, res, next) => {
  try {
    const { message } = req.body;

    // Save user message
    await prisma.chatMessage.create({
      data: { userId: req.user.id, role: 'user', content: message },
    });

    // Process with AI/NLP
    const response = await processQuery(message, req.user);

    // Save assistant response
    await prisma.chatMessage.create({
      data: {
        userId: req.user.id,
        role: 'assistant',
        content: response.text,
        metadata: JSON.stringify(response.metadata || {}),
      },
    });

    return sendSuccess(res, response);
  } catch (error) { next(error); }
};

export const getHistory = async (req, res, next) => {
  try {
    const messages = await prisma.chatMessage.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    return sendSuccess(res, messages);
  } catch (error) { next(error); }
};
