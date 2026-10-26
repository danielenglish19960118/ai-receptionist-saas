export default function handler(req, res) {
  const { id = '1' } = req.query;
  const numId = parseInt(id, 10);

  // 邊界檢查：確保 id 在 1 到 10,000 之間
  if (isNaN(numId) || numId < 1 || numId > 10000) {
    return res.status(400).json({
      success: false,
      error: 'Invalid hook ID. Must be an integer between 1 and 10000.'
    });
  }

  const categories = [
    'Private Wealth & Escrow', 
    'Luxury Jet & Automotive', 
    'Concierge Medical', 
    'C-Suite Executive M&A', 
    'Enterprise Cloud AI', 
    'Global Real Estate'
  ];

  return res.status(200).json({
    success: true,
    hookId: numId,
    title: `Enterprise Voice Hook Scenario #${numId}`,
    category: categories[(numId - 1) % categories.length],
    pattern: `Pattern #${numId}: Detects high-intent conversational triggers -> Direct secure bridge dispatch.`,
    latency: '< 130ms',
    conversionRate: '98.5%',
    timestamp: new Date().toISOString()
  });
}
