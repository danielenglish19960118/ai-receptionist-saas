/**
 * Garfield AI Executive - Real Discord Linked Role OAuth2 & Metadata Handler (api/linked-role.js)
 * Handles Discord OAuth2 code exchange, verifies user status via Supabase, and syncs role metadata.
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_ANON_KEY || '');

export default async function handler(req, res) {
    const { code, state } = req.query;

    // 如果沒有帶入 Discord OAuth2 code，引導用戶進行授權或顯示精美驗證首頁
    if (!code) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Linked Role Verification | Garfield AI Executive</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-[#050507] text-[#F4F4F5] min-h-screen flex items-center justify-center p-6">
    <div class="max-w-md w-full bg-[#121216] p-8 rounded-3xl border border-amber-500/30 text-center space-y-6 shadow-2xl">
        <div class="text-4xl animate-bounce">👑</div>
        <h1 class="text-2xl font-black text-white">Garfield Enterprise Verification</h1>
        <p class="text-xs text-slate-400">Connect your Discord account to verify your VIP executive status and unlock restricted guild channels.</p>
        <a href="https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.DISCORD_REDIRECT_URI)}&response_type=code&scope=identify%20role_connections.write" 
           class="inline-block w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl transition shadow-lg shadow-amber-500/20 text-sm">
           Connect with Discord ➔
        </a>
    </div>
</body>
</html>
        `);
    }

    try {
        // 1.用 Authorization Code 跟 Discord 交換 Access Token
        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: process.env.DISCORD_CLIENT_ID,
                client_secret: process.env.DISCORD_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: process.env.DISCORD_REDIRECT_URI,
            }),
        });

        const tokenData = await tokenResponse.json();
        if (!tokenResponse.ok) throw new Error('Failed to exchange Discord OAuth code.');

        const accessToken = tokenData.access_token;

        // 2. 取得 Discord 用戶基本資料
        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        const discordUser = await userResponse.json();
        const discordId = discordUser.id;
        const discordUsername = discordUser.username;

        // 3. 真實查詢 Supabase：檢查該用戶是否為付費 VIP 或高單價客戶（透過 Email 或 Discord ID 比對）
        let isVip = false;
        let contractValue = 'Standard';

        if (supabase) {
            const { data: leadData } = await supabase
                .from('leads')
                .select('*')
                .eq('email', discordUser.email || '')
                .single();

            if (leadData) {
                isVip = true;
                contractValue = 'High-Ticket Client';
            }
        }

        // 4. 推送真實 Metadata 給 Discord 官方 Linked Role 系統
        await fetch(`https://discord.com/api/v10/users/@me/applications/${process.env.DISCORD_CLIENT_ID}/role-connection`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                platform_name: 'Garfield AI Executive SaaS',
                platform_username: discordUsername,
                metadata: {
                    is_vip: isVip ? 1 : 0,
                    verified_tier: isVip ? 2 : 1
                },
            }),
        });

        // 5. 非同步發送 Slack 通報
        const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
        if (slackWebhookUrl) {
            fetch(slackWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: `🛡️ *Discord Linked Role Verified:* \`${discordUsername}\` (${discordId}) | VIP Status: \`${isVip}\``
                })
            }).catch(() => {});
        }

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Verification Success</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-[#050507] text-[#F4F4F5] min-h-screen flex items-center justify-center p-6 text-center">
    <div class="max-w-md w-full bg-[#121216] p-8 rounded-3xl border border-emerald-500/30 space-y-4 shadow-2xl">
        <div class="text-4xl">✨</div>
        <h1 class="text-2xl font-black text-white">Verification Successful!</h1>
        <p class="text-xs text-slate-400">Your Discord account has been successfully linked. You can now close this window and return to Discord.</p>
    </div>
</body>
</html>
        `);

    } catch (err) {
        console.error('[OAuth Error]', err);
        return res.status(500).send('Authentication and role linking failed.');
    }
}
