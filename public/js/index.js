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
const position = document.getElementById('position');
const velocity = document.getElementById('velocity');
const acceleration = document.getElementById('acceleration');
const grounded = document.getElementById('grounded');
const jumping = document.getElementById('jumping');
const doubleJumping = document.getElementById('doubleJumping');
const wallJumpingLeft = document.getElementById('wallJumpingLeft');
const wallJumpingRight = document.getElementById('wallJumpingRight');
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

// name form
const landingPage = document.getElementById('landing-page-container');
const nameInput = document.getElementById('name');
const singlePlayerButton = document.getElementById('singlePlayer');
const multiPlayerButton = document.getElementById('multiPlayer');

// virtual keyboard
const keyboard = document.getElementById("virtual-keyboard");
const left = document.getElementById("left-arrow");
const right = document.getElementById("right-arrow");
const up = document.getElementById("jump");

//hotbar
const hotbar = document.getElementById('hotbar');
const hotbarSlots = document.querySelectorAll('.hotbar-slot');

var players = {};
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

var platforms = [
  {x: 0, y: 700, width: 1000, height: 100, color: 'white'},
  {x: -500, y: 450, width: 1000, height: 100, color: 'white'},
  {x: -1000, y: 200, width: 1000, height: 100, color: 'white'},
  {x: -600, y: -400, width: 100, height: 500, color: 'white'},
  {x: -300, y: -400, width: 100, height: 500, color: 'white'},
  {x: 580, y: 600, width: 100, height: 100, color: 'white'},
  {x: 50, y: 300, width: 100, height: 100, color: 'white'},
  {x: 1000, y: 600, width: 1000, height: 100, color: 'white'},
  {x: 2000, y: 500, width: 1000, height: 100, color: 'white'},
  {x: 3000, y: 400, width: 1000, height: 100, color: 'white'},
  {x: 3000, y: 300, width: 100, height: 100, color: 'white'},
  {x: 3000, y: 200, width: 100, height: 100, color: 'white'},
  {x: 3000, y: 100, width: 100, height: 100, color: 'white'},
  {x: 3000, y: 0, width: 100, height: 100, color: 'white'},
  {x: 3000, y: -100, width: 100, height: 100, color: 'white'},
  {x: 3000, y: -200, width: 100, height: 100, color: 'white'},
  {x: 3000, y: -300, width: 100, height: 100, color: 'white'},
  {x: 3000, y: -400, width: 100, height: 100, color: 'white'},
  {x: 3000, y: -500, width: 100, height: 100, color: 'white'},
  {x: 1000, y: -200, width: 500, height: 100, color: 'white'},
  {x: 0, y: -300, width: 500, height: 100, color: 'white'},
  {x: 2000, y: -400, width: 500, height: 100, color: 'white'},
  {x: 4000, y: 300, width: 1000, height: 100, color: 'white'},
  {x: 5000, y: 200, width: 1000, height: 100, color: 'white'},
  {x: 6000, y: 100, width: 1000, height: 100, color: 'white'},
  {x: 7000, y: 0, width: 1000, height: 100, color: 'white'},
  {x: 8000, y: -100, width: 1000, height: 100, color: 'white'},
  {x: 9000, y: -200, width: 1000, height: 100, color: 'white'},
  {x: 10000, y: -300, width: 1000, height: 100, color: 'white'},
  {x: 11000, y: -400, width: 1000, height: 100, color: 'white'},
  {x: 12000, y: -500, width: 1000, height: 100, color: 'white'},
  {x: 13000, y: -600, width: 1000, height: 100, color: 'white'},
  {x: 14000, y: -700, width: 1000, height: 100, color: 'white'},
  {x: 15000, y: -800, width: 1000, height: 100, color: 'white'},
  {x: 16000, y: -900, width: 1000, height: 100, color: 'white'},

  // box around the map
  {x: -1000, y: -1000, width: 10, height: 4000 , color: '#000000'},

]

