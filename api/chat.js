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
    // 提示詞：要求 Gemini 同時輸出回答與擷取的訪客資訊 (JSON 格式)
    const prompt = `You are ${agentName}, an AI receptionist for "${businessName}".
Answer customer questions politely, professionally, and concisely in the same language the customer uses (English or Traditional Chinese).

Task:
1. Provide a natural response to the customer.
2. Check if the customer shared any contact information (name, phone number, or intent/service interest) in their message or conversation.
3. Output your response in STRICT JSON format with two keys:
   - "reply": (string) Your response to the customer.
   - "lead": (object or null) If name or phone is mentioned, extract them into {"name": "...", "phone": "...", "intent": "..."}. Otherwise, return null.

Customer says: "${message}"`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    
    let parsedResult = { reply: "Thanks for reaching out! How can I assist you further?", lead: null };
    try {
      parsedResult = JSON.parse(rawText);
    } catch (e) {
      parsedResult.reply = rawText;
    }

    // 如果 Gemini 偵測到訪客留下聯絡資訊，自動寫入 Supabase
    if (parsedResult.lead && (parsedResult.lead.name || parsedResult.lead.phone)) {
      const SUPABASE_URL = 'https://soemujvvjnscchzncceo.supabase.co';
      const SUPABASE_ANON_KEY = 'sb_publishable_LtLxBrGCr3sDmJ9pNXnZgQ_lsRSJI2R';

      await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          name: parsedResult.lead.name || 'Anonymous',
          phone: parsedResult.lead.phone || 'N/A',
          intent: parsedResult.lead.intent || 'General Inquiry',
          status: 'New Lead'
        })
      });
    }

    return res.status(200).json({ reply: parsedResult.reply });
  } catch (error) {
    console.error('Gemini API Error:', error);
    return res.status(500).json({ error: 'Failed to communicate with Gemini API' });
  }
}