import { createClient } from '@supabase/supabase-js';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

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

// GET: 處理 Meta Webhook 驗證握手
const whatsappHandlerGet = (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log(`[WhatsApp Webhook GET] Mode: ${mode}, Token: ${token}, Challenge: ${challenge}`);

    if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
        res.setHeader('Content-Type', 'text/plain');
        return res.status(200).send(String(challenge));
    }
    
    console.warn(`[WhatsApp Security Warning] Token mismatch. Received: ${token}`);
    return res.status(403).json({ error: 'Verification failed: Token mismatch' });
};

// POST: 接收 WhatsApp 客戶訊息並同步至 Supabase 與 Slack
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
                const messageText = messageData.text?.body || '[Non-text message]';

                console.log(`[WhatsApp Incoming] From: ${senderPhone}, Message: ${messageText}`);

                // 寫入 Supabase leads 資料表
                if (supabase) {
                    await supabase.from('leads').insert([{
                        client_id: 'turtle_english',
                        phone: senderPhone,
                        name: `WhatsApp Lead (${senderPhone})`,
                        notes: `Inquiry: ${messageText}`
                    }]).catch(err => console.error('Supabase Error:', err.message));
                }

                // 發送 Slack 通知 (如果設定了 SLACK_WEBHOOK_URL)
                const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
                if (slackWebhookUrl) {
                    fetch(slackWebhookUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            text: `💬 *WhatsApp Inquiry*\n*From:* \`${senderPhone}\`\n*Message:* ${messageText}`
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

// 註冊 WhatsApp Webhook 路由
app.get('/whatsapp-webhook', whatsappHandlerGet);
app.get('/api/whatsapp-webhook', whatsappHandlerGet);

app.post('/whatsapp-webhook', whatsappHandlerPost);
app.post('/api/whatsapp-webhook', whatsappHandlerPost);

// ==========================================
// 託管靜態前端主頁 (public/index.html)
// ==========================================
try {
    app.use(express.static(path.join(__dirname, 'public')));

    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });
} catch (e) {
    console.warn('Static folder middleware skipped:', e.message);
    app.get('/', (req, res) => {
        res.status(200).send('Garfield AI Executive Engine Online');
    });
}

// 本地測試用啟動器
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

export default app;
