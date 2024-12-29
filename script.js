// Get references to DOM elements
const canvas = document.getElementById('paint-canvas');
const ctx = canvas.getContext('2d');

// Toolbar and controls
const tools = {
    pencil: document.getElementById('pencil-tool'),
    eraser: document.getElementById('eraser-tool'),
    rect: document.getElementById('rect-tool'),
    fill: document.getElementById('fill-tool'),
    circle: document.getElementById('circle-tool'),
    line: document.getElementById('line-tool'),
    text: document.getElementById('text-tool'),
    spray: document.getElementById('spray-brush'),
    pattern: document.getElementById('pattern-brush'),
    // gradient: document.getElementById('gradient-fill'),
    eyedropper: document.getElementById('eyedropper-tool'),
};
const controls = {
    color: document.getElementById('color-picker'),
    brushSize: document.getElementById('brush-size'),
    opacity: document.getElementById('opacity-slider'),
    lineStyle: document.getElementById('line-style'),
};
const actions = {
    undo: document.getElementById('undo'),
    redo: document.getElementById('redo'),
    clear: document.getElementById('clear-canvas'),
    save: document.getElementById('save-drawing'),
};

// Canvas setup
canvas.width = window.innerWidth;
canvas.height = window.innerHeight - 60;

// State variables
let drawing = false;
let tool = 'pencil';
let currentColor = '#000000';
let brushSize = 5;
let opacity = 1;
let startX, startY;
let history = [];
let redoStack = [];
let patternBrush;

// Save history state
function saveHistory() {
    history.push(canvas.toDataURL());
    redoStack = [];
}

// Activate tool
function activateTool(selectedTool) {
    Object.values(tools).forEach((button) => button.classList.remove('active'));
    selectedTool.classList.add('active');
}

// Clear canvas
actions.clear.addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    saveHistory();
});

// Save drawing
actions.save.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'drawing.png';
    link.href = canvas.toDataURL();
    link.click();
});

// Undo functionality
actions.undo.addEventListener('click', () => {
    if (history.length > 0) {
        redoStack.push(history.pop());
        const img = new Image();
        img.src = history[history.length - 1] || '';
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
        };
    }
});

// Redo functionality
actions.redo.addEventListener('click', () => {
    if (redoStack.length > 0) {
        const img = new Image();
        img.src = redoStack.pop();
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
        };
        saveHistory();
    }
});

// Eyedropper Tool
canvas.addEventListener('mousedown', (e) => {
    if (tool === 'eyedropper') {
        const imageData = ctx.getImageData(e.clientX, e.clientY - 60, 1, 1).data;
        const [r, g, b] = imageData;
        currentColor = `rgb(${r}, ${g}, ${b})`;
        controls.color.value = rgbToHex(r, g, b);
        activateTool(tools.pencil); // Reset tool to pencil after picking color
        tool = 'pencil';
    }
});

// RGB to Hex converter
function rgbToHex(r, g, b) {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
}

// Text Tool Logic
canvas.addEventListener('mousedown', (e) => {
    if (tool === 'text') {
        const text = prompt('Enter text:');
        if (text) {
            ctx.font = `${brushSize * 3}px Arial`;
            ctx.fillStyle = currentColor;
            ctx.globalAlpha = opacity;
            ctx.fillText(text, e.clientX, e.clientY - 60);
            saveHistory();
        }
    }
});

