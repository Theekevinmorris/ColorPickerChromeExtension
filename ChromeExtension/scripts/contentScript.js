let isPickerActive = false;

function getElementColor(element) {
    const color = window.getComputedStyle(element).backgroundColor;
    return rgbToHex(color);
}

function rgbToHex(rgb) {
    // Handle rgb/rgba strings
    const matches = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!matches) return '';
    
    function componentToHex(c) {
        const hex = parseInt(c).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }
    
    return '#' + 
        componentToHex(matches[1]) + 
        componentToHex(matches[2]) + 
        componentToHex(matches[3]);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'startPicking') {
        isPickerActive = true;
        
        const clickHandler = (e) => {
            if (!isPickerActive) return;
            
            e.preventDefault();
            const color = getElementColor(e.target);
            chrome.runtime.sendMessage({ action: 'colorPicked', color: color });
            isPickerActive = false;
            document.removeEventListener('click', clickHandler);
            document.body.style.cursor = 'default';
        };
        
        document.addEventListener('click', clickHandler);
        document.body.style.cursor = 'crosshair';
        
        sendResponse({ status: 'success' });
    }
}); 