var visuals = {
  background: {
    layer1: [
      {name: 'dirt', path: 'platformer/public/assets/img/ground.png', x: 0, y: 0, width: 16, height: 16},
    ],
    layer2: [
      {name: 'grass1', path: 'platformer/public/assets/img/grass1.png', x: 0, y: 0, width: 16, height: 16},
      {name: 'grass2', path: 'platformer/public/assets/img/grass2.png', x: 0, y: 16, width: 16, height: 16},
    ]
  },
  foreground: {
    layer1: [
      {name: 'dirt', path: 'platformer/public/assets/img/ground.png', x: 0, y: 0, width: 16, height: 16},
    ]
  }
};

var player = {
  name: 'player',
  width: 20,
  height: 20,
  color: 'red',
  x: 1600,
  y: 0,
  dX: 0,
  dY: 0,
  left: false,
  right: false,
  jump: false,
  collision : {
    top: false,
    bottom: false,
    left: false,
    right: false
  },
  gravity: 1100, // gravity
  maxDX: 600, // max horizontal speed
  maxDY: 600, // max falling speed
  jumpForce: 800, // big burst of speed
  acceleration: 300 ,
  friction: 300,
  // Vertical states
  grounded: false,
  jumping: false,
  falling: false,
  doubleJumpingAllowed: true,
  doubleJumping: false,
  jumpCooldown: 0.3, // seconds
  wallJumpingLeft: false,
  wallJumpingRight: false,
  wallJumping: false,
  freemode: true,
}
mode = 'lobby';
let render = true

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
let validName = {
  'minLength': 3,
  'maxLength': 20,
  'anonymous': false,
  'allowedCharacters': 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_ -'
};
var debug = true;

//--------------------------------------------------------------------------------
// LOAD ASSETS
//--------------------------------------------------------------------------------
assets = {
  background: {
    layer1: [],
    layer2: []
  },
  foreground: {
    layer1: []
  },
  player: {
    idle: [],
    run: [],
    jump: [],
    fall: [],
    wallJump: [],
  }
}

function loadAssets() {
  for (let i = 0; i < visuals.background.layer1.length; i++) {
    let img = new Image();
    img.src = visuals.background.layer1[i].path;
    assets.background.layer1.push(img);
  }
  for (let i = 0; i < visuals.background.layer2.length; i++) {
    let img = new Image();
    img.src = visuals.background.layer2[i].path;
    assets.background.layer2.push(img);
  }
  for (let i = 0; i < visuals.foreground.layer1.length; i++) {
    let img = new Image();
    img.src = visuals.foreground.layer1[i].path;
    assets.foreground.layer1.push(img);
  }
  for (let i = 0; i < 4; i++) {
    let img = new Image();
    img.src = 'platformer/public/assets/img/player/idle/' + i + '.png';
    assets.player.idle.push(img);
  }
  for (let i = 0; i < 8; i++) {
    let img = new Image();
    img.src = 'platformer/public/assets/img/player/run/' + i + '.png';
    assets.player.run.push(img);
  }
  for (let i = 0; i < 8; i++) {
    let img = new Image();
    img.src = 'platformer/public/assets/img/player/jump/' + i + '.png';
    assets.player.jump.push(img);
  }
  for (let i = 0; i < 8; i++) {
    let img = new Image();
    img.src = 'platformer/public/assets/img/player/fall/' + i + '.png';
    assets.player.fall.push(img);
  }
  for (let i = 0; i < 8; i++) {
    let img = new Image();
    img.src = 'platformer/public/assets/img/player/wallJump/' + i + '.png';
    assets.player.wallJump.push(img);
  }
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
  drawCamera();
  console.log('resized');
});

document.addEventListener("contextmenu", function(event) {
  event.preventDefault();
}, false);
document.addEventListener('visibilitychange', function() {
  if (document.hidden) {
    keys = [];
    console.log('tab hidden');
  } else {
    console.log('tab visible');
  }
});