// Drawing logic for shapes and tools
canvas.addEventListener('mousedown', (e) => {
    if (tool !== 'text' && tool !== 'eyedropper') {
        drawing = true;
        startX = e.clientX;
        startY = e.clientY - 60;
        ctx.beginPath();
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (!drawing) return;

    const endX = e.clientX;
    const endY = e.clientY - 60;

    ctx.lineWidth = brushSize;
    ctx.globalAlpha = opacity;

    if (tool === 'pencil') {
        ctx.strokeStyle = currentColor;
        ctx.lineCap = 'round';
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(endX, endY);
    } else if (tool === 'eraser') {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineCap = 'round';
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(endX, endY);
    } else if (tool === 'spray') {
        sprayBrushLogic(e);
    } else if (tool === 'pattern') {
        patternBrushLogic(e);
    }
});

canvas.addEventListener('mouseup', (e) => {
    const endX = e.clientX;
    const endY = e.clientY - 60;

    ctx.lineWidth = brushSize;
    ctx.globalAlpha = opacity;

    if (tool === 'rect') {
        ctx.strokeStyle = currentColor;
        ctx.strokeRect(startX, startY, endX - startX, endY - startY);
    } else if (tool === 'circle') {
        const radius = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
        ctx.beginPath();
        ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = currentColor;
        ctx.stroke();
    } else if (tool === 'line') {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = currentColor;
        ctx.stroke();
    }

    if (drawing) saveHistory();
    drawing = false;
    ctx.beginPath();
});

// Spray Brush Logic
function sprayBrushLogic(e) {
    const centerX = e.clientX;
    const centerY = e.clientY - 60;
    for (let i = 0; i < 30; i++) {
        const offsetX = Math.random() * brushSize - brushSize / 2;
        const offsetY = Math.random() * brushSize - brushSize / 2;
        ctx.globalAlpha = opacity;
        ctx.fillStyle = currentColor;
        ctx.fillRect(centerX + offsetX, centerY + offsetY, 1, 1);
    }
}

// Flood Fill Logic
function floodFill(x, y, fillColor) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = imageData.width;

    const stack = [[x, y]];
    const targetColor = getPixelColor(data, x, y, width);

    // Check if the target color is the same as the fill color
    if (colorsMatch(targetColor, fillColor)) return;

    while (stack.length) {
        const [currentX, currentY] = stack.pop();
        const currentColor = getPixelColor(data, currentX, currentY, width);

        if (colorsMatch(currentColor, targetColor)) {
            setPixelColor(data, currentX, currentY, fillColor, width);

            // Add neighboring pixels to the stack
            stack.push([currentX + 1, currentY]);
            stack.push([currentX - 1, currentY]);
            stack.push([currentX, currentY + 1]);
            stack.push([currentX, currentY - 1]);
        }
    }

    // Update the canvas with the filled area
    ctx.putImageData(imageData, 0, 0);
}

// Helper Function: Get Pixel Color
function getPixelColor(data, x, y, width) {
    const index = (y * width + x) * 4;
    return [data[index], data[index + 1], data[index + 2], data[index + 3]]; // RGBA
}

// Helper Function: Set Pixel Color
function setPixelColor(data, x, y, fillColor, width) {
    const index = (y * width + x) * 4;
    data[index] = fillColor[0]; // Red
    data[index + 1] = fillColor[1]; // Green
    data[index + 2] = fillColor[2]; // Blue
    data[index + 3] = fillColor[3]; // Alpha
}

// Helper Function: Check Color Match
function colorsMatch(color1, color2) {
    return color1[0] === color2[0] && color1[1] === color2[1] && color1[2] === color2[2] && color1[3] === color2[3];
}


// Fill Entire Canvas
tools.fill.addEventListener('click', () => {
    tool = 'fill';
    activateTool(tools.fill);
});

// Canvas Click for Flood Fill
canvas.addEventListener('mousedown', (e) => {
    if (tool === 'fill') {
        const x = Math.floor(e.clientX);
        const y = Math.floor(e.clientY - 60);

        // Convert the fill color to RGBA
        const fillColor = hexToRGBA(currentColor, opacity);

        floodFill(x, y, fillColor);
        saveHistory();
    }
});

// Helper Function: Convert Hex to RGBA
function hexToRGBA(hex, alpha = 1) {
    const bigint = parseInt(hex.slice(1), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    const a = Math.floor(alpha * 255);
    return [r, g, b, a];
}

// Pattern Brush Logic
tools.pattern.addEventListener('click', () => {
    tool = 'pattern';
    activateTool(tools.pattern);

    const img = new Image();
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                img.src = e.target.result;
                img.onload = () => {
                    patternBrush = ctx.createPattern(img, 'repeat');
                };
            };
            reader.readAsDataURL(file);
        }
    });
    fileInput.click();
});

function patternBrushLogic(e) {
    if (patternBrush) {
        ctx.fillStyle = patternBrush;
        ctx.fillRect(e.clientX - 10, e.clientY - 70, brushSize, brushSize);
    }
}

// Gradient Fill Logic
// tools.gradient.addEventListener('click', () => {
//     tool = 'gradient';
//     activateTool(tools.gradient);

