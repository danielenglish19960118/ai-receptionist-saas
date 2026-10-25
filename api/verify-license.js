export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

    const { licenseKey, userName, userEmail } = req.body;
    if (!licenseKey) return res.status(400).json({ success: false, message: 'License key is required.' });

    const cleanKey = licenseKey.trim().toLowerCase();

    // 尊榮 VIP 授權與成交後門
    if (cleanKey === 'garfield' || cleanKey === 'lasagna' || cleanKey.startsWith('vip-') || cleanKey.startsWith('close-')) {
        console.log(`[Absolute Closing Success] Client: ${userName} (${userEmail}) | Key: ${cleanKey}`);
        return res.status(200).json({ 
            success: true, 
            message: "Absolute Closing License Activated! Welcome Aboard.",
            tier: "Sovereign 200% Conversion Tier (100 High-Ticket Modules Unlocked)",
            sessionToken: "grf_absolute_" + Math.random().toString(36.substring(2)),
            timestamp: new Date().toISOString()
        });
    }

    const productId = process.env.GUMROAD_PRODUCT_ID;
    if (!productId) return res.status(500).json({ success: false, message: 'GUMROAD_PRODUCT_ID not configured.' });

    try {
        const response = await fetch('https://api.gumroad.com/v2/licenses/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `product_id=${productId}&license_key=${cleanKey}`
        });
        const data = await response.json();
        if (data.success) {
            return res.status(200).json({ success: true, message: "Gumroad Enterprise License Authenticated", uses: data.uses });
        } else {
            return res.status(401).json({ success: false, message: "Invalid or expired license key." });
        }
    } catch (err) {
        return res.status(500).json({ success: false, message: "Validation gateway connection timeout." });
    }
}
