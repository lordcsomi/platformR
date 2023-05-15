//--------------------------------------------------------------------------------
// SETUP
//--------------------------------------------------------------------------------
const socket = io();
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = 'high';
ctx.scale(1, 1);
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

//debug display
const stats = document.getElementById('stats');
const nameDebug = document.getElementById('nameInput');
const fps = document.getElementById('fps');
const serverFPS = document.getElementById('server');
const latency = document.getElementById('latency');
const position = document.getElementById('position');
const velocity = document.getElementById('velocity');
const acceleration = document.getElementById('acceleration');
const grounded = document.getElementById('grounded');
const colisionDisplay = document.getElementById('colisionDisplay');

// settings
const settingsContainer = document.querySelector('.settings-container');
const options = document.querySelectorAll('.settings-options li');
const backToHome = document.getElementById('homeButton');
const toggleFullscreen = document.getElementById('fullScreenButton');
const toggleDebug = document.getElementById('debugDisplayButton');
const toggleMusic = document.getElementById('music');
const toggleSound = document.getElementById('sound');
const toggleKeyboard = document.getElementById('virtualKeyboardButton');
const toggleRender = document.getElementById('renderButton');
const prediction = document.getElementById('predictionButton');

// name form
const landingPage = document.getElementById('landing-page-container');
const nameInput = document.getElementById('name');
const singlePlayerButton = document.getElementById('singlePlayer');
const multiPlayerButton = document.getElementById('multiPlayer');

// virtual joystick

//hotbar
const hotbar = document.getElementById('hotbar');
const hotbarSlots = document.querySelectorAll('.hotbar-slot');

var officialState = {};
var predictedState = {};
var invalidPositions = [];
var keys = [];
var KEYS = {
  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40,
  SPACE: 32,
  SHIFT: 16,
  CTRL: 17,
};
var mouse = {
  x: undefined,
  y: undefined,
  click: false,
  clickX: undefined,
  clickY: undefined
};
var platforms = [];
var flags = [];
flags = [
  {x: 0, y: 400, width: 30, height: 70, color: 'FireBrick'},
  {x: 1000, y: 400, width: 30, height: 70, color: 'DodgerBlue'},
]
var maps = [];
var currentMap = 'lobby';

var player = {} // the player object that the client controls
var mode = 'main menu';
var render = true
var lastUpdate = Date.now();
var lastRender = Date.now();
var predict = true;
var lastPredict = Date.now();
var predicts = 0;
var renders = 0;
var serverUpdate = 0;
var fpsInterval = 1000; // 1 second

var camera = {
  x: 0,
  y: 0,
  width: canvas.width,
  height: canvas.height,
  effects: {
    shake: {
      active: false,
      intensity: 0,
      duration: 0,
      time: 0,
      x: 0,
      y: 0
    },
    zoom: {
      active: false,
      intensity: 0,
      duration: 0,
      time: 0,
      x: 0,
      y: 0
    }
  },
  renderWidth: canvas.width,
  renderHeight: canvas.height,
}
var validName = {
  'minLength': 3,
  'maxLength': 20,
  'anonymous': false,
  'allowedCharacters': 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_ -'
};
var debug = true;

//--------------------------------------------------------------------------------
// PAGE LOAD
//--------------------------------------------------------------------------------
function getCookie(name) {
  var value = "; " + document.cookie;
  var parts = value.split("; " + name + "=");
  if (parts.length == 2) return parts.pop().split(";").shift();
}

window.onload = function() {
  if (navigator.userAgent.match(/Android/i) ||
      navigator.userAgent.match(/webOS/i) ||
      navigator.userAgent.match(/iPhone/i) ||
      navigator.userAgent.match(/iPad/i) ||
      navigator.userAgent.match(/iPod/i) ||
      navigator.userAgent.match(/BlackBerry/i) ||
      navigator.userAgent.match(/Windows Phone/i)) {
    mobile = true;
  };
  if (getCookie('name') != '') {
    player.name = getCookie('name');
    nameInput.value = getCookie('name');
    if (nameInput.value == 'undefined') {
      nameInput.value = '';
      console.log('no name found in cookies');
    } else {
      console.log('loaded name from cookies', getCookie('name'));
    }
  } else {
    console.log('no name found in cookies');
  }
  socket.emit('screenSize', {width: window.innerWidth, height: window.innerHeight});
}

//--------------------------------------------------------------------------------
// EVENT LISTENERS
//--------------------------------------------------------------------------------
  
