import { verifyKey } from 'discord-interactions';
import fetch from 'node-fetch';

export const config = {
  api: {
    bodyParser: false,
  },
};

// 嚴格讀取原始 Buffer 資料流
async function getRawBodyBuffer(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rawBuffer = await getRawBodyBuffer(req);
    const signature = req.headers['x-signature-ed25519'];
    const timestamp = req.headers['x-signature-timestamp'];
    const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;

    // 1. 檢查有沒有設定 Public Key
    if (!PUBLIC_KEY) {
      console.error('Missing DISCORD_PUBLIC_KEY in environment variables.');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // 2. 嚴格進行 Discord 數位簽章驗證（使用 Buffer）
    const isValidRequest = verifyKey(rawBuffer, signature, timestamp, PUBLIC_KEY);
    if (!isValidRequest) {
      return res.status(401).send('Invalid request signature');
    }

    // 3. 解析 JSON 內容
    const body = JSON.parse(rawBuffer.toString('utf8'));

    // 4. 處理 Discord PING (Type 1) 驗證
    if (body && body.type === 1) {
      return res.status(200).json({ type: 1 });
    }

    // 5. 處理斜線指令 (Type 2: /deploy)
    if (body && body.type === 2) {
      const commandName = body.data?.name;

      if (commandName === 'deploy') {
        const options = body.data.options || [];
        const businessName = options.find(o => o.name === 'name')?.value || 'Client Business';
        const businessType = options.find(o => o.name === 'type')?.value || 'General';

        const VAPI_PRIVATE_API_KEY = process.env.VAPI_PRIVATE_API_KEY;

        const vapiResponse = await fetch('https://api.vapi.ai/assistant', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${VAPI_PRIVATE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: `${businessName} (Discord Deployed)`,
            model: {
              provider: "openai",
              model: "gpt-4o",
              messages: [
                {
                  role: "system",
                  content: `You are a professional AI receptionist for ${businessName}, specialized in ${businessType}. Greet callers politely and handle inquiries.`
                }
              ]
            },
            voice: {
              provider: "elevenlabs",
              voiceId: "rachel"
            }
          })
        });

        const vapiData = await vapiResponse.json();

        if (!vapiResponse.ok) {
          throw new Error(vapiData.message || 'Vapi API error');
        }

        return res.status(200).json({
          type: 4,
          data: {
            content: `✨ **AI Receptionist Deployed Successfully!**\n- **Business:** ${businessName}\n- **Type:** ${businessType}\n- **Assistant ID:** \`${vapiData.id}\``
          }
        });
      }
    }

    return res.status(400).json({ error: 'Unknown interaction' });

  } catch (error) {
    console.error('Interaction error:', error);
    return res.status(500).json({ error: error.message });
  }
}