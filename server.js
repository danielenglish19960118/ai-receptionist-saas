import { createClient } from '@supabase/supabase-js';
import express from 'express';
import crypto from 'crypto';

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global CORS Headers
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
// WhatsApp Webhook (安全驗證版)
// ==========================================
// 優先讀取環境變數的 Token，若無則預設為 'turtle_english_secure_token'
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'turtle_english_secure_token';

const whatsappHandlerGet = (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log(`[WhatsApp Webhook GET] Mode: ${mode}, Token: ${token}, Challenge: ${challenge}`);

    // 嚴格安全檢查：必須符合 subscribe 且 Token 必須吻合
    if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
        res.setHeader('Content-Type', 'text/plain');
        return res.status(200).send(String(challenge));
    }
    
    console.warn(`[WhatsApp Security Warning] Token mismatch. Received: ${token}`);
    return res.status(403).json({ error: 'Verification failed: Token mismatch' });
};

app.get('/whatsapp-webhook', whatsappHandlerGet);
app.get('/api/whatsapp-webhook', whatsappHandlerGet);

app.post(['/whatsapp-webhook', '/api/whatsapp-webhook'], async (req, res) => {
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

                if (supabase) {
                    await supabase.from('leads').insert([{
                        client_id: 'turtle_english',
                        phone: senderPhone,
                        name: `WhatsApp Lead (${senderPhone})`,
                        notes: `Inquiry: ${messageText}`
                    }]).catch(err => console.error('Supabase Error:', err.message));
                }
            }
            return res.status(200).json({ status: 'EVENT_RECEIVED' });
        }
        return res.status(404).json({ error: 'Not a WhatsApp event' });
    } catch (error) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 根目錄與基本健康檢查
app.get('/', (req, res) => {
    res.status(200).send('Garfield AI Executive Engine Online');
});

// 啟動伺服器（本地測試用，Vercel 會自動匯出 app）
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

export default app;
