import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

async function run() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: 'You are a helpful assistant'
    });
    
    const contents = [
      { role: 'user', parts: [{ text: 'hello' }] }
    ];
    
    const result = await model.generateContent({ contents });
    console.log("Success:", result.response.text());
  } catch (err) {
    console.error("Error:", err.message);
    if (err.stack) console.error(err.stack);
  }
}

run();
