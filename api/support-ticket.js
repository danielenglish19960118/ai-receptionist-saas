/**
 * Garfield AI Executive - VIP Deal Submission & Instant Discord Webhook Notifier (api/support-ticket.js)
 * Registers high-intent inbound leads and instantly dispatches absolute closing alerts to Discord.
 */

export default async function handler(req, res) {
    // Set CORS and Security Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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
        const { name, email, category, urgency, description } = req.body || {};

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

        const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
        
        if (discordWebhookUrl) {
            try {
                await fetch(discordWebhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        content: `🔥💎 **[ABSOLUTE CLOSING ALERT] Hot Inbound Deal Ready to Sign**\n> **Deal ID:** \`${ticketId}\`\n> **Category:** ${category || 'General Executive Inquiry'}\n> **Prospect:** ${name} (${email})\n> **Intent:** ${urgency || 'Ready-to-Buy'}\n> **SLA:** ${sla}\n> **Notes:** ${description}`
                    })
                });
            } catch (webhookError) {
                console.error('[Discord Webhook Error] Failed to dispatch instant closer alert:', webhookError);
            }
        } else {
            console.warn('[Webhook Warning] DISCORD_WEBHOOK_URL is not configured in environment variables.');
        }

        return res.status(200).json({
            success: true,
            ticketId,
            sla,
            message: "Deal successfully registered. Founder and Senior Closer have been notified instantly."
        });

    } catch (error) {
        console.error('[Deal Submission Critical Error]:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Internal server error during deal registration pipeline.' 
        });
    }
}

// Trigger redeploy timestamp: 2026-10-26
