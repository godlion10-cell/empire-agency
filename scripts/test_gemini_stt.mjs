import { GoogleGenAI } from '@google/genai';

const apiKey = 'AIzaSyBQORGSKf8a0vYbpC1qtUPBCsosnI4D-tE';
const genAI = new GoogleGenAI({ apiKey });

async function test() {
  // Try different model names
  const models = ['gemini-2.5-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash', 'gemini-pro'];
  
  for (const model of models) {
    console.log(`\n--- Testing model: ${model} ---`);
    try {
      const response = await genAI.models.generateContent({
        model,
        contents: [{ parts: [{ text: 'Reply with exactly: OK' }] }],
        config: { temperature: 0.1 },
      });
      const text = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text;
      console.log(`  ✅ SUCCESS: ${text?.trim()}`);
    } catch (e) {
      const msg = e.message?.substring(0, 150);
      console.log(`  ❌ FAILED: ${msg}`);
    }
  }
}
test();
