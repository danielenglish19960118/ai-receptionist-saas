import { verifyKey } from 'discord-interactions';

export const config = {
  api: {
    bodyParser: false, // 關閉預設 body parser 以進行正確的 Buffer 簽章驗證
  },
};

// 輔助函式：讀取 Raw Body Buffer
async function getRawBody(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const signature = req.headers['x-signature-ed25519'];
  const timestamp = req.headers['x-signature-timestamp'];
  const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;

  console.log('--- Discord Verification Debug ---');
  console.log('Has Signature:', !!signature);
  console.log('Has Timestamp:', !!timestamp);
  console.log('Has PUBLIC_KEY:', !!PUBLIC_KEY);

  if (!signature || !timestamp || !PUBLIC_KEY) {
    console.log('Missing required headers or public key.');
    return res.status(401).send('Bad request signature');
  }

  try {
    const rawBodyBuffer = await getRawBody(req);
    const rawBodyString = rawBodyBuffer.toString('utf8');

    // 關鍵修正：加上 await 等待驗證結果出爐
    const isValidRequest = await verifyKey(
      rawBodyBuffer,
      signature,
      timestamp,
      PUBLIC_KEY
    );

    console.log('Is Signature Valid:', isValidRequest);

    if (!isValidRequest) {
      return res.status(401).send('Invalid request signature');
    }

    const body = JSON.parse(rawBodyString);

    // 處理 Discord PING 驗證 (Type 1)
    if (body.type === 1) {
      console.log('Responding to Discord PING (Type 1)');
      return res.status(200).json({ type: 1 });
    }

    // 後續其他互動事件 (如 Slash Commands)
    return res.status(200).json({
      type: 4,
      data: {
        content: '機器人運作中！',
      },
    });

  } catch (err) {
    console.error('Error processing Discord webhook:', err);
    return res.status(500).send('Internal Server Error');
  }
}