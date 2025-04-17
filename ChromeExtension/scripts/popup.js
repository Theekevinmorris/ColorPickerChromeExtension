// This file will contain any JavaScript functionality for the popup
document.addEventListener('DOMContentLoaded', () => {
    const startPickerButton = document.getElementById('startPicker');
    const colorHexInput = document.getElementById('colorHex');

    // Load any previously picked color
    chrome.storage.local.get(['pickedColor'], (result) => {
        if (result.pickedColor) {
            colorHexInput.value = result.pickedColor;
            // Also update the input's background color to show the color
            colorHexInput.style.backgroundColor = result.pickedColor;
            colorHexInput.style.color = getContrastColor(result.pickedColor);
        }
    });

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
            // Update the input's background color
            colorHexInput.style.backgroundColor = request.color;
            colorHexInput.style.color = getContrastColor(request.color);
        }
    });
});

// Helper function to determine if we should use black or white text
function getContrastColor(hexcolor) {
    // Remove the # if present
    hexcolor = hexcolor.replace('#', '');
    
    // Convert to RGB
    const r = parseInt(hexcolor.substr(0, 2), 16);
    const g = parseInt(hexcolor.substr(2, 2), 16);
    const b = parseInt(hexcolor.substr(4, 2), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return black for bright colors, white for dark colors
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
} 