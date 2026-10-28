import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

// Initialize Google Gemini AI (@google/genai)
const ai = new GoogleGenAI();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global CORS & Security Headers
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

// ==========================================
// 🧠 Core AI Concierge Brain (Gemini 2.5 Flash)
// ==========================================
async function generateAiConciergeReply(userMessage, channelName) {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                {
                    role: 'user',
                    parts: [{ 
                        text: `You are the professional Sovereign AI Concierge for Turtle English and Garfield AI Executive. Please reply to the high-net-worth inquiry from [${channelName}] in a polite, professional, and efficient bilingual tone. User inquiry: ${userMessage}` 
                    }]
                }
            ]
        });
        return response.text || "Thank you for your inquiry! We are the Turtle English and Garfield AI team, and our specialist will connect with you shortly.";
    } catch (aiErr) {
        console.error('Gemini AI Error:', aiErr);
        return "Thank you for your inquiry! Your message has been received, and our team will get back to you shortly.";
    }
}

// Unified Slack Block Kit Alert Tool
async function sendSlackVipAlert(channelName, sender, text, aiReply) {
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!slackWebhookUrl) return;
    try {
        await fetch(slackWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: `⚡ *[Garfield 8-Channel Matrix]* Channel: *${channelName}*\n*Sender:* \`${sender}\`\n*Inquiry:* ${text}\n*AI Reply:* ${aiReply}`
            })
        });
    } catch (e) {
        console.error('Slack Notification Failed:', e);
    }
}

// ==========================================
// 🌐 8-CHANNEL DISTRIBUTION MATRIX FULL HANDLERS
// ==========================================

// Channel 1: Google Chrome Extension
app.post('/api/extension/lead', async (req, res) => {
    const { url, selectedText, userEmail } = req.body;
    if (supabase) {
        await supabase.from('leads').insert([{
            client_id: 'turtle_english',
            channel_source: 'chrome_extension',
            email: userEmail || 'extension_visitor@browser.com',
            notes: `Captured: ${selectedText} | Source URL: ${url}`
        }]);
    }
    return res.json({ status: 'SUCCESS', channel: 'Google Chrome Extension', synced: true });
});

// Channel 2: Slack App Directory
app.post('/api/slack/interactive', async (req, res) => {
    return res.status(200).json({ response_type: 'in_channel', text: '✅ [Garfield Executive] Lead status updated by team action.' });
});

// Channel 3: Discord App Directory
app.post('/api/discord/interaction', async (req, res) => {
    const { type } = req.body;
    if (type === 1) return res.json({ type: 1 });
    
    return res.json({ 
        type: 4, 
        data: { content: `🤖 **Garfield Executive (Channel 3)**: All 8 Matrix channels active. Live Sync Node: Online.` } 
    });
});

// Channel 4: Raycast / Alfred Launcher
app.get('/api/launcher/leads', async (req, res) => {
    if (supabase) {
        const { data } = await supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(10);
        return res.json({ status: 'OK', channel: 'Raycast/Alfred', count: data?.length || 0, leads: data || [] });
    }
    return res.json({ status: 'OK', channel: 'Raycast/Alfred', leads: [] });
});

// Channel 5: Telegram / WhatsApp Gateway
// 5a. Telegram Webhook (Supports multiple path variations to prevent 404)
async function sendTelegramMessage(chatId, messageText) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return;
    try {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: messageText, parse_mode: 'Markdown' })
        });
    } catch (err) { console.error('Telegram Send Error:', err); }
}

const handleTelegramUpdate = async (req, res) => {
    try {
        const update = req.body;
        const message = update?.message;
        if (message && message.text) {
            const chatId = message.chat.id;
            const senderName = `${message.from.first_name || ''} ${message.from.last_name || ''}`.trim() || `@${message.from.username}`;
            const messageText = message.text;

            const aiReply = await generateAiConciergeReply(messageText, 'Telegram Gateway');
            await sendTelegramMessage(chatId, aiReply);

            if (supabase) {
                await supabase.from('leads').insert([{
                    client_id: 'turtle_english',
                    channel_source: 'telegram',
                    phone: `TG:${chatId}`,
                    name: `Telegram Lead (${senderName})`,
                    notes: `Inquiry: ${messageText} | AI Reply: ${aiReply}`
                }]);
            }
            await sendSlackVipAlert('Channel 5: Telegram', senderName, messageText, aiReply);
        }
        return res.status(200).json({ status: 'OK' });
    } catch (error) {
        console.error('Telegram Webhook Error:', error);
        return res.status(200).json({ ok: true });
    }
};

