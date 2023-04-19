const express = require('express');
const { Socket } = require('socket.io');
const os = require('os');
const { log } = require('console');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
require('dotenv').config();

const port = process.env.PORT || 3000;
const host = process.env.HOST || 'localhost';
const version = process.env.VERSION || '0.0.0';
const environment = process.env.NODE_ENV || 'development';
const maxConnections = process.env.MAX_CONNECTIONS || 40;
const maxPlayers = process.env.MAX_PLAYERS || 10;
bannedIPs = process.env.BANNED_IPS || [];

//---------------------------------
// SETTINGS
//---------------------------------
const validName = {
  'minLength': 3,
  'maxLength': 20,
  'anonymous': false,
  'allowedCharacters': 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_ -'
};
const serverSettings = {
  'maxPlayers': 10,
  'maxSpectators': 10,
  'maxPlayersPerRoom': 4,
};
var platforms = [
  {x: 0, y: 700, width: 1000, height: 100, color: 'white'},
  {x: -500, y: 450, width: 1000, height: 100, color: 'white'},
  {x: -1000, y: 200, width: 1000, height: 100, color: 'white'},
  {x: -600, y: -400, width: 100, height: 500, color: 'white'},
  {x: -300, y: -400, width: 100, height: 500, color: 'white'},
  {x: 580, y: 600, width: 100, height: 100, color: 'white'},
  {x: 50, y: 300, width: 100, height: 100, color: 'green'},
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

//---------------------------------
// GLOBAL VARIABLES
//---------------------------------

var gameState = {}; //socket.id = {lots of info of the player} offical game state
var playerInputs = {}; //socket.id = {lots of info of the player} stuff that the client sends to the server
var userInfos = {}; //socket.id = {other infromation what only the server knows}
var userNames = []; //to store all usernames in use rn
var spectators = []; //this is only a feature plan
var rooms = []; // this on is also just a plan

//---------------------------------
// INIT USER
//---------------------------------
function User(name, id, ip, screen, mobile) {
  this.name = name;
  this.id = id;
  this.ip = ip;
  this.screen = screen;
  this.latency = 0;
  this.active = true;
  this.mobile = false;
}

function Player(name, id, room, x, y) {
  this.name = name;
  this.id = id;
  this.room = room;
  this.width = 20;
  this.height = 20;
  this.color = 'black';
  this.x = x;
  this.y = y;
  this.dX = 0;
  this.dY = 0;
  this.input = {
    left: false,
    right: false,
    jump: false
  };
  this.collision = {
    top: false,
    bottom: false,
    left: false,
    right: false
  };
  this.gravity = 9.81*45;
  this.maxDX = 600;
  this.maxDY = 1000;
  this.jumpForce = 550;
  this.acceleration = 40; 
  this.friction = 50;
  this.grounded = false;
  this.jumping = false;
  this.doubleJumpingAllowed = true;
  this.doubleJumping = false;
  this.jumpCooldown = 0.3;
  this.wallJumpingLeft = false;
  this.wallJumpingRight = false;
  this.wallJumping = false;
  this.freemode = false;
  this.latency = 0;
  this.state = 'joining';
  this.health = 100;

  this.lastUpdate = Date.now();
  // ezt majd vedd ki
  this.deltaTime = 1/60;
}

//--------------------------------
// CONNECTION
//--------------------------------
app.use(express.static('public'));

server.listen(port, function () {
  const ip = Object.values(os.networkInterfaces())
    .flatMap((iface) => iface.filter((info) => info.family === 'IPv4' && !info.internal))
    .map((info) => info.address)[0];
  console.log(`Server listening on http://${ip}:3000`);
});

io.on('connection', function (socket) {
  if (bannedIPs.includes(socket.handshake.address)) {
    console.log('banned ip tried to connect:', socket.handshake.address);
    socket.emit('forceDiscConnect', true);
    socket.disconnect();
    return;
  }
  else if (userNames.length >= maxPlayers) {
    console.log('max players reached:', socket.handshake.address);
    socket.disconnect();
    return;
  }
  else if (io.engine.clientsCount >= maxConnections) {
    console.log('max connections reached:', socket.handshake.address);
    socket.disconnect();
    return;
  }
  const userAgent = socket.handshake.headers['user-agent'];
  const isMobile = /Mobile/.test(userAgent);
  userInfos[socket.id] = new User('', socket.id, socket.handshake.address, '', isMobile);
  console.log('a user connected id:', socket.id, 'ip:', socket.handshake.address);

  socket.on('screenSize', function (screen) {
    userInfos[socket.id].screen = screen;
  });

  socket.emit('NameRules', validName);
  socket.emit('namesInUse', userNames);
  socket.on('setName', function (name) {
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
    if (userNames.includes(name)) {
      socket.emit('invalidName', 'Name is already in use.');
      return;
    }
    userInfos[socket.id].name = name;
    userNames.push(name);
    gameState[socket.id] = new Player(name, socket.id, 'lobby', 0, 0);
    gameState[socket.id].state = 'inGame';
    socket.emit('gameState', gameState);
    socket.emit('nameSet', name);
    io.emit('namesInUse', userNames);
    console.log('--- new player in game:', gameState[socket.id].name);

    // start game for the new player
    socket.emit('startGame', {});
  });

  socket.on('playerUpdate', function (player) {
    playerInputs[socket.id] = player.input;
  });

  socket.on('tabHidden', function () {
    userInfos[socket.id].active = false;
  });

  socket.on('tabVisible', function () {
    userInfos[socket.id].active = true;
  });
  
  socket.on('disconnect', function () {
    if (userInfos[socket.id].name) {
      console.log('--- player left game:', userInfos[socket.id].name);
      userNames.splice(userNames.indexOf(userInfos[socket.id].name), 1);
      delete gameState[socket.id];
    } else {
      console.log('a user disconnected id:', socket.id, 'ip:', socket.handshake.address);
    }
    delete userInfos[socket.id];
    io.emit('namesInUse', userNames);
  });

  socket.on('invalidPositions', function (invalidPositions) {
    invalidPositionsToFile('./temporary/invalidPositions.txt', invalidPositions, ';');
  });
});

//---------------------------------
// UPDATE PLAYERS
//---------------------------------

function updateGame() {
  // update the game state according to the input (playerInput)
  for (const [id, input] of Object.entries(playerInputs)) {
    // Update player state based on input
    //console.log('update player', id, input);
    updatePlayer(gameState[id], input, deltaTime);
  }
};

//---------------------------------
// SERVER TICK
//---------------------------------
// Delta time alap mertekegysege: ms
// az idealis 1/60 seconds ami milisecondben 16.66
var lastTime = Date.now();
var deltaTime = 0;
setInterval(function () {
  if (Object.keys(gameState).length === 0) return;
  // physics calculated with seconds deltatime so
  // setting physics values is less pain in the ass
  //deltaTime = (Date.now() - lastTime) / 1000;
  deltaTime = 1/60
  updateGame();
  for (const [id, player] of Object.entries(gameState)) {
    if (player.name) {
      io.to(id).emit('gameState', gameState);
    }
  }
  //lastTime = Date.now();
}, 1000/ 64);

function updatePlayer(player, input, deltaTime) {
  if (player) {

    if(falloffDetection(player)) { // the player fallen of the map
      player.x = 0
      player.y = 0
      return
    }
    //console.log(deltaTime)
    // Force vectors for a step
    let ddx = 0;
    let ddy = player.gravity;
    // steal smart stuff from oindex.js
    let wasleft = player.dX < 0;
    let wasright = player.dX > 0;

    // move the player according to the input
    if (input.left) { // left
      player.dX -= player.acceleration;
    } else if (wasleft) {
      player.dX += player.friction;
    }
    if (input.right) { // right
      player.dX += player.acceleration;
    } else if (wasright) {
      player.dX -= player.friction;
    }

    // Vertical physics
    ddy += player.gravity;
    if (input.jump && player.grounded) { // jump
      player.dY -= player.jumpForce;
      player.jumping = true;
      player.doubleJumpingAllowed = true;
      player.grounded = false;
    }

    // Update velocities
    player.dX += ddx * deltaTime
    player.dY += ddy * deltaTime
    // Put a cap/Clamp max speed in both directions
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
    }

    // check and handle if the player is colliding with a platform
    collisionCheck(player);
    player.lastUpdate = Date.now();
  }
}