//     const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
//     const gradientStartColor = prompt('Enter the start color for the gradient (e.g., #ff0000):', '#ff0000');
//     const gradientEndColor = prompt('Enter the end color for the gradient (e.g., #0000ff):', '#0000ff');
//     gradient.addColorStop(0, gradientStartColor);
//     gradient.addColorStop(1, gradientEndColor);

//     ctx.fillStyle = gradient;
//     ctx.fillRect(0, 0, canvas.width, canvas.height);
//     saveHistory();
// });


// Resizable Canvas Implementation
const canvasWrapper = document.createElement('div');
canvasWrapper.id = 'canvas-wrapper';
canvasWrapper.style.position = 'relative';
canvasWrapper.style.display = 'inline-block';
canvasWrapper.style.border = '1px solid #ccc';
canvasWrapper.style.width = `${canvas.width}px`;
canvasWrapper.style.height = `${canvas.height}px`;

canvas.parentNode.replaceChild(canvasWrapper, canvas);
canvasWrapper.appendChild(canvas);

const resizeHandle = document.createElement('div');
resizeHandle.id = 'resize-handle';
resizeHandle.style.position = 'absolute';
resizeHandle.style.bottom = '0';
resizeHandle.style.right = '0';
resizeHandle.style.width = '20px';
resizeHandle.style.height = '20px';
resizeHandle.style.cursor = 'se-resize';
resizeHandle.style.background = 'rgba(0, 0, 0, 0.3)';
canvasWrapper.appendChild(resizeHandle);

let isResizing = false;

// Mouse down event to start resizing
resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    document.body.style.cursor = 'se-resize';
    e.preventDefault();
});

// Mouse move event to resize the canvas
window.addEventListener('mousemove', (e) => {
    if (!isResizing) return;

    // Save the current canvas content
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    tempCtx.drawImage(canvas, 0, 0);

    // Calculate new dimensions
    const rect = canvasWrapper.getBoundingClientRect();
    const newWidth = Math.max(e.clientX - rect.left, 100); // Minimum width of 100px
    const newHeight = Math.max(e.clientY - rect.top, 100); // Minimum height of 100px

    // Resize canvas and wrapper
    canvas.width = newWidth;
    canvas.height = newHeight;
    canvasWrapper.style.width = `${newWidth}px`;
    canvasWrapper.style.height = `${newHeight}px`;

    // Redraw the saved content
    ctx.drawImage(tempCanvas, 0, 0);
});

// Mouse up event to stop resizing
window.addEventListener('mouseup', () => {
    if (isResizing) {
        isResizing = false;
        document.body.style.cursor = 'default';
        saveHistory();
    }
});
console.log('Active Element:', document.activeElement);
document.addEventListener('paste', () => console.log('Paste event triggered.'));
// Listen for paste events globally
document.addEventListener('paste', (e) => {
    console.log('Paste event triggered'); // Debugging log

    const clipboardData = e.clipboardData || window.clipboardData;
    const items = clipboardData.items;

    // Check each item in the clipboard
    for (let i = 0; i < items.length; i++) {
        const item = items[i];

        if (item.type.startsWith('image/')) {
            console.log('Image found in clipboard'); // Debugging log

            const blob = item.getAsFile(); // Get the image file
            const img = new Image();

            // Read the image as a data URL
            const reader = new FileReader();
            reader.onload = (event) => {
                img.src = event.target.result;

                img.onload = () => {
                    // Draw the image onto the canvas
                    ctx.clearRect(0, 0, canvas.width, canvas.height); // Optionally clear canvas
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    saveHistory(); // Save the current state for undo/redo
                };
            };

            reader.readAsDataURL(blob);
            break; // Stop after the first image
        }
    }
});

// Prevent mousedown conflicts during paste
canvas.addEventListener('mousedown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        return; // Stop the drawing logic
    }

    // Proceed with the existing mousedown logic for drawing
    if (tool !== 'text' && tool !== 'eyedropper') {
        drawing = true;
        startX = e.clientX;
        startY = e.clientY - 60;
        ctx.beginPath();
    }
});


// Activate tools
Object.entries(tools).forEach(([name, button]) => {
    button.addEventListener('click', () => {
        tool = name;
        activateTool(button);
    });
});

// Handle control changes
controls.color.addEventListener('input', (e) => {
    currentColor = e.target.value;
});

controls.brushSize.addEventListener('input', (e) => {
    brushSize = e.target.value;
});

controls.opacity.addEventListener('input', (e) => {
    opacity = parseFloat(e.target.value);
});
