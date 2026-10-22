export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, businessName, agentName, faqs } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on Vercel' });
  }

  try {
    // 整理知識庫規則作為 Context
    let kbContext = "";
    if (faqs && Array.isArray(faqs) && faqs.length > 0) {
      kbContext = "\nKnowledge Base Rules to refer to when answering:\n" + 
        faqs.map((f, i) => `${i + 1}. Q: ${f.question} -> A: ${f.answer}`).join("\n");
    }

    const prompt = `You are ${agentName || 'Alex'}, an AI receptionist for "${businessName || 'Turtle English'}".
Answer customer questions politely, professionally, and concisely in the same language the customer uses (English or Traditional Chinese).
${kbContext}

Task:
1. Provide a natural response to the customer based on the knowledge base rules if applicable.
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

    // 若擷取到訪客資訊，自動寫入 Supabase
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