window.addEventListener('keydown', function(e) {
  keys[e.keyCode] = true;
});
window.addEventListener('keyup', function(e) {
  keys[e.keyCode] = false;
});
window.addEventListener('mousemove', function(e) {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  if (mouse.click === true) {
    mouse.clickX = e.clientX;
    mouse.clickY = e.clientY;
    console.log('angle', radiansToDegrees(angleBetweenPoints(player.x - camera.x + player.width / 2, player.y - camera.y + player.height / 2, mouse.clickX, mouse.clickY))) // problem here
  }
});
window.addEventListener('mousedown', function(e) {
  if (!canvas.contains(e.target)) {
    keys = [];
    //console.log('mouse outside of canvas');
  } else {
    mouse.click = true;
    mouse.clickX = e.clientX;
    mouse.clickY = e.clientY;
    console.log('angle', radiansToDegrees(angleBetweenPoints(player.x - camera.x + player.width / 2, player.y - camera.y + player.height / 2, mouse.clickX, mouse.clickY))) // problem here
  }
});
window.addEventListener('mouseup', function(e) {
  mouse.click = false;

});
window.addEventListener("resize", function() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  camera.width = canvas.width;
  camera.height = canvas.height;
  socket.emit('screenSize', {width: window.innerWidth, height: window.innerHeight});
  updateCamera();
  console.log('resized');
});

document.addEventListener("contextmenu", function(event) {
  event.preventDefault();
}, false);
document.addEventListener('visibilitychange', function() {
  if (document.hidden) {
    keys = [];
    socket.emit('tabHidden');
    console.log('tab hidden');
  } else {
    keys = [];
    socket.emit('tabVisible');
    console.log('tab visible');
  }
});
singlePlayerButton.addEventListener('click', function() {
  if (nameInput.value.length > 0) {
    mode = 'singlePlayer';
    myName = nameInput.value;
    player.name = myName;
    console.log('my name is ' + myName);
    landingPage.style.display = 'none'  ;
    game.style.display = 'block';
    frame();
  }
});
multiPlayerButton.addEventListener('click', function() {
  const name = nameInput.value;
  if (name.length < validName.minLength || name.length > validName.maxLength) {
    alert('Name must be between ' + validName.minLength + ' and ' + validName.maxLength + ' characters.');
    return;
  }
  if (!validName.anonymous && name === 'anonymous' || name === 'Anonymous' || name === 'ANONYMOUS' ) {
    alert('Name cannot be anonymous.');
    return;
  }
  for (let i = 0; i < name.length; i++) {
    if (!validName.allowedCharacters.includes(name[i])) {
     alert('Name contains invalid characters.');
      return;
    }
  }
  if (takenNames.includes(name)) {
    alert('Name is already in use.');
    return;
  }
  socket.emit('setName', name);
  console.log('trying to set name to ' + name);
});
settingsContainer.addEventListener('click', () => {
  settingsContainer.classList.toggle('open');
});
toggleDebug.addEventListener('click', () => {
  if (stats.style.display === 'none') {
    stats.style.display = 'block';
  } else {
    stats.style.display = 'none';
  }
});
toggleFullscreen.addEventListener('click', () => {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    document.documentElement.requestFullscreen();
  }
});
backToHome.addEventListener('click', () => {
  socket.emit('backToSpawn', myName); //
});
toggleKeyboard.addEventListener('click', () => {
  if (keyboard.style.display === 'none') {
    keyboard.style.display = 'block';
  } else {
    keyboard.style.display = 'none';
  }
}
);
prediction.addEventListener('click', () => {
  if (predict === true) {
    predict = false;
  } else {
    predict = true;
  }
});
hotbarSlots.forEach((slot, index) => {
  slot.addEventListener('click', () => {
    setActiveSlot(index);
  });
});
toggleRender.addEventListener('click', () => {
  if (render) {    render = false;
  } else {
    render = true;
  }
});

//--------------------------------------------------------------------------------
// HOTBAR
//--------------------------------------------------------------------------------
let activeSlot = 0;
hotbarSlots[activeSlot].classList.add('active');

// Add event listener for scroll wheel
window.addEventListener('wheel', (event) => {
  if (event.deltaY > 0) {
    setActiveSlot(activeSlot + 1 > 3 ? 0 : activeSlot + 1);
  } else {
    setActiveSlot(activeSlot - 1 < 0 ? 3 : activeSlot - 1);
  }
});

