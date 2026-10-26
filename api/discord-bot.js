/**
 * Garfield AI Executive - Discord Bot & Interactions Webhook Handler (api/discord-bot.js)
 * Securely verifies Ed25519 signatures and handles Discord Slash Commands.
 */

import { verifyKey } from 'discord-interactions';

export const config = {
    api: {
        bodyParser: false, // Disable default body parser to correctly read Raw Body Buffer for signature verification
    },
};

// Helper function: Read Raw Body Buffer from incoming request stream
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

    console.log('--- Discord Webhook Verification Debug ---');
    console.log('Has Signature:', !!signature);
    console.log('Has Timestamp:', !!timestamp);
    console.log('Has PUBLIC_KEY:', !!PUBLIC_KEY);

    if (!signature || !timestamp || !PUBLIC_KEY) {
        console.log('[Discord Error] Missing required headers or public key.');
        return res.status(401).send('Bad request signature');
    }

    try {
        const rawBodyBuffer = await getRawBody(req);
        const rawBodyString = rawBodyBuffer.toString('utf8');

        // Await Ed25519 signature verification result
        const isValidRequest = await verifyKey(
            rawBodyBuffer,
            signature,
            timestamp,
            PUBLIC_KEY
        );

        console.log('Is Signature Valid:', isValidRequest);

        if (!isValidRequest) {
            console.log('[Discord Error] Invalid request signature.');
            return res.status(401).send('Invalid request signature');
        }

        const body = JSON.parse(rawBodyString);

        // Handle Discord PING verification (Type 1)
        if (body.type === 1) {
            console.log('[Discord Info] Responding to Discord PING (Type 1)');
            return res.status(200).json({ type: 1 });
        }

        // Handle subsequent interaction events (e.g., Slash Commands / Modal Submissions)
        // You can expand command routing here (e.g., body.data.name === 'receptionist')
        return res.status(200).json({
            type: 4, // Channel Message with Source
            data: {
                content: '👑 Garfield AI Executive Receptionist is online and operational!',
            },
        });

    } catch (err) {
        console.error('[Discord Critical Error] Error processing webhook:', err);
        return res.status(500).send('Internal Server Error');
    }
}

// Trigger redeploy timestamp: 2026-10-26
