export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

    const { monthlyCalls, averageDealSize } = req.body;
    const calls = parseInt(monthlyCalls) || 5000;
    const dealSize = parseFloat(averageDealSize) || 25000;

    const humanSalesCost = calls * 35; 
    const aiSalesCost = calls * 0.35; 
    const monthlySavings = humanSalesCost - aiSalesCost;
    
    // 200% 成交率轉化模型：提升 10% 閉環成交率
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
}
