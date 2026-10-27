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

// ==========================================
// WhatsApp Webhook Configuration
// ==========================================
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'garfield-secure-token-2026';

const whatsappHandlerGet = (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log(`[WhatsApp Webhook GET] Mode: ${mode}, Token: ${token}`);

    if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
        res.setHeader('Content-Type', 'text/plain');
        return res.status(200).send(String(challenge));
    }
    return res.status(403).json({ error: 'Verification failed: Token mismatch' });
};

// 透過 Meta Cloud API 將訊息傳回給 WhatsApp 用戶
async function sendWhatsAppMessage(recipientPhone, messageText) {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!accessToken || !phoneNumberId) {
        console.warn('WhatsApp API credentials missing, skipping auto-reply dispatch.');
        return;
    }

    try {
        const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
        const response = await fetch(url, {
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

        const data = await response.json();
        if (!response.ok) {
            console.error('Failed to send WhatsApp message:', data);
        } else {
            console.log(`[WhatsApp Outbound] Sent to ${recipientPhone}`);
        }
    } catch (err) {
        console.error('Error sending WhatsApp message:', err);
    }
}

const whatsappHandlerPost = async (req, res) => {
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

                // 1. 使用 Gemini AI 生成智慧客服回覆
                let aiReply = "感謝您的諮詢！我們是 Turtle English 英語教育中心與 Garfield AI 系統團隊，會盡快由專人為您服務。";
                try {
                    const response = await ai.models.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: [
                            {
                                role: 'user',
                                parts: [{ 
                                    text: `你現在是 Turtle English 英語教育中心與 Garfield AI Executive 的專業 AI 櫃檯客服。請用親切、專業、簡潔的口吻回覆客戶的以下詢問。客戶訊息：${messageText}` 
                                }]
                            }
                        ]
                    });
                    if (response.text) {
                        aiReply = response.text;
                    }
                } catch (aiErr) {
                    console.error('Gemini AI Generation Error:', aiErr);
                }

                // 2. 自動將對話與 AI 回覆傳回給 WhatsApp 用戶
                await sendWhatsAppMessage(senderPhone, aiReply);

                // 3. 寫入 Supabase leads 資料表
                if (supabase) {
                    await supabase.from('leads').insert([{
                        client_id: 'turtle_english',
                        phone: senderPhone,
                        name: `WhatsApp Lead (${senderPhone})`,
                        notes: `Inquiry: ${messageText} | AI Reply: ${aiReply}`
                    }]).catch(err => console.error('Supabase Error:', err.message));
                }

                // 4. 發送 Slack VIP 通知
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
};

app.get('/whatsapp-webhook', whatsappHandlerGet);
app.post('/whatsapp-webhook', whatsappHandlerPost);

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
