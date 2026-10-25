export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

    const { name, email, category, urgency, description } = req.body;
    if (!name || !email || !description) return res.status(400).json({ success: false, message: 'Missing required fields.' });

    const ticketId = 'GRF-CLOSER-' + Math.floor(100000 + Math.random() * 900000);
    const sla = urgency && urgency.includes('P1') ? 'Instant 3-Minute Founder Callback' : '15-Minute Priority Closing SLA';

    const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (discordWebhookUrl) {
        try {
            await fetch(discordWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: `🔥💎 **[ABSOLUTE CLOSING ALERT] Hot Inbound Deal Ready to Sign**\n> **Deal ID:** \`${ticketId}\`\n> **Prospect:** ${name} (${email})\n> **Intent:** ${urgency || 'Ready-to-Buy'}\n> **SLA:** ${sla}\n> **Notes:** ${description}`
                })
            });
        } catch (e) {}
    }

    return res.status(200).json({ success: true, ticketId, sla, message: "Deal successfully registered. Founder and Senior Closer have been notified instantly." });
}
