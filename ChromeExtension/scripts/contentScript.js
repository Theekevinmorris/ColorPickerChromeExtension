console.log('Content script loaded');
let isPickerActive = false;
let moveHandler, clickHandler, preventEvents;

async function getPixelColor(x, y) {
    try {
        console.log('Getting pixel color at', x, y);
        // Take a screenshot of the visible tab
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        // Get the device pixel ratio
        const dpr = window.devicePixelRatio || 1;
        
        // Set canvas size to match the viewport
        const rect = document.documentElement.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        
        // Scale the context to account for the device pixel ratio
        context.scale(dpr, dpr);
        
        // Draw the current page to the canvas
        console.log('Creating screenshot with html2canvas...');
        const renderedCanvas = await html2canvas(document.documentElement, {
            useCORS: true,
            scale: dpr,
            x: window.scrollX,
            y: window.scrollY,
            width: rect.width,
            height: rect.height,
            backgroundColor: null,
            logging: true
        });
        
        // Get the pixel color at the clicked position
        const pixelData = renderedCanvas.getContext('2d').getImageData(x * dpr, y * dpr, 1, 1).data;
        const color = rgbToHex(`rgb(${pixelData[0]}, ${pixelData[1]}, ${pixelData[2]})`);
        console.log('Got color:', color);
        return color;
    } catch (e) {
        console.error('Error getting pixel color:', e);
        return null;
    }
}

function rgbToHex(rgb) {
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

// Create overlay element for highlighting
const overlay = document.createElement('div');
overlay.style.cssText = `
    position: fixed;
    pointer-events: none;
    z-index: 999999;
    width: 20px;
    height: 20px;
    border: 2px solid #000;
    border-radius: 50%;
    display: none;
    transform: translate(-50%, -50%);
`;
document.body.appendChild(overlay);

function cleanup() {
    console.log('Cleaning up picker');
    isPickerActive = false;
    overlay.style.display = 'none';
    if (moveHandler) document.removeEventListener('mousemove', moveHandler, { capture: true });
    if (preventEvents) {
        const events = ['click', 'mousedown', 'mouseup', 'mousemove', 'touchstart', 'touchend', 'touchmove', 'contextmenu'];
        events.forEach(eventType => {
            document.removeEventListener(eventType, preventEvents, { capture: true });
        });
    }
    if (clickHandler) document.removeEventListener('click', clickHandler, { capture: true });
    document.body.style.cursor = 'default';
}

// Ensure cleanup on page unload
window.addEventListener('unload', cleanup);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Received message:', request);
    if (request.action === 'ping') {
        console.log('Ping received, sending response');
        sendResponse({ status: 'ok' });
        return true;
    } else if (request.action === 'startPicking' && !isPickerActive) {
        console.log('Starting picker');
        isPickerActive = true;
        
        preventEvents = (e) => {
            if (isPickerActive) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        };
        
        // Prevent all possible events
        const events = ['click', 'mousedown', 'mouseup', 'mousemove', 'touchstart', 'touchend', 'touchmove', 'contextmenu'];
        events.forEach(eventType => {
            document.addEventListener(eventType, preventEvents, { capture: true });
        });
        
        // Show and update overlay position
        moveHandler = (e) => {
            if (!isPickerActive) return;
            
            overlay.style.display = 'block';
            overlay.style.left = e.clientX + 'px';
            overlay.style.top = e.clientY + 'px';
        };
        
        document.addEventListener('mousemove', moveHandler, { capture: true });
        
        clickHandler = async (e) => {
            if (!isPickerActive) return;
            
            console.log('Click detected at', e.clientX, e.clientY);
            e.preventDefault();
            e.stopPropagation();
            
            const color = await getPixelColor(e.clientX, e.clientY);
            if (color) {
                console.log('Sending picked color:', color);
                // Store the color in chrome.storage
                chrome.storage.local.set({ pickedColor: color }, () => {
                    // Then send the message
                    chrome.runtime.sendMessage({ action: 'colorPicked', color: color });
                });
            }
            
            return false;
        };
        
        document.addEventListener('click', clickHandler, { capture: true });
        document.body.style.cursor = 'crosshair';
        
        console.log('Picker started');
        sendResponse({ status: 'success' });
        return true;
    } else if (request.action === 'stopPicking') {
        console.log('Stopping picker');
        cleanup();
        sendResponse({ status: 'success' });
        return true;
    }
}); 