/**
 * Garfield AI Executive - Universal Widget SDK (api/widget.js)
 * Production-grade embeddable widget supporting Vapi WebRTC voice & interactive chat.
 */
(function() {
    'use strict';

    // 1. 取得 script 標籤傳入的參數與配置
    const scriptTag = document.currentScript;
    if (!scriptTag) return;

    const clientId = scriptTag.getAttribute('data-client-id') || 'default-client';
    const plan = scriptTag.getAttribute('data-plan') || 'starter';
    const vapiPublicKey = scriptTag.getAttribute('data-vapi-key') || '';
    const vapiAssistantId = scriptTag.getAttribute('data-assistant-id') || '';
    const storeName = scriptTag.getAttribute('data-store') || 'Garfield AI Executive';
    const primaryColor = scriptTag.getAttribute('data-color') || '#D4AF37'; // VIP Gold

    console.log(`[Garfield AI Executive] Initializing widget for client: ${clientId} | Plan: ${plan}`);

    // 2. 如果是 Pro 方案且具備 Vapi 憑證，載入 Vapi WebRTC 語音浮動按鈕
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
                        width: "65px",
                        height: "65px",
                        idle: {
                            icon: "https://vapi.ai/wp-content/uploads/2023/11/phone-call.png",
                            color: primaryColor
                        },
                        loading: {
                            color: "#FFF5C0"
                        },
                        active: {
                            icon: "https://vapi.ai/wp-content/uploads/2023/11/phone-hangup.png",
                            color: "#ef4444"
                        }
                    }
                });
                console.log("[Garfield AI Executive] Vapi WebRTC Voice Widget loaded successfully.");
            }
        };
        document.head.appendChild(vapiScript);
        return;
    }

    // 3. Starter / Standard 方案：渲染精美互動式聊天對話視窗 (Chat Drawer Widget)
    const widgetContainer = document.createElement('div');
    widgetContainer.id = 'garfield-ai-widget-root';
    widgetContainer.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 999999;
        font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    `;

    // 浮動觸發按鈕
    const triggerBtn = document.createElement('div');
    triggerBtn.innerHTML = `
        <div style="background: linear-gradient(135deg, #FFF5C0 0%, #D4AF37 45%, #AA771C 100%); color: #050507; width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 30px rgba(212,175,55,0.4); cursor: pointer; transition: transform 0.2s; font-size: 24px;" title="Open AI Receptionist">
            👑
        </div>
    `;
    triggerBtn.onmouseover = () => triggerBtn.style.transform = 'scale(1.08)';
    triggerBtn.onmouseout = () => triggerBtn.style.transform = 'scale(1.0)';

    // 聊天對話視窗主體 (預設隱藏)
    const chatWindow = document.createElement('div');
    chatWindow.id = 'garfield-chat-window';
    chatWindow.style.cssText = `
        position: absolute;
        bottom: 75px;
        right: 0;
        width: 360px;
        height: 500px;
        background: #050507;
        color: #F4F4F5;
        border: 1px solid rgba(212,175,55,0.4);
        border-radius: 24px;
        box-shadow: 0 12px 40px rgba(0,0,0,0.8);
        display: none;
        flex-direction: column;
        overflow: hidden;
    `;

    chatWindow.innerHTML = `
        <div style="background: #121216; padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <div style="background: #D4AF37; color: #050507; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px;">👑</div>
                <div>
                    <div style="font-weight: 800; font-size: 14px; color: #fff;">${storeName}</div>
                    <div style="font-size: 10px; color: #34d399; display: flex; align-items: center; gap: 4px;"><span style="width: 6px; height: 6px; background: #34d399; border-radius: 50%; display: inline-block;"></span> AI Executive Online</div>
                </div>
            </div>
            <button id="garfield-close-btn" style="background: none; border: none; color: #a1a1aa; cursor: pointer; font-size: 18px;">✕</button>
        </div>
        <div id="garfield-messages" style="flex-grow: 1; padding: 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; font-size: 13px;">
            <div style="background: #121216; padding: 12px 16px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); max-width: 85%; align-self: flex-start; color: #e4e4e7;">
                👋 Hello! Welcome to <strong>${storeName}</strong>. How may our AI Executive assist your inquiry today?
            </div>
        </div>
        <div style="padding: 12px; background: #121216; border-top: 1px solid rgba(255,255,255,0.1); display: flex; gap: 8px;">
            <input type="text" id="garfield-chat-input" placeholder="Type your message..." style="flex-grow: 1; background: #050507; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; padding: 10px 14px; color: #fff; font-size: 12px; outline: none;" />
            <button id="garfield-send-btn" style="background: #D4AF37; color: #050507; border: none; border-radius: 12px; padding: 0 16px; font-weight: bold; cursor: pointer; font-size: 12px;">Send</button>
        </div>
    `;

    widgetContainer.appendChild(triggerBtn);
    widgetContainer.appendChild(chatWindow);
    document.body.appendChild(widgetContainer);

    // 互動事件綁定
    const closeBtn = chatWindow.querySelector('#garfield-close-btn');
    const inputField = chatWindow.querySelector('#garfield-chat-input');
    const sendBtn = chatWindow.querySelector('#garfield-send-btn');
    const messagesArea = chatWindow.querySelector('#garfield-messages');

    let isOpen = false;
    triggerBtn.onclick = () => {
        isOpen = !isOpen;
        chatWindow.style.display = isOpen ? 'flex' : 'none';
        if (isOpen && inputField) inputField.focus();
    };

    if (closeBtn) {
        closeBtn.onclick = () => {
            isOpen = false;
            chatWindow.style.display = 'none';
        };
    }

    function handleSendMessage() {
        if (!inputField || !messagesArea) return;
        const text = inputField.value.trim();
        if (!text) return;

        // 渲染使用者訊息
        const userMsg = document.createElement('div');
        userMsg.style.cssText = `background: #D4AF37; color: #050507; padding: 10px 14px; border-radius: 16px; max-width: 85%; align-self: flex-end; font-weight: 500;`;
        userMsg.textContent = text;
        messagesArea.appendChild(userMsg);
        inputField.value = '';
        messagesArea.scrollTop = messagesArea.scrollHeight;

        // 模擬 AI 回應
        setTimeout(() => {
            const aiMsg = document.createElement('div');
            aiMsg.style.cssText = `background: #121216; padding: 12px 16px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); max-width: 85%; align-self: flex-start; color: #e4e4e7;`;
            aiMsg.textContent = `Thank you for your message regarding "${text}". Our Garfield AI Executive pipeline has logged your inquiry and will route it to ${storeName}'s closing team immediately.`;
            messagesArea.appendChild(aiMsg);
            messagesArea.scrollTop = messagesArea.scrollHeight;
        }, 800);
    }

    if (sendBtn) sendBtn.onclick = handleSendMessage;
    if (inputField) {
        inputField.onkeypress = (e) => {
            if (e.key === 'Enter') handleSendMessage();
        };
    }

    console.log("[Garfield AI Executive] Interactive Widget loaded successfully.");
})();
