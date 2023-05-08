// Define canvas and context
const canvas = document.getElementById('map-canvas');
const context = canvas.getContext('2d');

// Define platform properties
const platforms = [];
let selectedPlatformIndex = -1;

// Define grid properties
const gridSize = 100;
const gridColor = '#999';

// Define canvas background color
const backgroundColor = '#222';

// Add event listener for the add platform button
const addPlatformBtn = document.getElementById('add-platform-btn');
addPlatformBtn.addEventListener('click', addPlatform);

// Add event listener for the update platform button
const updatePlatformBtn = document.getElementById('update-platform-btn');
updatePlatformBtn.addEventListener('click', updatePlatform);

// Add event listener for the delete platform button
const deletePlatformBtn = document.getElementById('delete-platform-btn');
deletePlatformBtn.addEventListener('click', deletePlatform);

// Add event listener for the existing platforms select
const existingPlatformsSelect = document.getElementById('existing-platforms-select');
existingPlatformsSelect.addEventListener('change', updateSelectedPlatform);

// Add event listener for the clear canvas button
const clearCanvasBtn = document.getElementById('clear-canvas-btn');
clearCanvasBtn.addEventListener('click', clearCanvas);

// Add event listener for the draw platforms button
const drawPlatformsBtn = document.getElementById('draw-platforms-btn');
drawPlatformsBtn.addEventListener('click', drawPlatforms);

// Add event listener for the save image button
const saveImageBtn = document.getElementById('save-image-btn');
saveImageBtn.addEventListener('click', saveImage);

// Define add platform function
function addPlatform() {
  const platformX = parseInt(document.getElementById('platform-x-input').value);
  const platformY = parseInt(document.getElementById('platform-y-input').value);
  const platformWidth = parseInt(document.getElementById('platform-width-input').value);
  const platformHeight = parseInt(document.getElementById('platform-height-input').value);
  const platformColor = document.getElementById('platform-color-input').value;

  if (!isNaN(platformX) && !isNaN(platformY) && !isNaN(platformWidth) && !isNaN(platformHeight)) {
    platforms.push({x: platformX, y: platformY, width: platformWidth, height: platformHeight, color: platformColor});
    selectedPlatformIndex = platforms.length - 1;
    updatePlatformsList();
    updateSelectedPlatform();
  }
}

// Define update platform function
function updatePlatform() {
  const platformIndex = parseInt(existingPlatformsSelect.value);

  if (!isNaN(platformIndex) && platformIndex >= 0 && platformIndex < platforms.length) {
    const platformX = parseInt(document.getElementById('existing-platform-x-input').value);
    const platformY = parseInt(document.getElementById('existing-platform-y-input').value);
    const platformWidth = parseInt(document.getElementById('existing-platform-width-input').value);
    const platformHeight = parseInt(document.getElementById('existing-platform-height-input').value);
    const platformColor = document.getElementById('existing-platform-color-input').value;

    if (!isNaN(platformX) && !isNaN(platformY) && !isNaN(platformWidth) && !isNaN(platformHeight)) {
      platforms[platformIndex] = {x: platformX, y: platformY, width: platformWidth, height: platformHeight, color: platformColor};
      selectedPlatformIndex = platformIndex;
      updatePlatformsList();
      updateSelectedPlatform();
    }
  }
}

// Define delete platform function
function deletePlatform() {
  if (selectedPlatformIndex >= 0 && selectedPlatformIndex < platforms.length) {
    platforms.splice(selectedPlatformIndex, 1);
    selectedPlatformIndex = -1;
    updatePlatformsList();
    clearCanvas();
  }
}

// Define update platforms list function
function updatePlatformsList() {
    existingPlatformsSelect.innerHTML = '';
    platforms.forEach((platform, index) => {
    const option = document.createElement('option');
    option.text = Platform ${index + 1};
    option.value = index;
    existingPlatformsSelect.add(option);
    });
    }
    
    // Define update selected platform function
    function updateSelectedPlatform() {
    const platformIndex = parseInt(existingPlatformsSelect.value);
    
    if (!isNaN(platformIndex) && platformIndex >= 0 && platformIndex < platforms.length) {
    selectedPlatformIndex = platformIndex;
    const platform = platforms[selectedPlatformIndex];
    document.getElementById('existing-platform-x-input').value = platform.x;
    document.getElementById('existing-platform-y-input').value = platform.y;
    document.getElementById('existing-platform-width-input').value = platform.width;
    document.getElementById('existing-platform-height-input').value = platform.height;
    document.getElementById('existing-platform-color-input').value = platform.color;
    }
    }
    
    // Define clear canvas function
    function clearCanvas() {
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Define draw platforms function
    function drawPlatforms() {
    clearCanvas();
    context.fillStyle = gridColor;
    for (let x = 0; x <= canvas.width; x += gridSize) {
    context.fillRect(x, 0, 1, canvas.height);
    }
    for (let y = 0; y <= canvas.height; y += gridSize) {
    context.fillRect(0, y, canvas.width, 1);
    }
    platforms.forEach((platform, index) => {
    context.fillStyle = platform.color;
    context.fillRect(platform.x, platform.y, platform.width, platform.height);
    });
    }
    
    // Define save image function
    function saveImage() {
    const link = document.createElement('a');
    link.download = 'map.png';
    link.href = canvas.toDataURL();
    link.click();
    }