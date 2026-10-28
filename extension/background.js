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
        const userEmail = "extension_visitor@browser.com"; // Can be dynamic if user logged in

        const backendEndpoint = "https://ai-receptionist-saas-ivory.vercel.app/api/extension/lead";

        try {
            const response = await fetch(backendEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    url: currentUrl,
                    selectedText: selectedText,
                    userEmail: userEmail
                })
            });

            // 先以文字讀取回應，避免直接 JSON.parse 失敗
            const responseText = await response.text();
            let result;
            try {
                result = JSON.parse(responseText);
            } catch (e) {
                result = responseText; // 如果不是 JSON 格式，就當作純文字處理
            }

            console.log("Lead synced successfully:", result);
            
            // 成功回饋（相容性檢查 + 安全保護）
            const actionApi = chrome.action || chrome.browserAction;
            if (actionApi && typeof actionApi.setBadgeText === 'function') {
                actionApi.setBadgeText({ text: "OK" });
                setTimeout(() => actionApi.setBadgeText({ text: "" }), 2000);
            }

        } catch (error) {
            console.error("Failed to sync lead to backend:", error);
        }
    }
});
