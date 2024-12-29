// Get references to DOM elements
const canvas = document.getElementById('paint-canvas');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('color-picker');
const brushSize = document.getElementById('brush-size');
const clearCanvas = document.getElementById('clear-canvas');
const saveDrawing = document.getElementById('save-drawing');
const pencilTool = document.getElementById('pencil-tool');
const eraserTool = document.getElementById('eraser-tool');
const rectTool = document.getElementById('rect-tool');
const circleTool = document.getElementById('circle-tool');
const lineTool = document.getElementById('line-tool');
const textTool = document.getElementById('text-tool');
const undoButton = document.getElementById('undo');
const redoButton = document.getElementById('redo');

// Set initial canvas size
canvas.width = window.innerWidth;
canvas.height = window.innerHeight - 60; // Adjust for toolbar height

// Drawing settings
let drawing = false;
let tool = 'pencil';
let currentColor = '#000000';
let currentBrushSize = 5;

// History for Undo/Redo
let history = [];
let redoStack = [];

// Push current canvas state to history
function saveHistory() {
    history.push(canvas.toDataURL());
    redoStack = []; // Clear redo stack after a new action
}

// Undo functionality
undoButton.addEventListener('click', () => {
    if (history.length > 0) {
        redoStack.push(canvas.toDataURL());
        const previousState = history.pop();
        const img = new Image();
        img.src = previousState;
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
        };
    }
});

// Redo functionality
redoButton.addEventListener('click', () => {
    if (redoStack.length > 0) {
        history.push(canvas.toDataURL());
        const nextState = redoStack.pop();
        const img = new Image();
        img.src = nextState;
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
        };
    }
});

// Event listeners for pencil and eraser
canvas.addEventListener('mousedown', (e) => {
    if (tool === 'pencil' || tool === 'eraser') {
        drawing = true;
        ctx.beginPath();
        ctx.moveTo(e.clientX, e.clientY - 60); // Adjust for toolbar height
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (!drawing) return;

    if (tool === 'pencil' || tool === 'eraser') {
        ctx.lineWidth = currentBrushSize;
        ctx.lineCap = 'round';
        ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : currentColor;
        ctx.lineTo(e.clientX, e.clientY - 60); // Adjust for toolbar height
        ctx.stroke();
    }
});

canvas.addEventListener('mouseup', () => {
    if (tool === 'pencil' || tool === 'eraser') {
        drawing = false;
        ctx.beginPath();
        saveHistory();
    }
});

// Shape and Text Tools
let startX, startY, drawingShape = false;

canvas.addEventListener('mousedown', (e) => {
    if (tool === 'rectangle' || tool === 'circle' || tool === 'line' || tool === 'text') {
        startX = e.clientX;
        startY = e.clientY - 60; // Offset for toolbar height
        if (tool === 'text') {
            const text = prompt('Enter your text:');
            if (text) {
                ctx.fillStyle = currentColor;
                ctx.font = `${currentBrushSize * 3}px Arial`;
                ctx.fillText(text, startX, startY);
                saveHistory();
            }
        } else {
            drawingShape = true;
        }
    }
});

canvas.addEventListener('mouseup', (e) => {
    if (!drawingShape) return;
    const endX = e.clientX;
    const endY = e.clientY - 60;

    ctx.beginPath();
    ctx.lineWidth = currentBrushSize;
    ctx.strokeStyle = currentColor;

    if (tool === 'rectangle') {
        ctx.strokeRect(startX, startY, endX - startX, endY - startY);
    } else if (tool === 'circle') {
        const radius = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
        ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
        ctx.stroke();
    } else if (tool === 'line') {
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
    }

    drawingShape = false;
    saveHistory();
});

// Tool selection
function activateTool(selectedTool) {
    document.querySelectorAll('.tool').forEach(tool => tool.classList.remove('active'));
    selectedTool.classList.add('active');
}

pencilTool.addEventListener('click', () => { tool = 'pencil'; activateTool(pencilTool); });
eraserTool.addEventListener('click', () => { tool = 'eraser'; activateTool(eraserTool); });
rectTool.addEventListener('click', () => { tool = 'rectangle'; activateTool(rectTool); });
circleTool.addEventListener('click', () => { tool = 'circle'; activateTool(circleTool); });
lineTool.addEventListener('click', () => { tool = 'line'; activateTool(lineTool); });
textTool.addEventListener('click', () => { tool = 'text'; activateTool(textTool); });

// Color picker and brush size
colorPicker.addEventListener('input', (e) => { currentColor = e.target.value; });
brushSize.addEventListener('input', (e) => { currentBrushSize = e.target.value; });

// Clear canvas
clearCanvas.addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    saveHistory();
});

// Save drawing
saveDrawing.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'drawing.png';
    link.href = canvas.toDataURL();
    link.click();
});

// Adjust canvas size on window resize
window.addEventListener('resize', () => {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 60;
    ctx.putImageData(imageData, 0, 0);
});
