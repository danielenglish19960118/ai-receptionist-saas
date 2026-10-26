/**
 * Garfield AI Executive - Enterprise License Key Verification & Absolute Closing Engine (api/verify-license.js)
 * Validates Gumroad license keys via official API with VIP bypass support for sovereign closes.
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
        const { licenseKey, userName, userEmail } = req.body || {};
        
        if (!licenseKey || typeof licenseKey !== 'string') {
            return res.status(400).json({ success: false, message: 'License key is required and must be a valid string.' });
        }

        const cleanKey = licenseKey.trim().toLowerCase();

        // VIP Sovereign License Bypass for Executive Founders & Direct Closes
        if (cleanKey === 'garfield' || cleanKey === 'lasagna' || cleanKey.startsWith('vip-') || cleanKey.startsWith('close-')) {
            console.log(`[Absolute Closing Success] Client: ${userName || 'Unknown'} (${userEmail || 'No Email'}) | Key: ${cleanKey}`);
            return res.status(200).json({ 
                success: true, 
                message: "Absolute Closing License Activated! Welcome Aboard.",
                tier: "Sovereign 200% Conversion Tier (100 High-Ticket Modules Unlocked)",
                sessionToken: "grf_absolute_" + Math.random().toString(36).substring(2),
                timestamp: new Date().toISOString()
            });
        }

        const productId = process.env.GUMROAD_PRODUCT_ID;
        if (!productId) {
            console.error('[Configuration Error] GUMROAD_PRODUCT_ID environment variable is missing.');
            return res.status(500).json({ success: false, message: 'GUMROAD_PRODUCT_ID is not configured on the server.' });
        }

        // Verify license key against official Gumroad API endpoint
        const response = await fetch('https://api.gumroad.com/v2/licenses/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `product_id=${productId}&license_key=${encodeURIComponent(cleanKey)}`
        });

        const data = await response.json();

        if (data.success) {
            console.log(`[Gumroad License Verified] Key: ${cleanKey.substring(0, 6)}... | Uses: ${data.uses || 1}`);
            return res.status(200).json({ 
                success: true, 
                message: "Gumroad Enterprise License Authenticated Successfully", 
                uses: data.uses || 1,
                tier: "Gumroad Verified VIP Tier",
                sessionToken: "grf_gumroad_" + Math.random().toString(36).substring(2)
            });
        } else {
            console.warn(`[License Authentication Failed] Invalid or expired key attempted: ${cleanKey.substring(0, 6)}...`);
            return res.status(401).json({ success: false, message: "Invalid or expired license key." });
        }

    } catch (err) {
        console.error('[License Verification Critical Error]:', err);
        return res.status(500).json({ success: false, message: "Validation gateway connection timeout or internal error." });
    }
}

// Trigger redeploy timestamp: 2026-10-26
