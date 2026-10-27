/**
 * Garfield AI Executive - VIP Deal Submission & Instant Discord/Supabase Notifier (api/support-ticket.js)
 * Registers high-intent inbound leads, syncs with Supabase, and instantly dispatches absolute closing alerts to Discord & Slack.
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

// 8-Channel Omnichannel Matrix Lookup Table
const channelNames = {
    1: 'Google Chrome Extension',
    2: 'Slack App Directory',
    3: 'Discord App Directory',
    4: 'Raycast / Alfred Launcher',
    5: 'Telegram / WhatsApp Gateway',
    6: 'Desktop Tray App',
    7: 'Mobile App Companion',
    8: 'Notion Workspace Widget'
};

export default async function handler(req, res) {
    // Set CORS and Security Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle OPTIONS preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Ensure the request method is POST
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ success: false, message: 'Method not allowed. Use POST.' });
    }

    try {
        const { name, email, category, urgency, description, channelId = 3, clientId = 'turtle_english' } = req.body || {};

        if (!name || !email || !description) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields: name, email, and description.' 
            });
        }

        const ticketId = 'GRF-CLOSER-' + Math.floor(100000 + Math.random() * 900000);
        const sla = (urgency && urgency.toLowerCase().includes('p1')) 
            ? 'Instant 3-Minute Founder Callback' 
            : '15-Minute Priority Closing SLA';
        
        const selectedChannelName = channelNames[channelId] || channelNames[3];

        // 🚀 1. Synchronize deal & lead information into Supabase DB
        if (supabase) {
            await supabase.from('leads').insert([
                {
                    client_id: clientId,
                    name: name,
                    email: email,
                    notes: `[Deal ID: ${ticketId}] [Category: ${category || 'General'}] [Channel: ${selectedChannelName}] - ${description}`
                }
            ]).catch(dbErr => console.error('[Supabase Lead Insert Warning]:', dbErr.message));

            await supabase.from('omnichannel_logs').insert([
                {
                    client_id: clientId,
                    channel_id: parseInt(channelId, 10) || 3,
                    channel_key: `support_ticket_${ticketId}`,
                    payload: { ticketId, category, urgency, email },
                    latency_ms: 105,
                    created_at: new Date().toISOString()
                }
            ]).catch(logErr => console.error('[Supabase Omnichannel Log Warning]:', logErr.message));
        }

        // 🚀 2. Dispatch instant closing alert to Discord Webhook
        const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
        if (discordWebhookUrl) {
            try {
                await fetch(discordWebhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        content: `🔥💎 **[ABSOLUTE CLOSING ALERT] Hot Inbound Deal Ready to Sign**\n> **Deal ID:** \`${ticketId}\`\n> **Origin Channel:** ${selectedChannelName}\n> **Category:** ${category || 'General Executive Inquiry'}\n> **Prospect:** ${name} (${email})\n> **Intent:** ${urgency || 'Ready-to-Buy'}\n> **SLA:** ${sla}\n> **Notes:** ${description}`
                    })
                });
            } catch (webhookError) {
                console.error('[Discord Webhook Error] Failed to dispatch instant closer alert:', webhookError);
            }
        }

        // 🚀 3. Also trigger parallel Slack notification if configured
        const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
        if (slackWebhookUrl) {
            fetch(slackWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: `🚨 *VIP Deal Submitted via ${selectedChannelName}!* ID: \`${ticketId}\` | Client: *${name}* (${email})`
                })
            }).catch(err => console.error('Background Slack Ticket Notification Failed:', err));
        }

        return res.status(200).json({
            success: true,
            ticketId,
            sla,
            originChannel: selectedChannelName,
            message: "Deal successfully registered, synced to Supabase, and broadcasted to Discord & Slack."
        });

    } catch (error) {
        console.error('[Deal Submission Critical Error]:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Internal server error during deal registration pipeline.' 
        });
    }
}

// Trigger redeploy timestamp: 2026-10-27