// Add event listener for number keys
window.addEventListener('keydown', (event) => {
  if (event.key >= '1' && event.key <= '4') {
    setActiveSlot(parseInt(event.key) - 1);
  }
});

// Function to set the active slot
function setActiveSlot(index) {
  // Remove active class from current slot
  hotbarSlots[activeSlot].classList.remove('active');
  activeSlot = index;

  // Add active class to new slot
  hotbarSlots[activeSlot].classList.add('active');
}

//--------------------------------------------------------------------------------
// SOCKET LISTENERS
//--------------------------------------------------------------------------------
function disableConnection() {
  socket.disconnect();
  console.log('Connection to server has been disabled.');
}

socket.on('NameRules', function(data) {
  const validName = data;
  console.log('nameRules received', validName);
});

socket.on('namesInUse', function(data) {
  takenNames = data;
  console.log('takenNames received', takenNames);
});

socket.on('nameSet', function(data) {
  console.log('name is set to:');
  const myName = data;
    myId = socket.id;
  console.log('------', myName, '------');
  // store it in cookie
  document.cookie = 'name=' + myName;
  console.log('cookie set to ' + myName);
});

socket.on('maps', function(data) {
  maps = data;
});

socket.on('currentMap', function(data) {
  currentMap = data;
  console.log('currentMap is ' + currentMap);
  map = maps[currentMap];
  platforms = map.platforms;
});



socket.on('startGame', function(data) {
  console.log('startGame received');
  landingPage.style.display = 'none';
  game.style.display = 'block';
  hotbar.style.display = 'flex';
  mode = "multiPlayer"
  requestAnimationFrame(gameLoop);

  setInterval(function() {
    //console.log(serverUpdate, 'server updates', predicts,'predicts', renders + ' renders');
    fps.innerHTML = 'fps: ' + renders + '';
    serverFPS.innerHTML = 'server fps: ' + serverUpdate + '';
    if (serverUpdate < 48) {
      console.log('server is lagging', serverUpdate, Date.now());
    }
    serverUpdate = 0;
    renders = 0;
    predicts = 0;
  }, fpsInterval);
});

socket.on('invalidName', function(data) {
  console.log('invalidName received');
  alert(data);
});

// listen for forceDiscConnect (even single player is not allowed)
socket.on('forceDiscConnect', function(data) {
  console.log('forceDiscConnect received');
  socket.disconnect();
  document.location.reload();
});

socket.on('disconnect', function(data) {
  console.log('disconnect received');
  socket.disconnect();
  document.location.reload();
});

function updateInput() {
  if (keys[37] || keys[65]) { // left
    player.input.left = true;
  } else {
    player.input.left = false;
  }
  if (keys[39] || keys[68]) { // right
    player.input.right = true;
  } else {
    player.input.right = false;
  }
  if (keys[38] || keys[87] || keys[32]) { // up
    player.input.jump = true;
  } else {
    player.input.jump = false;
  }
}

function angleBetweenPoints(x1, y1, x2, y2) { // returns angle in radians
  return Math.atan2(y2 - y1, x2 - x1);
}

function radiansToDegrees(radians) {
  return radians * 180 / Math.PI;
}

