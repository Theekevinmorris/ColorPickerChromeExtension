document.addEventListener('DOMContentLoaded', () => {
    const startPickerButton = document.getElementById('startPicker');
    const colorHexInput = document.getElementById('colorHex');
    let isPickerActive = false;

    // Add stop button
    const stopButton = document.createElement('button');
    stopButton.id = 'stopPicker';
    stopButton.textContent = 'Stop Picking';
    stopButton.style.display = 'none';
    startPickerButton.parentNode.insertBefore(stopButton, startPickerButton.nextSibling);

    chrome.storage.local.get(['pickedColor', 'isPickerActive'], (result) => {
        if (result.pickedColor) {
            colorHexInput.value = result.pickedColor;
            colorHexInput.style.backgroundColor = result.pickedColor;
            colorHexInput.style.color = getContrastColor(result.pickedColor);
        }
        // Restore picker state
        if (result.isPickerActive) {
            togglePickerState(true);
        }
    });

    function togglePickerState(active) {
        console.log('Toggling picker state:', active);
        isPickerActive = active;
        startPickerButton.style.display = active ? 'none' : 'block';
        stopButton.style.display = active ? 'block' : 'none';
        chrome.storage.local.set({ isPickerActive: active });
    }

    async function injectContentScriptIfNeeded(tab) {
        try {
            console.log('Checking if content script is loaded...');
            // Try sending a test message to check if content script is loaded
            await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
            console.log('Content script is already loaded');
        } catch (error) {
            console.log('Content script not loaded, injecting...');
            // If content script isn't loaded, inject it
            // Inject html2canvas before the content script so it's available
            // as soon as the script executes. Executing in the opposite order
            // could lead to `html2canvas` being undefined if the user triggers
            // the picker before the second injection completes.
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['libs/html2canvas.min.js']
            });
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['scripts/contentScript.js']
            });
            console.log('Content script injection complete');
        }
    }

    startPickerButton.addEventListener('click', async () => {
        try {
            console.log('Start button clicked');
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            console.log('Current tab:', tab.url);
            
            // Make sure we can inject into this tab
            if (!tab.url.startsWith('chrome://') && !tab.url.startsWith('edge://')) {
                await injectContentScriptIfNeeded(tab);
                console.log('Sending startPicking message');
                await chrome.tabs.sendMessage(tab.id, { action: 'startPicking' });
                togglePickerState(true);
            } else {
                console.error('Cannot access this page due to browser restrictions');
            }
        } catch (error) {
            console.error('Error starting picker:', error);
        }
    });

    stopButton.addEventListener('click', async () => {
        try {
            console.log('Stop button clicked');
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            await chrome.tabs.sendMessage(tab.id, { action: 'stopPicking' });
            togglePickerState(false);
        } catch (error) {
            console.error('Error stopping picker:', error);
            togglePickerState(false);
        }
    });

    // Listen for color picked message
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('Received message:', request);
        if (request.action === 'colorPicked') {
            colorHexInput.value = request.color;
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