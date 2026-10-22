export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, businessName, agentName } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on Vercel' });
  }

  try {
    const prompt = `You are ${agentName}, an AI receptionist for a business named "${businessName}". 
    Your job is to answer customer questions politely, professionally, and concisely, and help them with inquiries or booking.
    Customer says: "${message}"
    Please provide a helpful and natural response:`;

    // 呼叫 Google Gemini API (gemini-2.5-flash 或 gemini-1.5-flash)
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Thanks for reaching out! How can I assist you further?";

    return res.status(200).json({ reply });
  } catch (error) {
    console.error('Gemini API Error:', error);
    return res.status(500).json({ error: 'Failed to communicate with Gemini API' });
  }
}