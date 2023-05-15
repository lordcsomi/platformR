const express = require('express');
const path = require('path');
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
  'allowedCharacters': 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_ '
};
const serverSettings = {
  'maxPlayers': 10,
  'maxSpectators': 10,
  'maxPlayersPerRoom': 4,
};
var platforms = []
var gameMap = 'lobby'
var currentMap = {}
var maps = {
  lobby : {
    platforms: [ // this is intentionally a list because it is faster to iterate through it
      {x: -200, y: 500, width: 1450, height: 50, color: 'white'},
    ],
    spawnpoints: {
      red : {x: 0, y: 100}, // x = left right, y = up down
      blue : {x: 1000, y: 100},
    },
    flags : { // this is the place where the flags are spawned
      red: {x: 0, y: 400, width: 30, height: 70, color: 'FireBrick'},
      blue: {x: 1025, y: 400, width: 30, height: 70, color: 'DodgerBlue'},
    },
    captureZones: { // this is the place where 
      red : {x1: 950, y1: 350, x2: 1100, y2: 500}, // left top right bottom
      blue : {x1: 0, y1: 0, x2: 100, y2: 100},
    },
  },
}
// for now set the map to lobby 
currentMap = maps.lobby
platforms = currentMap.platforms

//---------------------------------
// GLOBAL VARIABLES
//---------------------------------
var gameState = {}; //socket.id = {lots of info of the player} offical game state
var playerInputs = {}; //socket.id = {lots of info of the player} stuff that the client sends to the server
var userInfos = {}; //socket.id = {other infromation what only the server knows}
var userNames = []; //to store all usernames in use rn
var teams = {}; // store all the teams and their players
teams = {
  red : {}, // socket.id = 
  blue : {},
}
var spectators = []; //this is only a feature plan
var rooms = []; // this on is also just a plan


//---------------------------------
// FUNCTIONS
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
function Player(name, id, room, color, x, y) {
  this.name = name;
  this.id = id;
  this.room = room;
  this.width = 20;
  this.height = 20;
  this.color = color;
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
  this.maxDX = 300;
  this.maxDY = 600;
  this.jumpForce = 550;
  this.acceleration = 40; 
  this.friction = 50;
  this.grounded = false;
  this.doubleJumpingAllowed = true;
  this.jumpCooldown = 0.3;
  this.lastJump = Date.now();
  this.wallJumpingLeft = false;
  this.wallJumpingRight = false;
  this.wallJumping = false;
  this.freemode = false;
  this.latency = 0;
  this.state = 'joining';
  this.team = null;
  this.health = 100;
  this.hasFlag = false;

  this.lastUpdate = Date.now();
  // ezt majd vedd ki
  this.deltaTime = 1/60;
}
function Flag(x, y, color, team) {
  this.width = 20;
  this.height = 20;
  this.color = color;
  this.x = x;
  this.y = y;
  this.dX = 0;
  this.dY = 0;
  this.collision = {
    top: false,
    bottom: false,
    left: false,
    right: false
  };
  this.gravity = 9.81*45;
  this.maxDX = 300;
  this.maxDY = 600;
  this.grounded = false;
  this.team = team;
}

function flagIsCaptured(map, team) { // if the flag is inside the capturpoint
  // check if the flag is captured
  if (map.capturpoints.red.x1 < gameState[team].x && gameState[team].x < map.capturpoints.red.x2 && map.capturpoints.red.y1 < gameState[team].y && gameState[team].y < map.capturpoints.red.y2) {
    return true
  } else {
    return false
  }
}
function flagTouchingPlayer(player, flag) { // if the player is touching the flag
  if (collisionAABB(player, flag)) {
    return true
  } else {
    return false
  }
}
function chooseTeam(teams) {
  // choose the team with the least players and if the teams are equaly big choose randomly 
  if (Object.keys(teams.red).length < Object.keys(teams.blue).length) {
    return 'red'
  } else if (Object.keys(teams.red).length > Object.keys(teams.blue).length) {
    return 'blue'
  } else {
    if (Math.random() < 0.5) {
      return 'red'
    } else {
      return 'blue'
    }
  }
}

