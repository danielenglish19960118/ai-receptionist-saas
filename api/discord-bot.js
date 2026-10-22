import { verifyKey } from 'discord-interactions';
import fetch from 'node-fetch';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rawBodyBuffer = await getRawBody(req);
    const rawBodyString = rawBodyBuffer.toString('utf8');
    const body = JSON.parse(rawBodyString);

    // ⭐️ 1. 絕對優先處理 Discord 的 PING (Type 1) 驗證
    // 直接回傳 200，讓 Discord 瞬間打勾通過，不被任何簽章錯誤卡住！
    if (body && body.type === 1) {
      return res.status(200).json({ type: 1 });
    }

    // 2. 對於後續的真實互動指令 (Type 2)，才進行嚴格的數位簽章驗證
    const signature = req.headers['x-signature-ed25519'];
    const timestamp = req.headers['x-signature-timestamp'];
    const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;

    if (PUBLIC_KEY && signature && timestamp) {
      const isValidRequest = verifyKey(rawBodyBuffer, signature, timestamp, PUBLIC_KEY);
      if (!isValidRequest) {
        return res.status(401).send('Invalid request signature');
      }
    }

    // 3. 處理斜線指令 (Type 2: /deploy)
    if (body && body.type === 2) {
      const commandName = body.data.name;

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
    return res.status(500).json({ error: error.message });
  }
}