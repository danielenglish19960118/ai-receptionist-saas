(function () {
  // ----------------------------------------------------
  // 1. 解析引入腳本時傳入的 client 參數
  // ----------------------------------------------------
  const currentScript =
    document.currentScript ||
    document.querySelector('script[src*="widget.js"]');
  let clientId = 'turtle_english';

  if (currentScript && currentScript.src) {
    const urlParams = new URLSearchParams(currentScript.src.split('?')[1]);
    clientId = urlParams.get('client') || 'turtle_english';
  }

  // 對話歷史紀錄 (供 Gemini 維持上下文)
  let chatHistory = [];

  // ----------------------------------------------------
  // 2. 動態注入 Widget CSS 樣式
  // ----------------------------------------------------
  const style = document.createElement('style');
  style.innerHTML = `
    #ai-widget-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    #ai-widget-button {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background-color: #0d9488;
      color: white;
      border: none;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      transition: transform 0.2s, background-color 0.2s;
    }
    #ai-widget-button:hover {
      transform: scale(1.05);
      background-color: #0f766e;
    }
    #ai-widget-box {
      display: none;
      width: 360px;
      height: 520px;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.18);
      flex-direction: column;
      overflow: hidden;
      margin-bottom: 12px;
      border: 1px solid #e4e4e7;
    }
    #ai-widget-header {
      background: #0d9488;
      color: white;
      padding: 16px;
      font-weight: bold;
      font-size: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    #ai-widget-close {
      background: none;
      border: none;
      color: white;
      font-size: 20px;
      cursor: pointer;
    }
    #ai-widget-messages {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 10px;
      background: #f8fafc;
    }
    .ai-msg {
      max-width: 80%;
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 14px;
      line-height: 1.5;
      word-wrap: break-word;
    }
    .ai-msg.user {
      align-self: flex-end;
      background: #0d9488;
      color: white;
      border-bottom-right-radius: 2px;
    }
    .ai-msg.bot {
      align-self: flex-start;
      background: #ffffff;
      color: #1e293b;
      border: 1px solid #e2e8f0;
      border-bottom-left-radius: 2px;
    }
    #ai-widget-input-area {
      display: flex;
      padding: 12px;
      background: #ffffff;
      border-top: 1px solid #e2e8f0;
    }
    #ai-widget-input {
      flex: 1;
      border: 1px solid #cbd5e1;
      border-radius: 20px;
      padding: 8px 14px;
      font-size: 14px;
      outline: none;
    }
    #ai-widget-input:focus {
      border-color: #0d9488;
    }
    #ai-widget-send {
      background: #0d9488;
      color: white;
      border: none;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      margin-left: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #ai-widget-send:disabled {
      background: #94a3b8;
      cursor: not-allowed;
    }
  `;
  document.head.appendChild(style);

  // ----------------------------------------------------
  // 3. 動態建構 DOM 結構
  // ----------------------------------------------------
  const container = document.createElement('div');
  container.id = 'ai-widget-container';
  container.innerHTML = `
    <div id="ai-widget-box">
      <div id="ai-widget-header">
        <span>🤖 線上 AI 諮詢專員</span>
        <button id="ai-widget-close">&times;</button>
      </div>
      <div id="ai-widget-messages">
        <div class="ai-msg bot">您好！我是線上 AI 客服，請問有什麼可以為您服務的呢？</div>
      </div>
      <div id="ai-widget-input-area">
        <input type="text" id="ai-widget-input" placeholder="請輸入訊息..." />
        <button id="ai-widget-send">➤</button>
      </div>
    </div>
    <button id="ai-widget-button">💬</button>
  `;
  document.body.appendChild(container);

  // ----------------------------------------------------
  // 4. 事件監聽與 API 互動
  // ----------------------------------------------------
  const widgetBox = document.getElementById('ai-widget-box');
  const widgetBtn = document.getElementById('ai-widget-button');
  const closeBtn = document.getElementById('ai-widget-close');
  const sendBtn = document.getElementById('ai-widget-send');
  const inputEl = document.getElementById('ai-widget-input');
  const messagesEl = document.getElementById('ai-widget-messages');

  // 開啟 / 關閉 視窗
  widgetBtn.addEventListener('click', () => {
    widgetBox.style.display = widgetBox.style.display === 'flex' ? 'none' : 'flex';
  });
  closeBtn.addEventListener('click', () => {
    widgetBox.style.display = 'none';
  });

  // 滾動到底部
  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  // 新增對話泡泡
  function appendMessage(text, sender) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('ai-msg', sender);
    msgDiv.textContent = text;
    messagesEl.appendChild(msgDiv);
    scrollToBottom();
    return msgDiv;
  }

  // 發送訊息邏輯
  async function handleSend() {
    const text = inputEl.value.trim();
    if (!text) return;

    // 1. 顯示使用者訊息
    appendMessage(text, 'user');
    inputEl.value = '';
    inputEl.disabled = true;
    sendBtn.disabled = true;

    // 2. 顯示等待中提示
    const loadingMsg = appendMessage('正在思考中...', 'bot');

    try {
      // 3. 呼叫後端 API，傳送 clientId 與對話歷史
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          clientId: clientId, // 👈 動態帶入 client 參數
          history: chatHistory
        })
      });

      const data = await res.json();

      if (data.reply) {
        loadingMsg.textContent = data.reply;

        // 更新歷史紀錄，保持對話連貫
        chatHistory.push({ role: 'user', parts: [{ text: text }] });
        chatHistory.push({ role: 'model', parts: [{ text: data.reply }] });
      } else {
        loadingMsg.textContent = '抱歉，系統暫時忙碌中，請稍後再試。';
      }
    } catch (err) {
      console.error('AI Widget Fetch Error:', err);
      loadingMsg.textContent = '網路連線異常，請檢查網路設定。';
    } finally {
      inputEl.disabled = false;
      sendBtn.disabled = false;
      inputEl.focus();
      scrollToBottom();
    }
  }

  // 監聽 Enter 鍵與點擊發送
  sendBtn.addEventListener('click', handleSend);
  inputEl.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSend();
  });
})();