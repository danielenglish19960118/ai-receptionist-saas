import { verifyKey } from 'discord-interactions';
import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. 取得 Discord 傳遞過來的安全簽章 Header
  const signature = req.headers['x-signature-ed25519'];
  const timestamp = req.headers['x-signature-timestamp'];
  
  // 為了安全驗證，我們需要讀取原始的 body 字串
  // 注意：Vercel 預設會自動解析 JSON，如果 req.body 已經是物件，我們把它轉回字串來驗證
  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

  // 2. 從 Discord Developer Portal 取得的 Public Key (需要去填入 Vercel 環境變數 DISCORD_PUBLIC_KEY)
  const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;

  if (PUBLIC_KEY && signature && timestamp) {
    const isValidRequest = verifyKey(rawBody, signature, timestamp, PUBLIC_KEY);
    if (!isValidRequest) {
      return res.status(401).send('Bad request signature');
    }
  }

  // 3. 解析 body
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

  // 4. 處理 Discord 的 PING (Type 1)
  if (body && body.type === 1) {
    return res.status(200).json({ type: 1 });
  }

  // 5. 處理斜線指令 (Type 2)
  if (body && body.type === 2) {
    const commandName = body.data.name;

    if (commandName === 'deploy') {
      const options = body.data.options || [];
      const businessName = options.find(o => o.name === 'name')?.value || 'Client Business';
      const businessType = options.find(o => o.name === 'type')?.value || 'General';

      try {
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

      } catch (error) {
        return res.status(200).json({
          type: 4,
          data: {
            content: `❌ **Deployment Failed:** ${error.message}`
          }
        });
      }
    }
  }

  return res.status(400).json({ error: 'Unknown interaction' });
}