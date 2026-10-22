export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, businessName, agentName, faqs, languageMode } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on Vercel' });
  }

  try {
    let kbContext = "";
    if (faqs && Array.isArray(faqs) && faqs.length > 0) {
      kbContext = "\nKnowledge Base & Service Offerings:\n" + 
        faqs.map((f, i) => `${i + 1}. Q: ${f.question} -> A: ${f.answer}`).join("\n");
    }

    const langInstruction = languageMode === 'english' 
      ? 'Respond strictly in English.' 
      : languageMode === 'chinese' 
      ? 'Respond strictly in Traditional Chinese.' 
      : 'Respond naturally in the language used by the user (Bilingual in English and Traditional Chinese).';

    const prompt = `You are ${agentName || 'Alex'}, an articulate and empathetic AI receptionist for "${businessName || 'Turtle English'}".

Core Business Focus of Turtle English:
1. Global Online Corporate English Training (跨國線上企業英文內訓): Tailored business communications, executive presentation, etymological insights for cross-cultural leadership, and professional writing for international organizations.
2. Literature Appreciation & Literary Healing (文學鑑賞與文學療癒): Self-paced and guided classic literary exploration, etymology-driven mindful reading, and restorative language learning sessions for working professionals.

Tone & Style: Elegant, empathetic, professional, inspiring, and soothing.

${langInstruction}
${kbContext}

Task:
1. Provide a warm, concise, and helpful response aligned with Turtle English's dual core services.
2. Analyze if the caller provided contact information (name, phone, company, email, interest) OR requested a trial session/corporate consultation (date, time).
3. Tag lead quality: "HIGH" (Corporate training inquiry or literature trial booking), "MEDIUM" (General course question), "LOW" (Casual chat).
4. Output STRICT JSON format with these exact keys:
   - "reply": (string) Your response text.
   - "lead": (object or null) {"name": "...", "phone": "...", "intent": "Corporate Training | Literature Healing | General", "tag": "HIGH|MEDIUM|LOW"} or null.
   - "booking": (object or null) {"name": "...", "phone": "...", "date": "YYYY-MM-DD", "time": "HH:MM", "service": "Corporate Training Consultation | Literary Healing Trial"} or null.

User Message: "${message}"`;

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
    
    let parsedResult = { reply: "Thank you for reaching out to Turtle English!", lead: null, booking: null };
    try {
      parsedResult = JSON.parse(rawText);
    } catch (e) {
      parsedResult.reply = rawText;
    }

    const SUPABASE_URL = 'https://soemujvvjnscchzncceo.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_LtLxBrGCr3sDmJ9pNXnZgQ_lsRSJI2R';

    // 自動寫入名單資料庫
    if (parsedResult.lead && (parsedResult.lead.name || parsedResult.lead.phone)) {
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
          intent: parsedResult.lead.intent || 'Corporate/Literature Inquiry',
          status: parsedResult.lead.tag || 'HIGH'
        })
      });
    }

    // 自動寫入預約資料庫
    if (parsedResult.booking && (parsedResult.booking.date || parsedResult.booking.time)) {
      await fetch(`${SUPABASE_URL}/rest/v1/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          name: parsedResult.booking.name || parsedResult.lead?.name || 'Anonymous',
          phone: parsedResult.booking.phone || parsedResult.lead?.phone || 'N/A',
          booking_date: parsedResult.booking.date,
          booking_time: parsedResult.booking.time,
          service: parsedResult.booking.service || 'Corporate/Literature Consultation'
        })
      });
    }

    return res.status(200).json({ reply: parsedResult.reply, booking: parsedResult.booking });
  } catch (error) {
    console.error('Gemini API Error:', error);
    return res.status(500).json({ error: 'Failed to communicate with Gemini API' });
  }
}