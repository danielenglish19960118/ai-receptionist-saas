import fetch from 'node-fetch';

async function runTask() {
    console.log('Starting automated background task...');

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    try {
        // 1. 範例：呼叫 OpenAI 或執行原本 n8n 的核心邏輯
        console.log('Executing AI intelligence check...');
        
        // 2. 將 your_table_name 替換為真實的資料表名稱，例如 client_configs
        const response = await fetch(`${SUPABASE_URL}/rest/v1/client_configs`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
                // 請根據您的資料表欄位調整寫入的內容
                client_id: 'github_action_test',
                sender_email: 'system@automation.local',
                api_key: 'test_key'
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Supabase error: ${response.statusText} - ${errorText}`);
        }

        console.log('Task completed and successfully synced to Supabase!');
    } catch (error) {
        console.error('Error during automation task:', error);
        process.exit(1);
    }
}

runTask();
