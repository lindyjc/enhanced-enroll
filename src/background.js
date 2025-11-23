"use strict"

function setBadgeText(enabled) {
    const text = enabled ? "ON" : "OFF"
    void chrome.action.setBadgeText({ text: text })
}

function startUp() {
    chrome.storage.sync.get("enabled", (data) => {
        setBadgeText(!!data.enabled)
    })
}

// Ensure the background script always runs 
chrome.runtime.onStartup.addListener(startUp)
chrome.runtime.onInstalled.addListener(startUp)

// chrome.tabs.onUpdated.addListener((tabId, tab) => {
//     if (tab.url && tab.url.includes("enroll.wisc.edu/search")) {
//         // Populate Madgrades
//     }
//     if (tab.url && tab.url.includes("enroll.wisc.edu/scheduler")) {
//         // Get schedule info 
//     }
// })