function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
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
    }

    // check left collision
    let platRight = platX + platW;
    if (player.x >= platRight - 10 && player.x <= platRight && interceptY()) {
      player.collision.left = true;
      player.x = platX + platW;
    }
  }

  // update gameState object
  gameState[player.id].collision = player.collision;
  gameState[player.id].grounded = player.grounded;
  gameState[player.id].x = player.x;
  gameState[player.id].y = player.y;
  gameState[player.id].dX = player.dX;
  gameState[player.id].dY = player.dY;
}

function falloffDetection(player) {
  if (player.y > 2000) {
    return true;
  }
  return false;
}

//---------------------------------
// ERROR HANDLING
//---------------------------------
function invalidPositionsToFile(outputPath, invalidPositions, separator) {
  const fs = require('fs');
  let output = '';
  output += `x${separator}y${separator}dX${separator}dY${separator}grounded${separator}jumping${separator}doubleJumping${separator}wallJumpingLeft${separator}wallJumpingRight${separator}wallJumping${separator}collision.left${separator}collision.right${separator}collision.top${separator}collision.bottom \n`;
  invalidPositions.forEach((pos) => {
    output += `${pos.x}${separator}${pos.y}${separator}${pos.dX}${separator}${pos.dY}${separator}${pos.grounded}${separator}${pos.jumping}${separator}${pos.doubleJumping}${separator}${pos.wallJumpingLeft}${separator}${pos.wallJumpingRight}${separator}${pos.wallJumping}${separator}${pos.collision.left}${separator}${pos.collision.right}${separator}${pos.collision.top}${separator}${pos.collision.bottom}
`;
  });
  fs.writeFileSync('./errors.txt', output);
}