/**
 * Garfield AI Executive - Discord Bot & Interactions Webhook Handler (api/discord-bot.js)
 * Securely verifies Ed25519 signatures, handles Discord Slash Commands, and syncs with Slack/Supabase.
 */

import { verifyKey } from 'discord-interactions';
import { createClient } from '@supabase/supabase-js';

export const config = {
    api: {
        bodyParser: false, // Disable default body parser to correctly read Raw Body Buffer for signature verification
    },
};

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

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

        if (!isValidRequest) {
            console.log('[Discord Error] Invalid request signature.');
            return res.status(401).send('Invalid request signature');
        }

        const body = JSON.parse(rawBodyString);

        // 1. Handle Discord PING verification (Type 1)[cite: 4]
        if (body.type === 1) {
            console.log('[Discord Info] Responding to Discord PING (Type 1)');
            return res.status(200).json({ type: 1 });
        }

        // 2. Handle Slash Commands & Interactions (Type 2)
        if (body.type === 2) {
            const commandName = body.data?.name;
            const userName = body.member?.user?.username || body.user?.username || 'Unknown User';

            console.log(`[Discord Command] Executed /${commandName} by ${userName}`);

            let responseContent = '👑 Garfield AI Executive Receptionist is online and operational!';

            // 範例：如果使用者執行 /leads 指令，從 Supabase 抓取最新 3 筆高價值名單
            if (commandName === 'leads' && supabase) {
                const { data: recentLeads, error } = await supabase
                    .from('leads')
                    .select('name, phone, created_at')
                    .order('created_at', { ascending: false })
                    .limit(3);

                if (!error && recentLeads && recentLeads.length > 0) {
                    const leadListStr = recentLeads.map(l => `• *${l.name}* (${l.phone || 'No phone'})`).join('\n');
                    responseContent = `📊 *Latest High-Ticket Leads in Database:*\n${leadListStr}`;
                } else {
                    responseContent = `📊 No recent leads found in Supabase yet.`;
                }
            } else if (commandName === 'status') {
                responseContent = `🟢 *System Status:* Vapi Voice API (Online), Supabase DB (Connected), Slack VIP Webhook (Active).`;
            }

            // 選用：將 Discord 端的互動同步發送到 Slack 頻道（讓團隊兩邊同步資訊）
            const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
            if (slackWebhookUrl) {
                fetch(slackWebhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: `💬 *Discord Interaction:* \`${userName}\` ran \`/${commandName}\``
                    })
                }).catch(err => console.error('Discord-to-Slack sync error:', err));
            }

            return res.status(200).json({
                type: 4, // Channel Message with Source
                data: {
                    content: responseContent,
                },
            });
        }

        // Default fallback response
        return res.status(200).json({
            type: 4,
            data: {
                content: '👑 Garfield AI Executive is listening.',
            },
        });

    } catch (err) {
        console.error('[Discord Critical Error] Error processing webhook:', err);
        return res.status(500).send('Internal Server Error');
    }
}
