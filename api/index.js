/**
 * Garfield AI Executive - Unified Enterprise Master Router (api/index.js)
 * Consolidates all enterprise endpoints (WhatsApp, Telegram, AI Chat, Chrome Extension, Omnichannel, Gumroad Payment, Activation, Zero-Cost Auto-Mine & Hot Buyer Finder) into a single Serverless Function.
 */

import { createClient } from '@supabase/supabase-js';
import express from 'express';

const app = express();

// Initialize Supabase Client (優先使用 SUPABASE_SERVICE_ROLE_KEY 繞過 RLS 限制)
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

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
app.post(['/api/telegram-webhook', '/telegram-webhook'], async (req, res) => {
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
// 4. Zero-Cost Automated Lead Prospecting Engine (/api/auto-mine)
// ==========================================
app.all(['/api/auto-mine', '/auto-mine'], async (req, res) => {
    try {
        console.log('[Auto-Mine Engine] Starting zero-cost lead prospecting task...');

        const searchQuery = encodeURIComponent('startup funding OR expansion OR hiring OR B2B SaaS');
        const rssUrl = `https://news.google.com/rss/search?q=${searchQuery}&hl=en-US&gl=US&ceid=US:en`;

        const rssResponse = await fetch(rssUrl);
        if (!rssResponse.ok) {
            throw new Error(`Failed to fetch RSS feed: ${rssResponse.statusText}`);
        }
        const rssText = await rssResponse.text();

        const items = [];
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        let match;
        while ((match = itemRegex.exec(rssText)) && items.length < 10) {
            const itemContent = match[1];
            const titleMatch = itemContent.match(/<title>([\s\S]*?)<\/title>/);
            const linkMatch = itemContent.match(/<link>([\s\S]*?)<\/link>/);
            const pubDateMatch = itemContent.match(/<pubDate>([\s\S]*?)<\/pubDate>/);

            if (titleMatch) {
                items.push({
                    title: titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim(),
                    link: linkMatch ? linkMatch[1].trim() : '',
                    pubDate: pubDateMatch ? pubDateMatch[1].trim() : ''
                });
            }
        }

        if (items.length === 0) {
            return res.status(200).json({ success: true, message: 'No news items found to process.', leadsFound: 0 });
        }

        const geminiApiKey = process.env.GEMINI_API_KEY;
        if (!geminiApiKey) {
            return res.status(500).json({ success: false, error: 'Gemini API Key missing for auto-mining filter.' });
        }

        const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
        const prompt = `
You are an autonomous B2B lead generation analyst. Analyze the following news headlines and identify potential corporate leads or expansion events that could benefit from an AI Executive Concierge SaaS.
Return ONLY a valid JSON array of objects with keys: "company", "intent_reason", "source_url". If none match, return [].

Headlines:
${JSON.stringify(items, null, 2)}
`;

        const geminiRes = await fetch(geminiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: { parts: [{ text: "You output strictly valid JSON array format. No markdown blocks if possible, or standard JSON." }] },
                contents: [{ role: 'user', parts: [{ text: prompt }] }]
            })
        });

        const geminiData = await geminiRes.json();
        const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
        const cleanedJsonText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        let minedLeads = [];
        try {
            minedLeads = JSON.parse(cleanedJsonText);
        } catch (parseErr) {
            console.error('[Auto-Mine] Failed to parse Gemini response as JSON:', rawText);
            minedLeads = [];
        }

        let savedCount = 0;
        if (supabase && Array.isArray(minedLeads) && minedLeads.length > 0) {
            for (const lead of minedLeads) {
                await supabase.from('leads').insert([{
                    client_id: 'turtle_english',
                    name: lead.company || 'Mined Prospect',
                    notes: `[Auto-Mine] Intent: ${lead.intent_reason} | Source: ${lead.source_url}`
                }]).catch(err => console.error('Supabase Auto-Mine Lead Insert Error:', err.message));
                savedCount++;
            }
        }

        const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
        if (slackWebhookUrl && savedCount > 0) {
            await fetch(slackWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: `🎯 *Zero-Cost Auto-Mine Radar Executed*\nSuccessfully mined and saved *${savedCount}* potential B2B prospects from public RSS feeds.`
                })
            }).catch(err => console.error('Slack Auto-Mine Notification Error:', err));
        }

        return res.status(200).json({
            success: true,
            message: `Auto-mine completed successfully. Mined and saved ${savedCount} leads.`,
            leads: minedLeads
        });

    } catch (error) {
        console.error('[Auto-Mine Engine Error]:', error);
        return res.status(500).json({ success: false, error: error.message || 'Internal server error during auto-mine.' });
    }
});

