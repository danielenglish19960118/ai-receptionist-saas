// Create context menu item on installation
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "captureToGarfield",
        title: "Send selected text to Garfield CRM",
        contexts: ["selection"]
    });
});

// Handle context menu click event
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "captureToGarfield") {
        const selectedText = info.selectionText;
        const currentUrl = tab.url;

        // 從 chrome.storage 讀取用戶設定，若無則使用預設值
        chrome.storage.local.get(['backendUrl', 'userEmail', 'clientKey'], async (data) => {
            const backendEndpoint = (data.backendUrl || "https://ai-receptionist-saas-ivory.vercel.app") + "/api/extension/lead";
            const userEmail = data.userEmail || "extension_visitor@browser.com";
            const clientKey = data.clientKey || "";

            try {
                const response = await fetch(backendEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': clientKey ? `Bearer ${clientKey}` : ''
                    },
                    body: JSON.stringify({
                        url: currentUrl,
                        selectedText: selectedText,
                        userEmail: userEmail
                    })
                });

                const responseText = await response.text();
                let result;
                try {
                    result = JSON.parse(responseText);
                } catch (e) {
                    result = { success: false, message: responseText };
                }

                console.log("Lead synced successfully:", result);
                
                // 成功回饋（相容 Manifest V3 的 chrome.action）
                const actionApi = chrome.action || chrome.browserAction;
                if (actionApi && typeof actionApi.setBadgeText === 'function') {
                    actionApi.setBadgeText({ text: "OK" });
                    actionApi.setBadgeBackgroundColor({ color: "#10B981" }); // 綠色成功提示
                    setTimeout(() => actionApi.setBadgeText({ text: "" }), 2500);
                }

            } catch (error) {
                console.error("Failed to sync lead to backend:", error);
                
                // 失敗回饋（紅色提示）
                const actionApi = chrome.action || chrome.browserAction;
                if (actionApi && typeof actionApi.setBadgeText === 'function') {
                    actionApi.setBadgeText({ text: "ERR" });
                    actionApi.setBadgeBackgroundColor({ color: "#EF4444" });
                    setTimeout(() => actionApi.setBadgeText({ text: "" }), 3000);
                }
            }
        });
    }
});