// name input  
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
  // check if name is valid
  if (name.length < validName.minLength || name.length > validName.maxLength) {
    socket.emit('invalidName', 'Name must be between ' + validName.minLength + ' and ' + validName.maxLength + ' characters long.');
    return;
  }
  if (!validName.anonymous && name === 'anonymous') {
    socket.emit('invalidName', 'Name can not be anonymous.');
    return;
  }
  for (let i = 0; i < name.length; i++) {
    if (!validName.allowedCharacters.includes(name[i])) {
      socket.emit('invalidName', 'Name contains invalid characters.');
      return;
    }
  }
  // check if name is already in use
  if (takenNames.includes(name)) {
    socket.emit('invalidName', 'Name is already in use.');
    return;
  }
  // set name
  myName = nameInput.value;
  myId = socket.id;
  console.log('my name is ' + myName);
  console.log('my id is ' + myId);
  // send name to server
  socket.emit('setName', myName);
  mode = 'multiPlayer';
  console.log('trying to set name ' + myName);  
});

// settings
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

// detect if the fullscreen button is clicked
toggleFullscreen.addEventListener('click', () => {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    document.documentElement.requestFullscreen();
  }
});

backToHome.addEventListener('click', () => {
  player.x = 0;
  player.y = 0;
  player.dX = 0;
  player.dY = 0;
});

toggleKeyboard.addEventListener('click', () => {
  if (keyboard.style.display === 'none') {
    keyboard.style.display = 'block';
  } else {
    keyboard.style.display = 'none';
  }
}
);

// virtual keyboard mimicking the physical keyboard
// mire kell a virtuális keyboard?
keyboard.addEventListener('click', (e) => {
  console.log(e.target.id);
  if (e.target.id === 'left-arrow') { 
    keys[37] = true;
    setTimeout(() => {
      keys[37] = false;
    }, 100);
  } else if (e.target.id === 'right-arrow') {
    keys[39] = true;
    setTimeout(() => {
      keys[39] = false;
    }, 100);
  } else if (e.target.id === 'up-arrow') { 
    keys[32] = true;
  }
});

// render visuals or not
// mire kell a render? ez most egy code review
toggleRender.addEventListener('click', () => {
  if (render) {    render = false;
  } else {
    render = true;
  }
});

//--------------------------------------------------------------------------------
// HOTBAR
//--------------------------------------------------------------------------------

// Set the initial active slot
// ide azt írom, hogy bírlak, jó srác vagy
let activeSlot = 0;
hotbarSlots[activeSlot].classList.add('active');

// Add event listeners to the hotbar slots
hotbarSlots.forEach((slot, index) => {
  slot.addEventListener('click', () => {
    setActiveSlot(index);
  });
});

// Add event listener for scroll wheel
// ide meg azt írom, hogy vigyázz magadra
window.addEventListener('wheel', (event) => {
  if (event.deltaY > 0) {
    setActiveSlot(activeSlot + 1 > 3 ? 0 : activeSlot + 1);
  } else {
    setActiveSlot(activeSlot - 1 < 0 ? 3 : activeSlot - 1);
  }
});

// Add event listener for number keys
// ide anya írt egy megjegyzést
//ezt itt a kövi sort szedd majd ki
window.addEventListener('keydown', (event) => {
  if (event.key >= '1' && event.key <= '4') {
    setActiveSlot(parseInt(event.key) - 1);
  }
});

// Function to set the active slot
function setActiveSlot(index) {
  // Remove active class from current slot
  hotbarSlots[activeSlot].classList.remove('active');

  // Set the new active slot
  activeSlot = index;

  // Add active class to new slot
  // sőt ide is írta anya egy megjegyzést
  hotbarSlots[activeSlot].classList.add('active');
}


//--------------------------------------------------------------------------------
// SOCKET LISTENERS
//--------------------------------------------------------------------------------
// listen for initialData
// menő a zenéd
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
  players[myId].name = myName;
  console.log('------', myName, '------');
});

socket.on('startGame', function(data) {
  console.log('startGame received');
  landingPage.style.display = 'none';
  game.style.display = 'block';
  hotbar.style.display = 'flex';
  frame();
});

socket.on('gameState', function(data) {
  //console.log('gameState received');
  players = data;
  //console.log(players);
});


