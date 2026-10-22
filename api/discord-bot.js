import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. 處理 Discord 的 Ping 驗證（確保 URL 驗證能立刻通過）
  if (req.body && req.body.type === 1) {
    return res.status(200).json({ type: 1 });
  }

  // 2. 處理使用者輸入的斜線指令 (例如 /deploy)
  if (req.body && req.body.type === 2) {
    const commandName = req.body.data.name;

    if (commandName === 'deploy') {
      const options = req.body.data.options || [];
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