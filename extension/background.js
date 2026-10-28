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

            const result = await response.json();
            console.log("Lead synced successfully:", result);
            
            // Optional: Notification or badge update
            chrome.action.setBadgeText({ text: "OK" });
            setTimeout(() => chrome.action.setBadgeText({ text: "" }), 2000);

        } catch (error) {
            console.error("Failed to sync lead to backend:", error);
        }
    }
});
