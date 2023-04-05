const express = require('express');
const { Socket } = require('socket.io');
const os = require('os');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
require('dotenv').config();

// Settings from .env file 
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
// server settings
const serverSettings = {
  'maxPlayers': 10,
  'maxSpectators': 10,
  'maxPlayersPerRoom': 4,
};

//---------------------------------
// GLOBAL VARIABLES
//---------------------------------

var gameState = {}; //socket.id = {lots of info of the player} offical game state
  players = {}; //socket.id = {lots of info of the player} stuff that the client sends to the server
  userInfos = {}; //socket.id = {other infromation what only the server knows}
  userNames = []; //to store all usernames in use rn
  spectators = []; //this is only a feature plan
  rooms = []; // this on is also just a plan

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
  this.left = false;
  this.right = false;
  this.jump = false;
  this.collision = {
    top: false,
    bottom: false,
    left: false,
    right: false
  };
  this.gravity = 9.81 * 0.1;
  this.maxDX = 9;
  this.maxDY = 50;
  this.jumpForce = 10;
  this.acceleration = 0.8;
  this.friction = 0.9;
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


// socket connection
io.on('connection', function (socket) {
  // detect if the ip is banned
  if (bannedIPs.includes(socket.handshake.address)) {
    console.log('banned ip tried to connect:', socket.handshake.address);
    socket.emit('forceDiscConnect', true);
    socket.disconnect();
    return;
  }
  // if max players is reached
  else if (userNames.length >= maxPlayers) {
    console.log('max players reached:', socket.handshake.address);
    socket.disconnect();
    return;
  }
  // if max connections is reached
  else if (io.engine.clientsCount >= maxConnections) {
    console.log('max connections reached:', socket.handshake.address);
    socket.disconnect();
    return;
  }
  // log connection
  console.log('a user connected id:', socket.id, 'ip:', socket.handshake.address);
  const userAgent = socket.handshake.headers['user-agent'];
  const isMobile = /Mobile/.test(userAgent);

  // save user info
  userInfos[socket.id] = new User('name not set yet', socket.id, socket.handshake.address, 'dont know yet', isMobile);

  // listen for screen size
  socket.on('screenSize', function (screen) {
    userInfos[socket.id].screen = screen;
  });

  //send information for name validation
  socket.emit('NameRules', validName);

  // send names in use to new player
  socket.emit('namesInUse', userNames);

  // setName
  socket.on('setName', function (name) {
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
    if (userNames.includes(name)) {
      socket.emit('invalidName', 'Name is already in use.');
      return;
    }
    // create new player and update userInfos
    userInfos[socket.id].name = name;
    userNames.push(name);
    gameState[socket.id] = new Player(name, socket.id, 'lobby', 0, 0);

    // send name to all players
    socket.emit('gameState', gameState);
    socket.emit('nameSet', name);
    io.emit('namesInUse', userNames);
    console.log('--- new player in game:', gameState[socket.id].name);

    // start game for the new player
    socket.emit('startGame', {});
  });

  // on playerUpdate
  socket.on('playerUpdate', function (player) {
    // check if player is in players{}
    if (players[socket.id]) {
      // update player
      players[socket.id] = player;
    }
    else {
      // add player
      players[socket.id] = player;
    }
  });

  // on tabHidden
  socket.on('tabHidden', function () {
    userInfos[socket.id].active = false;
  });

  // on tabVisible
  socket.on('tabVisible', function () {
    userInfos[socket.id].active = true;
  });
  
  // disconnect
  socket.on('disconnect', function () {
    // remove player and log
    console.log('user disconnected:', socket.id);
    
    // send to all clients except the disconected user the namesInUse
    io.emit('namesInUse', userNames);
  });

  // invalid positions
  socket.on('invalidPositions', function (invalidPositions) {
    invalidPositionsToFile('./temporary/invalidPositions.txt', invalidPositions, ';');
  });
});

//---------------------------------
// SERVER TICK
//---------------------------------
setInterval(function () {
  updateGame();
  io.emit('gameState', gameState);
}, 1000/60);

function updateGame() {

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