// listen for forceDiscConnect (even single player is not allowed)
// szerintem ezeket a commeneket nem te írtad
socket.on('forceDiscConnect', function(data) {
  console.log('forceDiscConnect received');
  socket.disconnect();
});

//--------------------------------------------------------------------------------
// UPDATE FUNCTIONS
//--------------------------------------------------------------------------------

function updateInput() {
  if (keys[37] || keys[65]) { // left
    player.left = true;
  } else {
    player.left = false;
  }
  if (keys[39] || keys[68]) { // right
    player.right = true;
  } else {
    player.right = false;
  }
  if (keys[38] || keys[87] || keys[32]) { // up
    player.jump = true;
  } else {
    player.jump = false;
  }
}

function update() {
  updateInput();
  updatePlayer(deltaTime);
  updateCamera();
}

function updatePlayer(deltaTime) {
  // Force vectors for a step
  var ddx = 0;
  var ddy = 0;
  // steal smart stuff from oindex.js
  let wasleft = player.dX < 0;
  let wasright = player.dX > 0;

  // move the player according to the input
  if (player.left) { // left
    player.dX -= player.acceleration;
  } else if (wasleft) {
    player.dX += player.friction;
  }
  if (player.right) { // right
    player.dX += player.acceleration;
  } else if (wasright) {
    player.dX -= player.friction;
  } 

  // Vertical physics
  ddy += player.gravity;
  if (player.jump && player.grounded) { // jump
    player.dY -= player.jumpForce;
    player.jumping = true;
    player.doubleJumpingAllowed = true;
    player.grounded = false;
  }

  // Update velocities
  player.dX += ddx * deltaTime
  player.dY += ddy * deltaTime
  // Put a cap/Clamp max speed in both direciton
  player.dX = clamp(player.dX, -player.maxDX, player.maxDX)
  player.dY = clamp(player.dY, -player.maxDY, player.maxDY)
  // Update position
  player.x += player.dX * deltaTime
  player.y += player.dY * deltaTime
  // Handle terminal friction
  // Check if direction is fluctuating frame by frame
  // Meaning player reached "sticky friction"
  if ((wasleft && player.dX > 0) || (wasright && player.dX < 0)) {
    player.dX = 0;
    ddx = 0;
  }
  
  // check and handle if the player is colliding with a platform
  collisionCheck();

}

function checkIFValidPosition(enity) { 
  for (let platform of platforms) {
    if (collisionAABB(enity, platform)) {
      return false;
    }
  }
  return true;
}

function collisionAABB(rect1, rect2) {
  return (
    rect1.x < rect2.x+rect2.width &&
    rect1.x+rect1.width > rect2.x &&
    rect1.y < rect2.y+rect2.height &&
    rect1.y+rect1.height > rect2.y)
}

function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

function collisionCheck() {
  player.collision.bottom = false;
  player.collision.top = false;
  player.collision.left = false;
  player.collision.right = false;
  player.grounded = false
  
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
    let interceptX = () => {return player.x + player.width > platX && player.x < platX + platW};
    let interceptY = () => {return player.y + player.height > platY && player.y < platY + platH};

    // check bottom collision
    let pBottom = player.y + player.height;
    if (pBottom > platY && pBottom <= platY + 10 && interceptX()) { // HACKY way of creating a nonexistent groundlayer on top of every platform, because it counts touching too which in this simple phase is almost the same as a resolved collision
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
    }
    
    // check left collision
    let platRight = platX + platW;
    if (player.x >= platRight - 10 && player.x <= platRight && interceptY()) {
      player.collision.left = true;
      player.x = platX + platW;
    }
  }
}


//------------------------------------------------------------
// RENDERING
//------------------------------------------------------------

function draw() {
  ctx.clearRect(camera.x, camera.y, camera.width, camera.height);
  drawBackground();
  drawPlatforms();
  drawPlayers();
  //drawPlayer();
}

