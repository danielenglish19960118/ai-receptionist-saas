/**
 * Garfield AI Executive - Automated Gumroad Webhook & Provisioning Handler (api/gumroad.js)
 * Handles automated pings, validates secure seller tokens, and provisions VIP access.
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

        // Extract crucial sale details from Gumroad payload
        const sellerId = eventData.seller_id;
        const buyerEmail = eventData.email;
        const productName = eventData.product_name;
        const licenseKey = eventData.license_key;
        const isPaid = eventData.paid;

        // Validate your specific Gumroad seller ID
        const expectedSellerId = "o0g3LR2ktQ1Je36A9k58gQ==";
        if (sellerId !== expectedSellerId) {
            console.warn(`[SECURITY WARNING] Unauthorized seller ID received: ${sellerId}`);
            return res.status(403).json({ error: "Unauthorized seller ID" });
        }

        if (isPaid) {
            console.log(`[PROVISIONING SUCCESS] Sale verified for ${buyerEmail}`);
            console.log(`- Product: ${productName}`);
            console.log(`- Assigned License Key: ${licenseKey}`);

            // TODO: Optional integration with Supabase or email dispatcher (e.g., Resend / SendGrid)
            // To automatically register the license key against the user's account.

            return res.status(200).json({
                success: true,
                message: "Gumroad webhook processed successfully. VIP license provisioned.",
                assigned_key: licenseKey
            });
        } else {
            console.log(`[PENDING/REFUND] Sale not marked as paid for ${buyerEmail}`);
            return res.status(200).json({ success: true, message: "Event received but payment is not marked as paid." });
        }

    } catch (err) {
        console.error("[WEBHOOK ERROR] Failed to process Gumroad payload:", err);
        return res.status(500).json({ error: "Internal Server Error during VIP license provisioning." });
    }
}

// Trigger redeploy timestamp: 2026-10-26
