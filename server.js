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
players = {};
userNames = [];
userInfos = {};
spectators = [];
rooms = [];
exampleplayer = {
  name: 'example',
  id: '0123456789',
  room: 'exampleRoom',
  width: 20,
  height: 20,
  color: 'red',
  x: 1600,
  y: 2000,
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
  gravity: 9.81*0.1, 
  maxDX: 9, 
  maxDY: 50, 
  jumpForce: 10,
  acceleration: 0.8,
  friction: 0.9,
  grounded: false,
  jumping: false,
  doubleJumpingAllowed: true,
  doubleJumping: false,
  jumpCooldown: 0.3,
  wallJumpingLeft: false,
  wallJumpingRight: false,
  wallJumping: false,
  freemode: false,
  latency: 0,
};

exmapleUser = {
  name: 'example',
  id: '0123456789',
  ip: '123.456.789.012',
  screen: {
    width: 1920,
    height: 1080,
  },
  latency: 0,
    
};

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
  if (bannedIPs.includes(socket.handshake.address)) { // banned ip?
    console.log('banned ip tried to connect:', socket.handshake.address);
    socket.emit('forceDiscConnect', true);
    socket.disconnect();
    return;
  }
  else if (players.length >= maxPlayers) { // if max players is reached
    console.log('max players reached:', socket.handshake.address);
    socket.disconnect();
    return;
  }
  else if (io.engine.clientsCount >= maxConnections) { // if max connections is reached
    console.log('max connections reached:', socket.handshake.address);
    socket.disconnect();
    return;
  }
  // log connection
  console.log('a user connected id:', socket.id, 'ip:', socket.handshake.address);
  const userAgent = socket.handshake.headers['user-agent'];
  const isMobile = /Mobile/.test(userAgent);

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
    // create new player
    players[socket.id] = exampleplayer;
    players[socket.id].name = name;
    players[socket.id].id = socket.id;


    // send name to all players
    socket.emit('gameState', players);
    socket.emit('nameSet', name);
    io.emit('namesInUse', userNames);
    console.log('id:', socket.id, 'set name:', name);

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
  
  // disconnect
  socket.on('disconnect', function () {
    console.log('user disconnected id:', socket.id, 'ip:', socket.handshake.address);
    // remove player
    if (socket.name) {
      userNames.splice(userNames.indexOf(socket.name), 1);
      // remove player from players{}
      delete players[socket.id];
      //remove player from userInfos{}
      delete userInfos[socket.id];
    }
    
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
  // update all players

  // send update game state to all clients
  io.emit('gameState', players);

}, 1000/60);

//---------------------------------
// ERROR HANDLING
//---------------------------------
function invalidPositionsToFile(outputPath, invalidPositions, separator) {
  // example of invalidPositions: [{x:1, y:2, dX:3, dY:4, grounded:true, jumping:false, doubleJumping:false, wallJumpingLeft:false, wallJumpingRight:false, wallJumping:false, collision:{left:false, right:false, top:false, bottom:false}}, ...]
  const fs = require('fs');
  let output = '';
  output += `x${separator}y${separator}dX${separator}dY${separator}grounded${separator}jumping${separator}doubleJumping${separator}wallJumpingLeft${separator}wallJumpingRight${separator}wallJumping${separator}collision.left${separator}collision.right${separator}collision.top${separator}collision.bottom \n`;
  invalidPositions.forEach((pos) => {
    output += `${pos.x}${separator}${pos.y}${separator}${pos.dX}${separator}${pos.dY}${separator}${pos.grounded}${separator}${pos.jumping}${separator}${pos.doubleJumping}${separator}${pos.wallJumpingLeft}${separator}${pos.wallJumpingRight}${separator}${pos.wallJumping}${separator}${pos.collision.left}${separator}${pos.collision.right}${separator}${pos.collision.top}${separator}${pos.collision.bottom}
`;
  });
  fs.writeFileSync('./errors.txt', output);
}