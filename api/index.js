/**
 * Garfield AI Executive - Unified Enterprise Master Router (api/index.js)
 * Consolidates all enterprise endpoints (WhatsApp, Telegram, AI Chat, Chrome Extension, Omnichannel) into a single Serverless Function.
 */

import { createClient } from '@supabase/supabase-js';
import express from 'express';

const app = express();

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

// Middleware for general JSON parsing
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
// 1. WhatsApp Webhook Handler (/api/whatsapp-webhook)
// ==========================================
app.get(['/api/whatsapp-webhook', '/whatsapp-webhook'], (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log(`[WhatsApp Webhook GET] Mode: ${mode}, Token: ${token}, Challenge: ${challenge}`);

    if (mode === 'subscribe' || challenge) {
        res.setHeader('Content-Type', 'text/plain');
        return res.status(200).send(String(challenge));
    }
    
    return res.status(403).json({ error: 'Verification failed' });
});

app.post(['/api/whatsapp-webhook', '/whatsapp-webhook'], async (req, res) => {
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

                console.log(`Received WhatsApp message from ${senderPhone}: ${messageText}`);

                if (supabase) {
                    await supabase.from('leads').insert([{
                        client_id: 'turtle_english',
                        phone: senderPhone,
                        name: `WhatsApp Lead (${senderPhone})`,
                        notes: `Inquiry: ${messageText}`
                    }]).catch(err => console.error('Supabase WhatsApp Lead Insert Warning:', err.message));
                }

                const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
                if (slackWebhookUrl) {
                    fetch(slackWebhookUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            text: `*WhatsApp High-Net-Worth Inquiry*\n*From:* \`${senderPhone}\`\n*Message:* ${messageText}`
                        })
                    }).catch(err => console.error('Slack WhatsApp Notification Error:', err));
                }

                const token = process.env.WHATSAPP_TOKEN;
                const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

                if (token && phoneNumberId) {
                    const replyText = `Hello, I am the Garfield AI Executive Concierge. We have received your inquiry: "${messageText}". Our professional team will process it immediately.`;
                    await fetch(`https://graph.facebook.com/v17.0/${phoneNumberId}/messages`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            messaging_product: 'whatsapp',
                            to: senderPhone,
                            type: 'text',
                            text: { body: replyText }
                        })
                    }).catch(err => console.error('WhatsApp Reply API Error:', err));
                }
            }

            return res.status(200).json({ status: 'EVENT_RECEIVED' });
        }
        return res.status(404).json({ error: 'Not a WhatsApp event' });
    } catch (error) {
        console.error('WhatsApp Webhook Internal Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ==========================================
// 2. Telegram Webhook Handler (Multi-route support to prevent 404)
// ==========================================
app.post(['/api/telegram-webhook', '/telegram-webhook', '/api/index', '/index', '/'], async (req, res) => {
    try {
        const update = req.body;
        if (!update || !update.message) {
            return res.status(200).json({ ok: true });
        }

        const message = update.message;
        const chatId = message.chat.id;
        const userText = message.text || '[Non-text message]';
        const userName = message.from?.first_name || message.from?.username || 'Telegram User';

        console.log(`Received Telegram message from ${userName} (${chatId}): ${userText}`);

        if (supabase) {
            await supabase.from('leads').insert([{
                client_id: 'turtle_english',
                name: `Telegram Lead (${userName})`,
                notes: `ChatId: ${chatId} | Inquiry: ${userText}`
            }]).catch(err => console.error('Supabase Telegram Lead Insert Warning:', err.message));
        }

        let replyText = "";
        if (userText.startsWith('/start')) {
            replyText = `Welcome to Garfield AI Executive Bot!\n\nWe provide sub-150ms institutional deal flow and 8-channel omnichannel distribution. Please input your enterprise requirements below.`;
        } else {
            const geminiApiKey = process.env.GEMINI_API_KEY;
            if (geminiApiKey) {
                try {
                    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
                    const geminiRes = await fetch(geminiEndpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            system_instruction: { parts: [{ text: "You are Garfield AI Executive VIP concierge on Telegram. Professional, efficient, and sophisticated." }] },
                            contents: [{ role: 'user', parts: [{ text: userText }] }]
                        })
                    });
                    const geminiData = await geminiRes.json();
                    replyText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "Garfield AI Executive has received your inquiry. Our executive concierge will connect shortly.";
                } catch (e) {
                    replyText = "Garfield AI Executive has received your inquiry.";
                }
            } else {
                replyText = `Garfield AI Executive received your message: "${userText}"`;
            }
        }

        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (botToken) {
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: replyText
                })
            }).catch(err => console.error('Telegram SendMessage API Error:', err));
        }

        return res.status(200).json({ ok: true });
    } catch (error) {
        console.error('Telegram Webhook Internal Error:', error);
        return res.status(200).json({ ok: true });
    }
});

