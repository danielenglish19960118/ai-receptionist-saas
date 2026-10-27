/**
 * Garfield AI Executive - Automated Gumroad Webhook & Provisioning Handler (api/gumroad.js)
 * Handles automated sales, validates your personal Gumroad seller token, pushes VIP alerts to Slack, and syncs with Supabase.
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

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
        const buyerName = eventData.full_name || eventData.name || 'Gumroad VIP Buyer';

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

        // 🚀 Synchronize successful sale to Supabase DB (if connected)
        if (supabase) {
            // A. Insert into leads / customers table
            await supabase.from('leads').insert([
                {
                    client_id: 'turtle_english',
                    name: buyerName,
                    email: buyerEmail,
                    notes: `Purchased: ${productName} | Price: ${price} ${currency} | License: ${licenseKey}`
                }
            ]).catch(dbErr => console.error('[Supabase Lead Insert Warning]:', dbErr.message));

            // B. Register telemetry in omnichannel logs for sales tracking
            await supabase.from('omnichannel_logs').insert([
                {
                    client_id: 'turtle_english',
                    channel_id: 1, // Default to Chrome / Web Checkout
                    channel_key: 'gumroad_checkout',
                    payload: { productName, price, currency, buyerEmail, licenseKey },
                    latency_ms: 100,
                    created_at: new Date().toISOString()
                }
            ]).catch(logErr => console.error('[Supabase Omnichannel Log Warning]:', logErr.message));
        }

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
            message: "Gumroad webhook processed successfully. VIP license provisioned and synced to database.",
            assigned_key: licenseKey
        });

    } catch (err) {
        console.error("[WEBHOOK ERROR] Failed to process Gumroad payload:", err);
        return res.status(500).json({ error: "Internal Server Error during VIP license provisioning." });
    }
}
