/**
 * Garfield AI Executive - Enterprise ROI & Cost of Delay Calculator API (api/roi-calculator.js)
 * Calculates human vs AI telephony cost savings, additional deal conversions, and ROI multipliers.
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
        const { monthlyCalls, averageDealSize } = req.body || {};
        const calls = parseInt(monthlyCalls, 10) || 5000;
        const dealSize = parseFloat(averageDealSize) || 25000;

        // Telephony and closing financial model calculations
        const humanSalesCost = calls * 35; 
        const aiSalesCost = calls * 0.35; 
        const monthlySavings = humanSalesCost - aiSalesCost;
        
        // 200% Conversion & Closing Engine model: 10% lift in closed-loop conversion
        const extraDealsClosed = Math.round(calls * 0.10); 
        const monthlyRevenueAdded = extraDealsClosed * dealSize;
        const annualNetValue = (monthlySavings * 12) + (monthlyRevenueAdded * 12);

        return res.status(200).json({
            success: true,
            monthlySavings: `$${Math.round(monthlySavings).toLocaleString()} USD`,
            extraDealsClosed: `${extraDealsClosed} High-Ticket Deals/Mo`,
            monthlyRevenueAdded: `$${Math.round(monthlyRevenueAdded).toLocaleString()} USD`,
            annualNetValue: `$${Math.round(annualNetValue).toLocaleString()} USD`,
            dailyCostOfDelay: `$${Math.round(annualNetValue / 365).toLocaleString()} USD/Day Lost`,
            roiMultiplier: `${(annualNetValue / 3999).toFixed(1)}x`,
            paybackPeriod: "0.8 Days (Instant Payback)"
        });

    } catch (error) {
        console.error('[ROI Calculator Error] Failed to compute financial metrics:', error);
        return res.status(500).json({ success: false, message: 'Internal server error during ROI calculation pipeline.' });
    }
}

// Trigger redeploy timestamp: 2026-10-26
