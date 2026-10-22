(function() {
  // 1. 取得 script 標籤傳入的參數
  const scriptTag = document.currentScript;
  if (!scriptTag) return;

  const clientId = scriptTag.getAttribute('data-client-id') || 'default-client';
  const plan = scriptTag.getAttribute('data-plan') || 'starter';
  const vapiPublicKey = scriptTag.getAttribute('data-vapi-key') || '';
  const vapiAssistantId = scriptTag.getAttribute('data-assistant-id') || '';

  console.log(`[AI Receptionist] Initializing for client: ${clientId} | Plan: ${plan}`);

  // 2. 如果是 Pro 方案且有 Vapi 金鑰，動態載入 Vapi 語音通話 SDK
  if (plan === 'pro' && vapiPublicKey && vapiAssistantId) {
    const vapiScript = document.createElement('script');
    vapiScript.src = "https://cdn.jsdelivr.net/gh/VapiAI/html-script-tag@latest/dist/assets/index.js";
    vapiScript.async = true;
    vapiScript.onload = function() {
      if (window.vapiSDK) {
        window.vapiSDK.run({
          apiKey: vapiPublicKey,
          assistant: vapiAssistantId,
          config: {
            position: "bottom-right",
            offset: "20px",
            width: "60px",
            height: "60px",
            idle: {
              icon: "https://vapi.ai/wp-content/uploads/2023/11/phone-call.png",
              color: "#2563eb"
            },
            loading: {
              color: "#93c5fd"
            },
            active: {
              icon: "https://vapi.ai/wp-content/uploads/2023/11/phone-hangup.png",
              color: "#ef4444"
            }
          }
        });
        console.log("[AI Receptionist] Vapi Voice Widget loaded successfully.");
      }
    };
    document.head.appendChild(vapiScript);
  } else {
    // 3. Starter 方案：渲染輕量化文字聊天 Widget 按鈕
    const chatBtn = document.createElement('div');
    chatBtn.id = 'turtle-ai-chat-btn';
    chatBtn.innerHTML = `💬 AI Chat`;
    chatBtn.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #2563eb;
      color: #fff;
      padding: 12px 20px;
      border-radius: 30px;
      font-family: -apple-system, sans-serif;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 999999;
      transition: background 0.2s;
    `;
    chatBtn.onmouseover = () => chatBtn.style.background = '#1d4ed8';
    chatBtn.onmouseout = () => chatBtn.style.background = '#2563eb';
    
    chatBtn.onclick = function() {
      alert(`[Turtle AI (${clientId})] Hello! How can I help you today? (Starter Text Mode)`);
    };

    document.body.appendChild(chatBtn);
  }
})();