//------------------------------------------------------------
// RENDERING
//------------------------------------------------------------
function draw() {
  ctx.clearRect(camera.x, camera.y, camera.width, camera.height);
  drawBackground();
  drawPlatforms();
  //drawCaptureZones();
  drawFlags();
  drawPlayers();
  
  // for entertainment purposes only
  //crazyTriangles();

  drawCamera();
  renders ++;
}
function getRandomColor() {
  var r = Math.floor(Math.random() * 256);
  var g = Math.floor(Math.random() * 256);
  var b = Math.floor(Math.random() * 256);
  return "rgb(" + r + "," + g + "," + b + ")";
}
function crazyTriangles() {
  for (var i = 0; i < 50; i++) {
    var x1 = Math.floor(Math.random() * canvas.width);
    var y1 = Math.floor(Math.random() * canvas.height);
    var x2 = Math.floor(Math.random() * canvas.width);
    var y2 = Math.floor(Math.random() * canvas.height);
    var x3 = Math.floor(Math.random() * canvas.width);
    var y3 = Math.floor(Math.random() * canvas.height);
    var borderWidth = Math.floor(Math.random() * 10);
    var borderColor = getRandomColor();
    var fillColor = getRandomColor();
    
    drawTriangle(x1, y1, x2, y2, x3, y3, borderWidth, borderColor, fillColor);
  }
}
function drawLine(x1, y1, x2, y2, color) {
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}
function drawRect(x, y, width, height, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, height);
}
function drawRectMore(x, y, width, height, borderWidth, borderColor, fillColor) {
  ctx.fillStyle = fillColor;
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = borderWidth;
  ctx.strokeRect(x, y, width, height);
}
function drawTriangle(x1, y1, x2, y2, x3, y3, borderWidth, borderColor, fillColor) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.lineWidth = borderWidth;
  ctx.strokeStyle = borderColor;
  ctx.stroke();
}
function drawCircle(x, y, radius, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2, false);
  ctx.fill();
}
function drawText(text, x, y, color) {
  ctx.strokeStyle = 'black'; // Set the stroke color to black
  ctx.lineWidth = 2; // Set the stroke width to 1 pixel
  ctx.fillStyle = color;
  ctx.font = '15px Arial';
  ctx.strokeText(text, x, y); // Draw the border
  ctx.fillText(text, x, y);
}
function drawImage(image, x, y, width, height) { // not working
  ctx.drawImage(image, x, y, width, height);
}
function drawBackground() {
  drawRect(camera.x, camera.y, camera.width, camera.height, 'gray');
  // draw a grid on top of the background according to the word
  // "grid" in the word "background"
  for (var i = -1000; i < 15000; i += 100) {
    drawRect(i, -1000, 1, 15000, 'DimGray');
  }
  for (var i = -1000; i < 15000; i += 100) {
    drawRect(-1000, i, 15000, 1, 'DimGray');
  }

}
function drawPlatforms() {
  for (var i = 0; i < platforms.length; i++) {
    drawRect(platforms[i].x, platforms[i].y, platforms[i].width, platforms[i].height, platforms[i].color);
  }
}
function drawPlayer() {
  drawRect(player.x, player.y, player.width, player.height, player.color);
  // username text above player center myName
  drawText(myName, player.x - myName.length * 2.5, player.y - 5, player.color);
}
function drawPlayers() {
  // convert players dictionary to array of values
  var playersArr = Object.values(officialState);

  // loop through all players and draw them
  for (var i = 0; i < playersArr.length; i++) {
    drawRectMore(playersArr[i].x, playersArr[i].y, playersArr[i].width, playersArr[i].height, 1 , 'black', playersArr[i].color);
    //console.log(playersArr[i]);
    // username text above player center
    drawText(playersArr[i].name, playersArr[i].x - playersArr[i].name.length * 2.5, playersArr[i].y - 5, 'white');
  }
}
function drawProjectiles() {
  for (var i = 0; i < projectiles.length; i++) {
    drawCircle(projectiles[i].x, projectiles[i].y, projectiles[i].size, projectiles[i].color);
  }
}
function updateCamera() {
  drawCamera();
  camera.x = player.x - canvas.width / 2;
  camera.y = player.y - canvas.height / 2;
  ctx.setTransform(1, 0, 0, 1, -camera.x, -camera.y);
  //console.log('camera:',camera.x, camera.y);
}
function drawCamera() {
  if (camera.effects.shake === true) {
    ctx.translate(Math.random() * camera.effects.shakeIntensity, Math.random() * camera.effects.shakeIntensity);
    camera.effects.shakeDuration--;
    if (camera.effects.shakeDuration <= 0) {
      camera.effects.shake = false;
    }
  }
  if (camera.effects.zoom === true) {
    ctx.scale(camera.effects.zoomIntensity, camera.effects.zoomIntensity);
    camera.effects.zoomDuration--;
    if (camera.effects.zoomDuration <= 0) {
      camera.effects.zoom = false;
    }
  }
  camera.x = player.x - canvas.width / 2;
  camera.y = player.y - canvas.height / 2;
  ctx.setTransform(1, 0, 0, 1, -camera.x, -camera.y);
}
function drawFlags() { // draw flags on the map using the drawRectMore fillcolor is the flag color and bordercolor is black
  for (var i = 0; i < flags.length; i++) {
    // draw the flag pole
    drawRect(flags[i].x + flags[i].width / 3, flags[i].y, 10, 100, 'Chocolate');
    drawRectMore(flags[i].x, flags[i].y, flags[i].width, flags[i].height, 3, 'black', flags[i].color);
  }
}
function drawCaptureZone(x1, y1, x2, y2) {
  drawRectMore(x1, y1, x2 - x1, y2 - y1, 3, 'black', 'rgba(255, 255, 255, 0.5)');
}
function drawCaptureZones() {
  for (var i = 0; i < captureZones.length; i++) {
    drawCaptureZone(captureZones[i].x1, captureZones[i].y1, captureZones[i].x2, captureZones[i].y2);
  }
}
function updateDebugDisplay(deltaTime) {
  // check if mode is single player or multiplayer
  if (mode === 'singlePlayer') {
    
} else if (mode === 'multiPlayer') {
  nameDebug.innerHTML = 'name: ' + player.name + '';
  latency.innerHTML = 'latency: ' + (Date.now() - player.lastUpdate) + 'ms';
  position.innerHTML = 'x: ' + player.x.toFixed(2) + ', y: ' + player.y.toFixed(2) + '';
  velocity.innerHTML = 'dX: ' + player.dX.toFixed(2) + ', dY: ' + player.dY.toFixed(2) + '';
  grounded.innerHTML = 'grounded: ' + player.grounded + '';
  var collision = [];
  if (player.collision.right === true) {
    collision.push('right');
  }
  if (player.collision.left === true) {
    collision.push('left');
  }
  if (player.collision.top === true) {
    collision.push('top');
  }
  if (player.collision.bottom === true) {
    collision.push('bottom');
  }
  colisionDisplay.innerHTML = 'collisions: ' + collision + '';
  //lastUpdate = player.lastUpdate;
}
}

