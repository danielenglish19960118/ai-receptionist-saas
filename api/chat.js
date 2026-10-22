import { createClient } from '@supabase/supabase-js';

// 初始化 Supabase 客戶端
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// 定義 Gemini 的 Function Calling 工具規格 (供 AI 自動擷取預約與名單)
const tools = [
  {
    function_declarations: [
      {
        name: 'save_lead_and_appointment',
        description: '當訪客提供姓名、聯絡方式（Email 或電話）、預約日期或事項時，呼叫此函式儲存客戶資料與預約。',
        parameters: {
          type: 'OBJECT',
          properties: {
            name: { type: 'STRING', description: '訪客姓名或稱呼' },
            email: { type: 'STRING', description: '電子郵件地址' },
            phone: { type: 'STRING', description: '聯絡電話' },
            appointment_date: { type: 'STRING', description: '預約日期與時間 (例如：2026-11-01 14:00)' },
            notes: { type: 'STRING', description: '諮詢需求、備註或特殊事項' }
          },
          required: ['name']
        }
      }
    ]
  }
];

export default async function handler(req, res) {
  // 只允許 POST 請求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, clientId = 'turtle_english', history = [] } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    // ----------------------------------------------------
    // 1. 自動從 Supabase 讀取該客戶 (clientId) 的專屬提示詞
    // ----------------------------------------------------
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('system_prompt, client_name')
      .eq('client_id', clientId)
      .single();

    // 若查無該客戶設定，則退回預設提示詞
    const systemInstruction = clientData?.system_prompt || `你現在是 AI 預約客服專員。語氣禮貌專業，負責解答疑問並引導訪客留下姓名、聯絡方式與預約時間。`;

    // ----------------------------------------------------
    // 2. 呼叫 Gemini 1.5 Flash API (帶入 System Prompt 與 Tools)
    // ----------------------------------------------------
    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const payload = {
      system_instruction: {
        parts: [{ text: systemInstruction }]
      },
      tools: tools,
      contents: [
        ...history,
        { role: 'user', parts: [{ text: message }] }
      ]
    };

    const response = await fetch(geminiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.error) {
      console.error('Gemini API Error:', data.error);
      return res.status(500).json({ error: data.error.message || 'Gemini API Error' });
    }

    const candidate = data.candidates?.[0];
    const firstPart = candidate?.content?.parts?.[0];

    // ----------------------------------------------------
    // 3. 檢查 AI 是否觸發了 Function Call (自動寫入 Supabase)
    // ----------------------------------------------------
    if (firstPart && firstPart.functionCall) {
      const { name: functionName, args } = firstPart.functionCall;

      if (functionName === 'save_lead_and_appointment') {
        const { name, email, phone, appointment_date, notes } = args;

        // A. 寫入 leads 資料表 (附帶 client_id)
        const { data: leadData, error: leadError } = await supabase
          .from('leads')
          .insert([
            {
              client_id: clientId,
              name: name || '未提供姓名',
              email: email || null,
              phone: phone || null,
              notes: notes || null
            }
          ])
          .select()
          .single();

        if (leadError) console.error('Supabase Lead Insert Error:', leadError);

        // B. 若有提供預約時間，同步寫入 appointments 資料表
        if (appointment_date) {
          const { error: aptError } = await supabase
            .from('appointments')
            .insert([
              {
                client_id: clientId,
                lead_id: leadData?.id || null,
                appointment_date: appointment_date,
                status: 'pending',
                notes: notes || null
              }
            ]);

          if (aptError) console.error('Supabase Appointment Insert Error:', aptError);
        }

        // C. 回覆訪客預約成功的訊息
        const confirmMessage = `感謝您，${name}！已為您登記預約資料${appointment_date ? `（時間：${appointment_date}）` : ''}。我們的專人會儘快透過電話或 Email 與您確認！`;
        return res.status(200).json({ reply: confirmMessage });
      }
    }

    // ----------------------------------------------------
    // 4. 一般對話，直接回傳 AI 回覆文字
    // ----------------------------------------------------
    const replyText = firstPart?.text || '抱歉，我現在無法回答這個問題，請稍後再試。';
    return res.status(200).json({ reply: replyText });

  } catch (error) {
    console.error('Server Handler Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}