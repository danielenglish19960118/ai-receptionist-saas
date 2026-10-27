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

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

// Initialize Google Gemini AI (自動讀取環境變數 GEMINI_API_KEY)
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

// 共用：呼叫 Gemini AI 生成雙語客服解答
async function generateAiConciergeReply(userMessage, channelName) {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                {
                    role: 'user',
                    parts: [{ 
                        text: `你現在是 Turtle English 英語教育中心與 Garfield AI Executive 的專業 AI 櫃檯客服。請用親切、專業、簡潔的口吻回覆來自 ${channelName} 的客戶詢問。客戶訊息：${userMessage}` 
                    }]
                }
            ]
        });
        return response.text || "感謝您的諮詢！我們是 Turtle English 與 Garfield AI 團隊，會盡快由專人為您服務。";
    } catch (aiErr) {
        console.error('Gemini AI Generation Error:', aiErr);
        return "感謝您的諮詢！系統已收到您的訊息，我們將有專人盡快與您聯繫。";
    }
}

// ==========================================
// 1. TELEGRAM GATEWAY WEBHOOK
// ==========================================
// 發送訊息回傳給 Telegram 用戶
async function sendTelegramMessage(chatId, messageText) {
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!telegramBotToken) {
        console.warn('TELEGRAM_BOT_TOKEN missing, skipping outbound reply.');
        return;
    }

    try {
        const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: messageText,
                parse_mode: 'Markdown'
            })
        });
        console.log(`[Telegram Outbound] Reply sent to Chat ID: ${chatId}`);
    } catch (err) {
        console.error('Telegram Send Error:', err);
    }
}

// Telegram Webhook 接收端
app.post('/telegram-webhook', async (req, res) => {
    try {
        const update = req.body;
        const message = update?.message;

        if (message && message.text) {
            const chatId = message.chat.id;
            const senderName = `${message.from.first_name || ''} ${message.from.last_name || ''}`.trim() || `@${message.from.username}`;
            const messageText = message.text;

            console.log(`[Telegram Incoming] From: ${senderName} (${chatId}), Message: ${messageText}`);

            // 1. 生成 AI 客服回覆
            const aiReply = await generateAiConciergeReply(messageText, 'Telegram Gateway');

            // 2. 主動回傳給 Telegram 用戶
            await sendTelegramMessage(chatId, aiReply);

            // 3. 寫入 Supabase leads
            if (supabase) {
                await supabase.from('leads').insert([{
                    client_id: 'turtle_english',
                    phone: `TG:${chatId}`,
                    name: `Telegram Lead (${senderName})`,
                    notes: `Inquiry: ${messageText} | AI Reply: ${aiReply}`
                }]).catch(err => console.error('Supabase Error:', err.message));
            }

            // 4. Slack 播報
            const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
            if (slackWebhookUrl) {
                fetch(slackWebhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: `✈️ *Telegram AI Concierge Interaction*\n*User:* ${senderName} (\`${chatId}\`)\n*Inquiry:* ${messageText}\n*AI Reply:* ${aiReply}`
                    })
                }).catch(err => console.error('Slack Notification Error:', err));
            }
        }
        return res.status(200).json({ status: 'OK' });
    } catch (error) {
        console.error('Telegram Webhook Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ==========================================
// 2. WHATSAPP GATEWAY WEBHOOK
// ==========================================
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'garfield-secure-token-2026';

app.get('/whatsapp-webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
        res.setHeader('Content-Type', 'text/plain');
        return res.status(200).send(String(challenge));
    }
    return res.status(403).json({ error: 'Verification failed: Token mismatch' });
});

async function sendWhatsAppMessage(recipientPhone, messageText) {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!accessToken || !phoneNumberId) {
        console.warn('WhatsApp credentials missing, skipping outbound reply.');
        return;
    }

    try {
        const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
        await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: recipientPhone,
                type: 'text',
                text: { body: messageText }
            })
        });
        console.log(`[WhatsApp Outbound] Sent to ${recipientPhone}`);
    } catch (err) {
        console.error('WhatsApp Send Error:', err);
    }
}

app.post('/whatsapp-webhook', async (req, res) => {
    try {
        const body = req.body;
        if (body?.object === 'whatsapp_business_account') {
            const entry = body.entry?.[0];
            const change = entry?.changes?.[0];
            const value = change?.value;
            const messageData = value?.messages?.[0];

            if (messageData) {
                const senderPhone = messageData.from;
                const messageText = messageData.text?.body || '';

                console.log(`[WhatsApp Incoming] From: ${senderPhone}, Message: ${messageText}`);

                // 1. 生成 AI 回覆
                const aiReply = await generateAiConciergeReply(messageText, 'WhatsApp Gateway');

                // 2. 主動傳回 WhatsApp
                await sendWhatsAppMessage(senderPhone, aiReply);

                // 3. 寫入 Supabase
                if (supabase) {
                    await supabase.from('leads').insert([{
                        client_id: 'turtle_english',
                        phone: senderPhone,
                        name: `WhatsApp Lead (${senderPhone})`,
                        notes: `Inquiry: ${messageText} | AI Reply: ${aiReply}`
                    }]).catch(err => console.error('Supabase Error:', err.message));
                }

                // 4. Slack 播報
                const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
                if (slackWebhookUrl) {
                    fetch(slackWebhookUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            text: `💬 *WhatsApp AI Concierge Interaction*\n*From:* \`${senderPhone}\`\n*Inquiry:* ${messageText}\n*AI Reply:* ${aiReply}`
                        })
                    }).catch(err => console.error('Slack Notification Error:', err));
                }
            }
            return res.status(200).json({ status: 'EVENT_RECEIVED' });
        }
        return res.status(404).json({ error: 'Not a WhatsApp event' });
    } catch (error) {
        console.error('WhatsApp POST Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ==========================================
// 靜態檔案託管與首頁路由
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
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

export default app;
