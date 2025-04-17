// This file will contain any JavaScript functionality for the popup
document.addEventListener('DOMContentLoaded', () => {
    const startPickerButton = document.getElementById('startPicker');
    const colorHexInput = document.getElementById('colorHex');

    startPickerButton.addEventListener('click', async () => {
        // Get the current active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Send message to content script to start picking
        chrome.tabs.sendMessage(tab.id, { action: 'startPicking' });
        
        // Close the popup to allow for picking
        window.close();
    });

    // Listen for color picked message
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'colorPicked') {
            colorHexInput.value = request.color;
        }
    });
}); 