function drawRect(x, y, width, height, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, height);
}
function drawCircle(x, y, radius, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2, false);
  ctx.fill();
}
function drawText(text, x, y, color) {
  ctx.fillStyle = color;
  ctx.font = '15px Arial';
  ctx.fillText(text, x, y);
}
function drawImage(image, x, y, width, height) {
  ctx.drawImage(image, x, y, width, height);
}
function drawBackground() {
  drawRect(camera.x, camera.y, camera.width, camera.height, 'gray');
  // draw a grid on top of the background according to the word
  // "grid" in the word "background"
  for (var i = -1000; i < 15000; i += 40) {
    drawRect(i, -1000, 1, 15000, 'DimGray');
  }
  for (var i = -1000; i < 15000; i += 40) {
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
  var playersArr = Object.values(players);

  // loop through all players and draw them
  for (var i = 0; i < playersArr.length; i++) {
    drawRect(playersArr[i].x, playersArr[i].y, playersArr[i].width, playersArr[i].height, playersArr[i].color);
    //console.log(playersArr[i]);
    // username text above player center
    drawText(playersArr[i].name, playersArr[i].x - playersArr[i].name.length * 2.5, playersArr[i].y - 5, playersArr[i].color);
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
}

function updateDebugDisplay(deltaTime) {
  // check if mode is single player or multiplayer
  if (mode === 'singlePlayer') {
    nameDebug.innerHTML = myName;// + ' id:  ' + myId; //+ 'ip: ' + myIp;
    position.innerHTML = 'x: ' + player.x.toFixed(3) + ', y: ' + player.y.toFixed(3) + '';
    fps.innerHTML = 'fps: ' + (1 / deltaTime).toFixed(0);
    velocity.innerHTML = 'dX: ' + player.dX.toFixed(2) + ', dY: ' + player.dY.toFixed(2) + '';
    grounded.innerHTML = 'grounded: ' + player.grounded + '';
    jumping.innerHTML = 'jumping: ' + player.jumping + '';
    doubleJumping.innerHTML = 'doubleJumping: ' + player.doubleJumping + '';
    wallJumpingLeft.innerHTML = 'wallJumpingLeft: ' + player.wallJumpingLeft + '';
    wallJumpingRight.innerHTML = 'wallJumpingRight: ' + player.wallJumpingRight + '';
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
} else if (mode === 'multiPlayer') {
  nameDebug.innerHTML = myName + ' id:  ' + myId; //+ 'ip: ' + myIp;
  position.innerHTML = 'x: ' + player.x + ', y: ' + player.y + '';
  fps.innerHTML = 'fps: ' + (1 / deltaTime).toFixed(0);
  velocity.innerHTML = 'dX: ' + player.dX.toFixed(2) + ', dY: ' + player.dY.toFixed(2) + '';
  grounded.innerHTML = 'grounded: ' + player.grounded + '';
  jumping.innerHTML = 'jumping: ' + player.jumping + '';
  doubleJumping.innerHTML = 'doubleJumping: ' + player.doubleJumping + '';
  wallJumpingLeft.innerHTML = 'wallJumpingLeft: ' + player.wallJumpingLeft + '';
  wallJumpingRight.innerHTML = 'wallJumpingRight: ' + player.wallJumpingRight + '';
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
}
}

//------------------------------------------------------------
// GAME LOOP
//------------------------------------------------------------

// Fixed Fps - almost the same as in Unity

const fixedDeltatime = 1 / 60;
var deltaTime;
var currentTime;
var lastTime = Date.now();
var toConsume = 0;

function frame() {
  currentTime = Date.now();
  // Date.now() gives miliseconds -> conversion into seconds
  deltaTime = (currentTime - lastTime) / 1000;
  lastTime = currentTime;

  // Update controlls
  updateInput();
  
  toConsume += deltaTime;
  while (toConsume >= fixedDeltatime) {
    updatePlayer(fixedDeltatime);
    toConsume -= fixedDeltatime;
  }

  // send plyerUpdate to server
  if (mode === 'multiPlayer') {
    socket.emit('playerUpdate', player);
  }
  
  // Update debug display's state
  updateDebugDisplay(deltaTime + toConsume);
  
  // Update camera's state
  updateCamera();
  
  // Do the render stuff
  draw();
  requestAnimationFrame(frame);
};


//test commit