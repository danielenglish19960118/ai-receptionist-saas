import fetch from 'node-fetch';

async function runTask() {
    console.log('Starting automated background task...');

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    try {
        // 1. 範例：呼叫 OpenAI 或執行原本 n8n 的核心邏輯
        console.log('Executing AI intelligence check...');
        
        // 2. 範例：將處理結果寫入 Supabase 資料庫
        const response = await fetch(`${SUPABASE_URL}/rest/v1/your_table_name`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
                title: 'GitHub Actions Automated Run',
                status: 'success',
                created_at: new Date().toISOString()
            })
        });

        if (!response.ok) {
            throw new Error(`Supabase error: ${response.statusText}`);
        }

        console.log('Task completed and successfully synced to Supabase!');
    } catch (error) {
        console.error('Error during automation task:', error);
        process.exit(1);
    }
}

runTask();