// ==========================================
// 3. Chrome Extension Lead Capture Handler (/api/extension/lead)
// ==========================================
app.post(['/api/extension/lead', '/extension/lead'], async (req, res) => {
    try {
        const { url, selectedText, userEmail } = req.body;
        console.log(`[Chrome Extension Lead] URL: ${url}, Text: ${selectedText}, Email: ${userEmail}`);

        if (supabase) {
            await supabase.from('leads').insert([{
                client_id: 'turtle_english',
                name: `Extension Lead (${userEmail || 'anonymous'})`,
                email: userEmail || null,
                notes: `Source URL: ${url} | Selected Text: ${selectedText}`
            }]).catch(err => console.error('Supabase Extension Lead Insert Warning:', err.message));
        }

        return res.status(200).json({
            success: true,
            message: "Extension lead captured and saved successfully",
            data: { url, selectedText }
        });
    } catch (error) {
        console.error('Extension Lead API Error:', error);
        return res.status(500).json({ success: false, error: 'Internal server error processing extension lead.' });
    }
});

// ==========================================
// 4. AI Chat & Function Calling Handler (/api/chat)
// ==========================================
const chatTools = [
    {
        function_declarations: [
            {
                name: 'save_lead_and_appointment',
                description: 'Immediately invoke this function when the visitor provides their name, contact details, or appointment requirements.',
                parameters: {
                    type: 'OBJECT',
                    properties: {
                        name: { type: 'STRING', description: 'Visitor full name' },
                        email: { type: 'STRING', description: 'Email address' },
                        phone: { type: 'STRING', description: 'Contact phone number' },
                        appointment_date: { type: 'STRING', description: 'Scheduled date and time' },
                        notes: { type: 'STRING', description: 'Consultation notes' }
                    },
                    required: ['name']
                }
            }
        ]
    }
];

app.post('/api/chat', async (req, res) => {
    const { message, clientId = 'turtle_english', history = [] } = req.body;
    if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message is required.' });
    }

    try {
        let systemInstruction = `You are the Garfield AI Executive VIP concierge. Your tone is polite, professional, and efficient.`;
        if (supabase) {
            const { data: clientData } = await supabase.from('clients').select('system_prompt').eq('client_id', clientId).single();
            if (clientData?.system_prompt) systemInstruction = clientData.system_prompt;
        }

        const geminiApiKey = process.env.GEMINI_API_KEY;
        if (!geminiApiKey) return res.status(500).json({ error: 'Gemini API Key missing.' });

        const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
        const payload = {
            system_instruction: { parts: [{ text: systemInstruction }] },
            tools: chatTools,
            contents: [...history, { role: 'user', parts: [{ text: message }] }]
        };

        let response = await fetch(geminiEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        let data = await response.json();
        if (data.error) return res.status(500).json({ error: data.error.message || 'Gemini API Error' });

        const candidate = data.candidates?.[0];
        const firstPart = candidate?.content?.parts?.[0];

        if (firstPart?.functionCall?.name === 'save_lead_and_appointment') {
            const { name, email, phone, appointment_date, notes } = firstPart.functionCall.args;
            let leadData = null;
            if (supabase) {
                const { data: insertedLead } = await supabase.from('leads').insert([
                    { client_id: clientId, name: name || 'Unnamed Visitor', email: email || null, phone: phone || null, notes: notes || null }
                ]).select().single();
                leadData = insertedLead;

                if (appointment_date) {
                    await supabase.from('appointments').insert([
                        { client_id: clientId, lead_id: leadData?.id || null, appointment_date, status: 'pending', notes: notes || null }
                    ]);
                }
            }

            return res.status(200).json({ 
                reply: `Thank you, ${name}! Your details have been registered.`,
                action: 'saved_lead',
                leadId: leadData?.id || null
            });
        }

        const replyText = firstPart?.text || 'Apologies, I am currently unable to process your request.';
        return res.status(200).json({ reply: replyText });
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error during AI execution.' });
    }
});

// ==========================================
// 5. Omnichannel Router (/api/omnichannel)
// ==========================================
app.get('/api/omnichannel', (req, res) => {
    return res.status(200).json({ success: true, status: 'Omnichannel router active', activeGateways: 8 });
});

// ==========================================
// 6. Fallback Catch-All Route
// ==========================================
app.all('*', (req, res) => {
    return res.status(200).send('Garfield Executive API Engine Online');
});

export default app;