// ==========================================
// 5. One-Click Hot Buyer Finder & n8n Proxy (/api/hot-buyer-finder)
// ==========================================
app.post(['/api/hot-buyer-finder', '/hot-buyer-finder'], async (req, res) => {
    try {
        console.log('[Hot Buyer Finder Proxy] Triggered by front-end UI...');

        const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
        
        // 如果沒有設定 n8n Webhook，自動 Fallback 到原生零成本 RSS + Gemini 獲客引擎
        if (!N8N_WEBHOOK_URL) {
            console.log('[Hot Buyer Finder] N8N_WEBHOOK_URL not found. Falling back to native Gemini RSS mining...');
            
            const searchQuery = encodeURIComponent(req.body.industry || 'Private Wealth');
            const rssUrl = `https://news.google.com/rss/search?q=${searchQuery}&hl=en-US&gl=US&ceid=US:en`;
            const rssResponse = await fetch(rssUrl);
            const rssText = await rssResponse.text();

            const items = [];
            const itemRegex = /<item>([\s\S]*?)<\/item>/g;
            let match;
            while ((match = itemRegex.exec(rssText)) && items.length < 5) {
                const itemContent = match[1];
                const titleMatch = itemContent.match(/<title>([\s\S]*?)<\/title>/);
                if (titleMatch) {
                    items.push({ title: titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() });
                }
            }

            const geminiApiKey = process.env.GEMINI_API_KEY;
            if (!geminiApiKey) {
                return res.status(500).json({ success: false, error: 'Gemini API Key missing.' });
            }

            const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
            const prompt = `Analyze these news items and return a valid JSON array of 3 leads with keys: "companyName", "contactPerson", "dealValue", "intentScore" (>=85), "tag": ${JSON.stringify(items)}`;

            const geminiRes = await fetch(geminiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] })
            });
            const geminiData = await geminiRes.json();
            const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
            const cleanedJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
            
            let fallbackLeads = [];
            try { fallbackLeads = JSON.parse(cleanedJson); } catch (e) { fallbackLeads = []; }

            return res.status(200).json({
                success: true,
                count: fallbackLeads.length,
                leads: fallbackLeads
            });
        }

        // 若有設定 N8N_WEBHOOK_URL，作為 Secure Proxy 轉發給 n8n / Make.com
        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-Garfield-Secret': process.env.GARFIELD_INTERNAL_SECRET || ''
            },
            body: JSON.stringify({
                timestamp: new Date().toISOString(),
                industry: req.body.industry || 'Private Wealth',
                minIntentScore: req.body.minIntentScore || 80
            })
        });

        if (!response.ok) {
            throw new Error(`n8n webhook responded with status ${response.status}`);
        }

        const data = await response.json();

        return res.status(200).json({
            success: true,
            count: data.leads ? data.leads.length : 0,
            leads: data.leads || []
        });

    } catch (error) {
        console.error('[Hot Buyer Finder Error]:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

// ==========================================
// 6. Gumroad Webhook Handler & Client Activation
// ==========================================
app.post(['/api/gumroad-webhook', '/api/webhooks/gumroad', '/gumroad-webhook'], async (req, res) => {
    try {
        const saleData = req.body || {};
        const buyerEmail = saleData.email || saleData.purchaser_email || saleData?.payload?.email;

        if (!buyerEmail) {
            console.error('[Gumroad Webhook] Missing email in payload:', req.body);
            return res.status(400).json({ error: 'No email found in webhook data' });
        }

        console.log(`[Gumroad Webhook] Sale received for email: ${buyerEmail}`);

        if (supabase) {
            const { error } = await supabase.from('paid_customers').upsert([
                { email: buyerEmail, status: 'paid', updated_at: new Date() }
            ], { onConflict: 'email' });

            if (error) {
                console.error('Supabase Paid Customer Upsert Error:', error);
                return res.status(500).json({ error: error.message });
            }
        }

        return res.status(200).json({ success: true, email: buyerEmail });
    } catch (error) {
        console.error('Gumroad Webhook Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post(['/api/activate-client', '/activate-client'], async (req, res) => {
    try {
        const { email, notionDatabaseId, slackWebhookUrl } = req.body;

        if (!email || !notionDatabaseId) {
            return res.status(400).json({ success: false, error: 'Email and Notion Database ID are required.' });
        }

        if (supabase) {
            const { data: paidUser, error: checkError } = await supabase
                .from('paid_customers')
                .select('*')
                .eq('email', email)
                .single();

            if (checkError || !paidUser) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'No payment record found for this email. Please ensure you have completed the purchase on Gumroad.' 
                });
            }

            const clientKey = 'rk_live_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

            const { error: insertError } = await supabase.from('client_configs').upsert([
                {
                    email: email,
                    client_key: clientKey,
                    notion_database_id: notionDatabaseId,
                    slack_webhook_url: slackWebhookUrl || null,
                    status: 'active',
                    created_at: new Date()
                }
            ], { onConflict: 'email' });

            if (insertError) {
                console.error('Client Config Insert Error:', insertError);
                return res.status(500).json({ success: false, error: 'Failed to save client configuration.' });
            }

            return res.status(200).json({
                success: true,
                message: 'Activation successful!',
                clientKey: clientKey
            });
        } else {
            return res.status(500).json({ success: false, error: 'Database connection missing.' });
        }
    } catch (error) {
        console.error('Activation API Error:', error);
        return res.status(500).json({ success: false, error: 'Internal server error during activation.' });
    }
});

// ==========================================
// 7. AI Chat & Function Calling Handler (/api/chat)
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
            let clientSlackWebhook = null;

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

                // 💡 動態查詢該客戶專屬的 Slack Webhook (多租戶隔離保護隱私)
                const { data: clientConfig } = await supabase
                    .from('client_configs')
                    .select('slack_webhook_url')
                    .eq('email', clientId) // 或依據您的租戶主鍵調整
                    .single();

                clientSlackWebhook = clientConfig?.slack_webhook_url || process.env.SLACK_WEBHOOK_URL;
            } else {
                clientSlackWebhook = process.env.SLACK_WEBHOOK_URL;
            }

            // 💡 發送即時 VIP 通知至該客戶專屬的 Slack 頻道
            if (clientSlackWebhook) {
                await fetch(clientSlackWebhook, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: `🚨 *[${clientId}] VIP Lead & Appointment Captured!*\n*Name:* ${name}\n*Phone:* ${phone || 'N/A'}\n*Email:* ${email || 'N/A'}\n*Time:* ${appointment_date || 'Immediate'}\n*Notes:* ${notes || 'None'}\n\n_AI has secured the lead. Please take over if human intervention is required._`
                    })
                }).catch(err => console.error('Slack VIP Notification Error:', err));
            }

            return res.status(200).json({ 
                reply: `Thank you, ${name}! Your details and appointment have been registered.`,
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
// 8. Omnichannel Router (/api/omnichannel)
// ==========================================
app.get('/api/omnichannel', (req, res) => {
    return res.status(200).json({ success: true, status: 'Omnichannel router active', activeGateways: 8 });
});

// ==========================================
// 9. Fallback Catch-All Route
// ==========================================
app.all('*', (req, res) => {
    return res.status(200).send('Garfield Executive API Engine Online');
});

export default app;