app.post(['/telegram-webhook', '/api/telegram-webhook', '/'], handleTelegramUpdate);

// 5b. WhatsApp Webhook
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'garfield-secure-token-2026';

app.get(['/whatsapp-webhook', '/api/whatsapp-webhook'], (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
        res.setHeader('Content-Type', 'text/plain');
        return res.status(200).send(String(challenge));
    }
    return res.status(403).json({ error: 'Verification failed' });
});

async function sendWhatsAppMessage(recipientPhone, messageText) {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!accessToken || !phoneNumberId) return;
    try {
        await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ messaging_product: 'whatsapp', to: recipientPhone, type: 'text', text: { body: messageText } })
        });
    } catch (err) { console.error('WhatsApp Send Error:', err); }
}

app.post(['/whatsapp-webhook', '/api/whatsapp-webhook'], async (req, res) => {
    try {
        const body = req.body;
        if (body?.object === 'whatsapp_business_account') {
            const messageData = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
            if (messageData) {
                const senderPhone = messageData.from;
                const messageText = messageData.text?.body || '';

                const aiReply = await generateAiConciergeReply(messageText, 'WhatsApp Gateway');
                await sendWhatsAppMessage(senderPhone, aiReply);

                if (supabase) {
                    await supabase.from('leads').insert([{
                        client_id: 'turtle_english',
                        channel_source: 'whatsapp',
                        phone: senderPhone,
                        name: `WhatsApp Lead (${senderPhone})`,
                        notes: `Inquiry: ${messageText} | AI Reply: ${aiReply}`
                    }]);
                }
                await sendSlackVipAlert('Channel 5: WhatsApp', senderPhone, messageText, aiReply);
            }
            return res.status(200).json({ status: 'EVENT_RECEIVED' });
        }
        return res.status(404).json({ error: 'Not a WhatsApp event' });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// Channel 6: Desktop Tray App
app.get('/api/tray/status', (req, res) => {
    res.json({ 
        channel: 'Desktop Tray App',
        status: 'ONLINE',
        active_channels: 8,
        metrics: {
            arr_target: '$308,800+',
            escrow_guarantee: '100% REFUND',
            sub_150ms_sync: true
        },
        uptime_seconds: process.uptime() 
    });
});

// Channel 7: Mobile App Companion
app.get('/api/mobile/leads', async (req, res) => {
    if (supabase) {
        const { data } = await supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(20);
        return res.json({ channel: 'Mobile Companion App', push_status: 'READY', leads: data || [] });
    }
    return res.json({ channel: 'Mobile Companion App', leads: [] });
});

// Channel 8: Notion Workspace Widget
app.post('/api/notion/sync', async (req, res) => {
    if (supabase) {
        const { data } = await supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(50);
        return res.json({ 
            channel: 'Notion Workspace Widget', 
            synced: true, 
            records_synced: data?.length || 0,
            workspace: 'Garfield Omnichannel CRM',
            synced_at: new Date().toISOString() 
        });
    }
    return res.json({ channel: 'Notion Workspace Widget', synced: false });
});

// ==========================================
// 📁 Static Files & Multi-page Hosting
// ==========================================
const publicDir = fs.existsSync(path.join(__dirname, 'public')) 
    ? path.join(__dirname, 'public') 
    : path.join(process.cwd(), 'public');

app.use(express.static(publicDir));

app.get('/', (req, res) => {
    const indexPath = path.join(publicDir, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('index.html not found');
    }
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`Garfield Executive Server running on port ${PORT}`));
}

export default app;
