// Get references to DOM elements
const canvas = document.getElementById('paint-canvas');
const ctx = canvas.getContext('2d');

// Toolbar and controls
const tools = {
    pencil: document.getElementById('pencil-tool'),
    eraser: document.getElementById('eraser-tool'),
    rect: document.getElementById('rect-tool'),
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
