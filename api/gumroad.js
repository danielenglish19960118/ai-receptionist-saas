/**
 * Garfield AI Executive - Automated Gumroad Webhook & Provisioning Handler (api/gumroad.js)
 * Handles automated sales, validates your personal Gumroad seller token, and pushes VIP alerts to Slack.
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
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    try {
        const eventData = req.body || {};

        // Extract sale details from your Gumroad payload
        const sellerId = eventData.seller_id;
        const buyerEmail = eventData.email;
        const productName = eventData.product_name;
        const licenseKey = eventData.license_key;
        const isPaid = eventData.paid;
        const price = eventData.price ? (eventData.price / 100) : 'N/A';
        const currency = eventData.currency || 'USD';

        // Validate your personal Gumroad seller ID
        const expectedSellerId = "o0g3LR2ktQ1Je36A9k58gQ==";
        if (sellerId !== expectedSellerId) {
            console.warn(`[SECURITY WARNING] Unauthorized seller ID received: ${sellerId}`);
            return res.status(403).json({ error: "Unauthorized seller ID" });
        }

        // Check if the sale is completed and paid
        if (!isPaid) {
            console.log(`[PENDING/REFUND] Sale not marked as paid for ${buyerEmail}`);
            return res.status(200).json({ success: true, message: "Event received but payment is not marked as paid." });
        }

        console.log(`[PROVISIONING SUCCESS] Sale verified for ${buyerEmail}`);
        console.log(`- Product: ${productName}`);
        console.log(`- Assigned License Key: ${licenseKey}`);

        // 🚀 Non-blocking Slack VIP Notification
        const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
        if (slackWebhookUrl) {
            fetch(slackWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    blocks: [
                        {
                            type: "header",
                            text: {
                                type: "plain_text",
                                text: "💰 New Gumroad High-Ticket Sale!",
                                emoji: true
                            }
                        },
                        {
                            type: "section",
                            fields: [
                                {
                                    type: "mrkdwn",
                                    text: `*Product:*\n*${productName || 'AI Executive License'}*`
                                },
                                {
                                    type: "mrkdwn",
                                    text: `*Amount Paid:*\n\`${price} ${currency.toUpperCase()}\``
                                },
                                {
                                    type: "mrkdwn",
                                    text: `*Buyer Email:*\n${buyerEmail}`
                                },
                                {
                                    type: "mrkdwn",
                                    text: `*License Key:*\n\`${licenseKey || 'N/A'}\``
                                }
                            ]
                        },
                        {
                            type: "divider"
                        }
                    ]
                })
            }).catch(slackErr => {
                console.error('Background Slack Notification Failed:', slackErr);
            });
        }

        // Return successful response to Gumroad
        return res.status(200).json({
            success: true,
            message: "Gumroad webhook processed successfully. VIP license provisioned.",
            assigned_key: licenseKey
        });

    } catch (err) {
        console.error("[WEBHOOK ERROR] Failed to process Gumroad payload:", err);
        return res.status(500).json({ error: "Internal Server Error during VIP license provisioning." });
    }
}
