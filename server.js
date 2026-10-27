import { createClient } from '@supabase/supabase-js';
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

    if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
        res.setHeader('Content-Type', 'text/plain');
        return res.status(200).send(String(challenge));
    }
    return res.status(403).json({ error: 'Verification failed: Token mismatch' });
};

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

                if (supabase) {
                    await supabase.from('leads').insert([{
                        client_id: 'turtle_english',
                        phone: senderPhone,
                        name: `WhatsApp Lead (${senderPhone})`,
                        notes: `Inquiry: ${messageText}`
                    }]).catch(err => console.error('Supabase Error:', err.message));
                }

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
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

app.get('/whatsapp-webhook', whatsappHandlerGet);
app.post('/whatsapp-webhook', whatsappHandlerPost);

// ==========================================
// 🔍 診斷路由 (用來檢查 Vercel 雲端有沒有包進 public 檔案)
// ==========================================
app.get('/debug-files', (req, res) => {
    try {
        const publicPath1 = path.join(__dirname, 'public');
        const publicPath2 = path.join(process.cwd(), 'public');
        
        res.json({
            __dirname,
            cwd: process.cwd(),
            path1_exists: fs.existsSync(publicPath1),
            path1_files: fs.existsSync(publicPath1) ? fs.readdirSync(publicPath1) : [],
            path2_exists: fs.existsSync(publicPath2),
            path2_files: fs.existsSync(publicPath2) ? fs.readdirSync(publicPath2) : [],
            root_files: fs.readdirSync(process.cwd())
        });
    } catch (err) {
        res.status(500).json({ error: err.message, stack: err.stack });
    }
});

// ==========================================
// 靜態檔案託管
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
        res.status(404).send('index.html not found in public directory. Please check /debug-files');
    }
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

export default app;
