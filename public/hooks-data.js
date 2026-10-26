/**
 * Garfield AI Executive - Sovereign Enterprise Voice Hook Scenario Engine (api/voice-hook.js)
 * Serves 10,000+ high-ticket voice closing hook scenarios, powers the 8-channel distribution matrix,
 * and dispatches real-time VIP alert blocks to Slack.
 */

export default async function handler(req, res) {
  // Set CORS, Security, and Caching Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=43200');

  // Handle OPTIONS preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { id = '1', channel = 'web' } = req.query;
    const numId = parseInt(id, 10);

    // 邊界檢查：確保 id 在 1 到 10,000 之間
    if (isNaN(numId) || numId < 1 || numId > 10000) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Hook Scenario ID. Must be an integer between 1 and 10,000.'
      });
    }

    // 高資產與企業級 6 大核心領域
    const categories = [
      'Private Wealth & Escrow Vault', 
      'Luxury Jet & Automotive Concierge', 
      'Concierge Medical & Bio-Optimization', 
      'C-Suite Executive M&A & Advisory', 
      'Enterprise Cloud AI & Sovereign Infrastructure', 
      'Global Ultra-Luxury Real Estate'
    ];

    // 8 大跨通路曝光矩陣識別
    const omnichannelMatrix = {
      chrome: "Google Chrome Extension (Side Panel)",
      slack: "Slack App Directory (Block Kit VIP Alerts)",
      discord: "Discord App Directory (Slash Commands & Linked Role)",
      raycast: "Raycast / Alfred Launcher (Opt + Space Fast Pipeline)",
      telegram: "Telegram / WhatsApp Gateway (HNW Executive Messaging)",
      desktop: "Desktop Menu Bar Tray App (Native Revenue Monitor)",
      mobile: "Mobile App Companion (Push Deal Alerts)",
      notion: "Notion Workspace Widget (Embedded CRM Boards)",
      web: "Web Executive Dashboard"
    };

    const category = categories[(numId - 1) % categories.length];
    const activeChannel = omnichannelMatrix[channel.toLowerCase()] || omnichannelMatrix.web;
    const estimatedDealValue = `$${((numId % 50 + 1) * 25000).toLocaleString()} ARR`;

    // 構造回應物件
    const payload = {
      success: true,
      hookId: numId,
      scenarioCode: `EXEC-HOOK-2026-${String(numId).padStart(5, '0')}`,
      title: `Enterprise Sovereign Voice Hook Scenario #${numId}`,
      category: category,
      activeDistributionChannel: activeChannel,
      targetMetrics: {
        latency: '< 130ms',
        conversionRate: '98.5%',
        escrowProtection: '100% Guaranteed (30-Day Third-Party Lock)',
        estimatedValue: estimatedDealValue
      },
      conversationalPattern: `Pattern #${numId}: Autonomously intercepts high-intent decision triggers -> Bypasses gatekeepers -> Direct founder/escrow bridge dispatch.`,
      systemScript: `"Director, our real-time audit detects active operational waste in your pipeline. Deploying Scenario #${numId} locks in guaranteed sub-130ms voice response times with 100% escrow protection. Shall we initiate secure setup?"`,
      timestamp: new Date().toISOString()
    };

    // -----------------------------------------------------------------
    // 🚀 背景非同步將高單價 Hook 呼叫推播至營運 Slack 頻道
    // -----------------------------------------------------------------
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (slackWebhookUrl && req.method === 'POST') {
      fetch(slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blocks: [
            {
              type: "header",
              text: {
                type: "plain_text",
                text: `🎙️ Enterprise Voice Hook Scenario #${numId} Triggered`,
                emoji: true
              }
            },
            {
              type: "section",
              fields: [
                { type: "mrkdwn", text: `*Category:*\n\`${category}\`` },
                { type: "mrkdwn", text: `*Channel:*\n\`${activeChannel}\`` },
                { type: "mrkdwn", text: `*Deal Value:*\n\`${estimatedDealValue}\`` },
                { type: "mrkdwn", text: `*Latency Target:*\n\`< 130ms\`` }
              ]
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*System Script:* _${payload.systemScript}_`
              }
            },
            { type: "divider" }
          ]
        })
      }).catch(err => console.error('[Slack Hook Notification Failed]', err));
    }

    return res.status(200).json(payload);

  } catch (error) {
    console.error('[Voice Hook Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while executing enterprise voice hook scenario.'
    });
  }
}