function perdict() {
  // predict only the player
  player.x += player.dX * player.deltaTime;
  player.y += player.dY * player.deltaTime;
  player.dY += player.gravity * player.deltaTime;
  collisionCheck(player);

  draw();
  predicts++;
}
function collisionAABB(rect1, rect2) {
  return (
    rect1.x < rect2.x+rect2.width &&
    rect1.x+rect1.width > rect2.x &&
    rect1.y < rect2.y+rect2.height &&
    rect1.y+rect1.height > rect2.y)
}
function collisionCheck(player) {
  player.collision.bottom = false;
  player.collision.top = false;
  player.collision.left = false;
  player.collision.right = false;
  player.grounded = false;

  for (let platform of platforms) {
    // Only check platform that have collision with player
    if (!collisionAABB(player, platform)) {
      continue;
    }

    // buffered positional datas
    // player's coordinates cannot be buffered
    // because otherwise 2 different collision check might want to
    // set its coordinate to 2 different values
    let platX = platform.x;
    let platY = platform.y;
    let platW = platform.width;
    let platH = platform.height;

    // Helper expressions
    let interceptX = () => {
      return player.x + player.width > platX && player.x < platX + platW;
    };
    let interceptY = () => {
      return player.y + player.height > platY && player.y < platY + platH;
    };

    // check bottom collision
    let pBottom = player.y + player.height;
    if (pBottom > platY && pBottom <= platY + 10 && interceptX()) {
      // HACKY way of creating a nonexistent groundlayer on top of every platform, because it counts touching too which in this simple phase is almost the same as a resolved collision
      player.collision.bottom = true;
      player.y = platY - player.height;
      player.dY = 0;
      player.grounded = true;
      player.doubleJumping = false;
      player.wallJumping = false;
    }

    // check top collision
    let platBottom = platY + platH;
    if (player.y >= platBottom - 10 && player.y <= platBottom && interceptX()) {
      player.collision.top = true;
      player.y = platY + platH;
      // Early stage implementation of not falling
      if (player.dY < 0) {
        player.dY = 0;
      }
    }

    // check right collision
    let pRight = player.x + player.width;
    if (pRight <= platX + 10 && pRight >= platX && interceptY()) {
      player.collision.right = true;
      player.x = platX - player.width;
      player.dX = 0;
    }

    // check left collision
    let platRight = platX + platW;
    if (player.x >= platRight - 10 && player.x <= platRight && interceptY()) {
      player.collision.left = true;
      player.x = platX + platW;
      player.dX = 0;
    }
  }

}

//------------------------------------------------------------
// GAME LOOP
//------------------------------------------------------------
socket.on('gameState', function(data) {
  //console.log('gameState', data);
  officialState = data;
  player = officialState[socket.id];
  predictedState = officialState;
  draw();
  updateDebugDisplay(player.deltaTime);
  serverUpdate ++;
});

function gameLoop() {
  // send input to server
  updateInput();
  socket.emit('playerUpdate', player);
  if(predict){
    perdict();
  }
  requestAnimationFrame(gameLoop);
}