function updateGame() {
  // update the game state according to the input (playerInput)
  for (const [id, input] of Object.entries(playerInputs)) {
    // Update player state based on input
    //console.log('update player', id, input);
    updatePlayer(gameState[id], input, deltaTime);
  }
};

function updatePlayer(player, input, deltaTime) {
  if (player) {
    if (!checkIFValidPosition(player)) {
      player.dY = -1
      console.log('INVALID POSITION', player.id, player.name, player.x, player.y, player.dX, player.dY);
      while (!checkIFValidPosition(player)) {
        player.y -= 1
      }
    }
    if(falloffDetection(player)) { // the player fallen of the map
      // send player to its spawn
      player.x = currentMap.spawnpoints[player.team].x
      player.y = currentMap.spawnpoints[player.team].y
      player.dX = 0
      player.dY = 0
      return
    }
    if(player.hasFlag === false) { 
      //detect if the player touched the enemy flag
      if (player.team === 'red') { //
        if (flagTouchingPlayer(player, currentMap.flags.blue)) {
          // the enemy flag should be carried by the player
          player.hasFlag = 'blue'
          console.log(player.name, 'has the blue flag');
        }
      };
      if(player.team === 'blue') {
        if (flagTouchingPlayer(player, currentMap.flags.red)) {
          // the enemy flag should be carried by the player
          player.hasFlag = 'red'
          console.log(player.name, 'has the red flag');
        }
      }
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
      player.doubleJumpingAllowed = true;
      player.grounded = false;
      player.lastJump = Date.now();
    }
    if (input.jump && player.doubleJumpingAllowed && Date.now() - player.lastJump > player.jumpCooldown * 1000) { // double jump
      if (player.dY > 0) {
        player.dY = player.dY / 3;
      }
      player.dY -= player.jumpForce;
      player.doubleJumpingAllowed = false;  
      player.lastJump = Date.now();
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
    //console.log(player.lastUpdate)
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
      player.doubleJumpingAllowed = true;
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

function checkIFValidPosition(enity) { 
  for (let platform of platforms) {
    if (collisionAABB(enity, platform)) {
      return false;
    }
  }
  return true;
}

//--------------------------------
// SERVER SETUP
//--------------------------------
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));
app.set('view engine', 'ejs');

// Handle 404 errors
app.use((req, res, next) => {
  res.status(404).sendFile(path.join(publicPath, '404.html'));
});

server.listen(port, function () {
  const ip = Object.values(os.networkInterfaces())
    .flatMap((iface) => iface.filter((info) => info.family === 'IPv4' && !info.internal))
    .map((info) => info.address)[0];
    console.log(`Server version: ${version}`);
    console.log(`Server environment: ${environment}`);
    console.log(`Server listening on http://${host}:${port}`);
    console.log(`Server listening on http://${ip}:3000`);
});

//---------------------------------
// SOCKET.IO
//---------------------------------
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
  socket.emit('maps', maps);
  socket.emit('currentMap', gameMap);
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

    var wichTeam = chooseTeam(teams)
    teams[wichTeam][socket.id] = name
    //console.log(teams) // strangly sometimes the socket.id is in '' and sometimes not
    spawnpoint = currentMap.spawnpoints[wichTeam]
    gameState[socket.id] = new Player(name, socket.id, 'lobby', wichTeam, spawnpoint.x, spawnpoint.y); // spawn the player in the lobby
    gameState[socket.id].team = wichTeam
    console.log(gameState[socket.id].team)
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
// SERVER TICK
//---------------------------------
// Delta time alap mertekegysege: ms
// az idealis 1/60 seconds ami milisecondben 16.66
var lastTime = Date.now();
var deltaTime = 1/60;
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
}, 1000/ 60);

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