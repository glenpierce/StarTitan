const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.Server(app);
const io = socketIO(server);

const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const session = require('client-sessions');

const index = require('./routes/index');
const welcome = require('./routes/welcome');
const login = require('./routes/login');
const createUser = require('./routes/createUser');

const config = require('./config.js');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('port', 3000);
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    cookieName: 'session',
    secret: config.secret,
    duration: 30 * 60 * 1000,
    activeDuration: 5 * 60 * 1000
}));

app.use('/', index);
app.use('/welcome', welcome);
app.use('/login', login);
app.use('/createUser', createUser);

const games = require('./Games');

let newestGameId;

class Game {
  constructor() {
    this.id;
    this.players = [];
    this.playerNames = [];
    this.sockets = [];
    this.map = {MAP: [], PlayerData: []};
    this.shipSpeed;
    this.gameSpeed;
  }

  getPlayerById(socketId) {
    for(let i = 0; i < this.map.PlayerData.length; i++) {
      if (this.map.PlayerData[i].id == socketId)
        return this.map.PlayerData[i];
      if(this.map.PlayerData[i].id == socketId.toString().substring(2))
        return this.map.PlayerData[i];
    }
  }
}

io.on('connection', (socket) => {
  socket.on('createNewGame', (userName) => {
    let game = createNewGame(socket);
    games.push(game);
    addNewPlayer(socket, game.id, userName);
    socket.emit(JSON.stringify(game.map));
  });

  socket.on('playerJoin', (playerJoinObject) => {
    addNewPlayer(socket, playerJoinObject.selectedGameId, playerJoinObject.user);
  });

  socket.on('playerAction', (gameId, data) => {
    playerAction(socket.id, gameId, data);
  });

  socket.on('disconnect', () => {
    removePlayer(socket.id);
  })
});

function createNewGame(socket) {
  let game = new Game();
  game.id = generateRandomId();
  newestGameId = game.id;
  setupGame(game.map);
  game.shipSpeed = 20;
  game.gameSpeed = 1000;
  game.state = "PAUSED";
  return game;
}

function generateRandomId() {
  const min = 0;
  const max = 999999;

  return Math.ceil(Math.random() * (max - min) + min);
}

function addNewPlayer(socket, gameId, userName) {
  let game = getGameById(gameId);
  if(game.playerNames.indexOf(userName) > -1) {
    const index = game.playerNames.indexOf(userName);
    game.players[index] = socket.id;
    game.sockets[index] = socket;
    game.map.PlayerData[index].id = socket.id;
  } else {
    game.players.push(socket.id);
    game.sockets.push(socket);
    game.playerNames.push(userName);
    game.map.PlayerData[game.players.length - 1].id = socket.id;
  }
  let playerCount = 0;
  for(player in game.players) {
    if (player != null) {
      playerCount++;
    }
  }
  if(playerCount == 4) {
    game.state = "STARTED";
  }
  socket.emit('playerAdded', gameId);
}

function getGameById(gameId) {
  let foundGame;
  if(gameId == null) {
    gameId = newestGameId;
  }
  games.forEach(game => {
    if(game.id == gameId) {
      foundGame = game;
    }
  });
  return foundGame;
}

function removePlayer(socketId) {
  // const removedPlayerIndex = game.players.indexOf(socketId);
  // game.players[removedPlayerIndex] = null;
  // game.state = "PAUSED";
}

function playerAction(socketId, gameId, data) {
  let order = {order:[]};
  order = JSON.parse(data);
  console.log(JSON.stringify(order));
  dispatchOrder(socketId, getGameById(gameId), order);
}

// catch 404 and forward to error handler
  app.use(function (req, res, next) {
    const err = new Error('Not Found');
    err.status = 404;
    next(err);
  });

// error handlers

// development error handler
// will print stacktrace
  if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
      res.status(err.status || 500);
      res.render('error', {
        message: err.message,
        error: err
      });
    });
  }

// production error handler
// no stacktraces leaked to user
  app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: {}
    });
  });

  setInterval(gameLoop, 1000);

  function gameLoop() {
    games.forEach(game => {
      if (game.state == 'PAUSED') {
        return;
      } else {
        let map = game.map;
        for (let i = 0; i < map.MAP.length; i++) {
          if (map.MAP[i].type == "star") {
            let industry = parseInt(map.MAP[i].industry, 10);
            let ships = parseInt(map.MAP[i].ships, 10);
            let owner = parseInt(map.MAP[i].owner);
            let manufacturingTech = getManufacturingTech(game, owner);
            map.MAP[i].ships = ships + industry * manufacturingTech;
            map.PlayerData[owner].credits = parseInt(map.MAP[i].economy) + parseInt(map.PlayerData[owner].credits);
            if(isNaN(map.PlayerData[owner].researchPoints))
              map.PlayerData[owner].researchPoints = "0";
            map.PlayerData[owner].researchPoints = parseInt(map.MAP[i].science) + parseInt(map.PlayerData[owner].researchPoints);
          }
          if (map.MAP[i].type == "ship") {
            if (map.MAP[i].destination != "null") {
              let shipX = parseInt(map.MAP[i].x, 10);
              let shipY = parseInt(map.MAP[i].y, 10);
              let destinationX = 0;
              let destinationY = 0;
              let starIndex = -1;
              for (let j = 0; j < map.MAP.length; j++) {
                if (map.MAP[j].id == map.MAP[i].destination) {
                  destinationX = parseInt(map.MAP[j].x, 10);
                  destinationY = parseInt(map.MAP[j].y, 10);
                  starIndex = j;
                  j = map.MAP.length;
                }
              }
              // console.log("ship: (" + shipX + ", " + shipY + ") " + "star:(" + destinationX + ", " + destinationY + ")" + " distance: " + getDistanceBetween(shipX, shipY, destinationX, destinationY));
              if (getDistanceBetween(shipX, shipY, destinationX, destinationY) <= game.shipSpeed) {
                if (starIndex != -1) {
                  if (map.MAP[starIndex].owner == map.MAP[i].owner) {
                    map.MAP[starIndex].ships = parseInt(map.MAP[starIndex].ships, 10) + parseInt(map.MAP[i].ships, 10);
                  } else {
                    //ship combat
                    shipCombat(game, map.MAP[starIndex], map.MAP[i]);
                  }
                  map.MAP.splice(i, 1);
                }
              } else {
                if (shipX > destinationX && shipY > destinationY) {
                  const angle = Math.atan((shipX - destinationX) / (shipY - destinationY));
                  map.MAP[i].x = shipX - Math.sin(angle) * game.shipSpeed;
                  map.MAP[i].y = shipY - Math.cos(angle) * game.shipSpeed;
                } else if (shipX > destinationX && shipY < destinationY) {
                  const angle = Math.atan((shipX - destinationX) / (destinationY - shipY));
                  map.MAP[i].x = shipX - Math.sin(angle) * game.shipSpeed;
                  map.MAP[i].y = shipY + Math.cos(angle) * game.shipSpeed;
                } else if (shipX < destinationX && shipY > destinationY) { //this is wrong somewhere
                  const angle = Math.atan((destinationX - shipX) / (shipY - destinationY));
                  map.MAP[i].x = shipX + Math.sin(angle) * game.shipSpeed;
                  map.MAP[i].y = shipY - Math.cos(angle) * game.shipSpeed;
                } else if (shipX < destinationX && shipY < destinationY) {
                  const angle = Math.atan((destinationY - shipY) / (destinationX - shipX));
                  map.MAP[i].x = shipX + Math.sin(angle) * game.shipSpeed;
                  map.MAP[i].y = shipY + Math.cos(angle) * game.shipSpeed;
                } else if (shipX == destinationX) {
                  if (shipY > destinationY) {
                    map.MAP[i].y = shipY - game.shipSpeed;
                  } else {
                    map.MAP[i].y = shipY + game.shipSpeed;
                  }
                } else if (shipY == destinationY) {
                  if (shipX > destinationX) {
                    map.MAP[i].x = shipX - game.shipSpeed;
                  } else {
                    map.MAP[i].x = shipX + game.shipSpeed;
                  }
                }
              }
            }
          }
        }
        map.PlayerData.forEach(player => {
          if(player.researchTarget != null) {
            if (player[player.researchTarget] < player.researchPoints / 10) {
              player[player.researchTarget]++;
              player.researchPoints -= player[player.researchTarget] * 10;
            }
          }
        });
        game.sockets.forEach((socket) => {
          socket.emit('state', JSON.stringify(map))
        });
      }
    });
  }

  function getDistanceBetween(x0, y0, x1, y1) {
    return Math.hypot((x0-x1), (y0-y1));
  }

  function getManufacturingTech(game, player) {
    return parseInt(game.map.PlayerData[player].manufacturing, 10);
  }

  function getWeaponsTech(game, player) {
    return parseInt(game.map.PlayerData[player].weapons, 10);
  }

  function getDefenseTech(game, player) {
    return parseInt(game.map.PlayerData[player].defense, 10);
  }

  function setupGame(map) {
    const starNamesList = ["Ain", "Acamar", "Acrux", "Albireo", "Alcor", "Altais", "Betria", "Caph", "Chara", "Dabih",
      "Decrux", "Diphda", "Duhr", "Enif", "Errai", "Furud", "Gatria", "Giedi", "Hadar", "Heka",
      "Kajam", "Kastra", "Keid", "Kraz", "Kuma", "Maasym", "Maia", "Markab", "Gemini", "Cetus",
      "Corvus", "Naos", "Pherkad", "Polaris", "Pollux", "Rana", "Regor", "Rigel", "Sabik", "Zain"];

    for (i = 0; i < 4; i++) {
      let xMin;
      let xMax;
      let yMin;
      let yMax;
      switch (i) {
        case 0:
          xMin = 10;
          xMax = 500;
          yMin = 300;
          yMax = 600;
          break;
        case 1:
          xMin = 500;
          xMax = 1000;
          yMin = 300;
          yMax = 600;
          break;
        case 2:
          xMin = 10;
          xMax = 500;
          yMin = 10;
          yMax = 300;
          break;
        case 3:
          xMin = 500;
          xMax = 1000;
          yMin = 10;
          yMax = 300;
          break;
      }
      let x;
      let y;

      for (j = 0; j < 9; j++) {
        x = Math.floor(Math.random() * (xMax - xMin + 1)) + xMin;
        y = Math.floor(Math.random() * (yMax - yMin + 1)) + yMin;

        map.MAP.push({
          id: starNamesList.splice(Math.floor(Math.random() * starNamesList.length), 1),
          type: "star",
          ships: "0",
          destination: "null",
          x: x,
          y: y,
          resourceBase: "10",
          science: 0,
          industry: 0,
          economy: 0,
          owner: 4
        });
      }

      x = Math.floor(Math.random() * (xMax - xMin + 1)) + xMin;
      y = Math.floor(Math.random() * (yMax - yMin + 1)) + yMin;

      map.MAP.push({
        id: starNamesList.splice(Math.floor(Math.random() * starNamesList.length), 1),
        type: "star",
        ships: "0",
        destination: "null",
        x: x,
        y: y,
        resourceBase: "10",
        science: 1,
        industry: 1,
        economy: 1,
        owner: i
      });
    }

    //map.MAP.push({
  //    id: "ship",
  //    type: "ship",
  //    ships: 5,
  //    destination: "Orion",
  //    x: 200,
  //    y: 200,
  //    owner: "4"
    //});
    //
    //map.MAP.push({
    //    id: "ship",
    //    type: "ship",
    //    ships: 5,
    //    destination: "Orion",
    //    x: 500,
    //    y: 500,
    //    owner: "4"
    //});
    //
    //map.MAP.push({
    //    id: "ship",
    //    type: "ship",
    //    ships: 5,
    //    destination: "Orion",
    //    x: 200,
    //    y: 500,
    //    owner: "4"
    //});
    //
    //map.MAP.push({
    //    id: "ship",
    //    type: "ship",
    //    ships: 5,
    //    destination: "Orion",
    //    x: 500,
    //    y: 200,
    //    owner: "4"
    //});
    //
    map.MAP.push({
      id: ["Orion"],
      type: "star",
      ships: 5,
      destination: "null",
      x: 300,
      y: 300,
      resourceBase: "10",
      science: "0",
      industry: "0",
      economy: "0",
      owner: 4
    });

    for(let i = 0; i < 5; i++) {
      map.PlayerData.push({
        id: i,
        credits: 0,
        range: 1,
        weapons: 1,
        defense: 1,
        terraforming: 1,
        manufacturing: 1,
        scanning: 1
      });
    }

    // console.log(JSON.stringify(map));
  }

  function dispatchOrder(socketId, game, order) {
    if(order.order[0].type == "increment") {
      if(order.order[0].industry == "1") {
        incrementIndustryServer(socketId, game, order);
      } else if(order.order[0].science == "1") {
        incrementScienceServer(socketId, game, order);
      } else if(order.order[0].economy == "1") {
        incrementEconomyServer(socketId, game, order);
      }
    } else if(order.order[0].type == "shipOrder") {
      transmitShipOrdersServer(socketId, game, order);
    } else if(order.order[0].type =="researchTarget") {
      game.getPlayerById(socketId).researchTarget = order.order[0].tech;
    }
  }

  function transmitShipOrdersServer(socketId, game, order) {
    for(let i = 0; i < game.map.MAP.length; i++) {
      if (game.map.MAP[i].type == "star") {
        if (game.map.MAP[i].id == order.order[0].origin) {
          game.map.MAP[i].ships = parseInt(game.map.MAP[i].ships, 10) - parseInt(order.order[0].numberOfShips, 10);
          break;
        }
      }
    }
    game.map.MAP.push({
      type: "ship",
      ships: order.order[0].numberOfShips,
      destination: order.order[0].destination[0],
      x: order.order[0].x,
      y: order.order[0].y,
      owner: order.order[0].owner
    });
  }

  function incrementIndustryServer(socketId, game, order) {
    for(let i = 0; i < game.map.MAP.length; i++) {
      if(game.map.MAP[i].id == order.order[0].id) {
        const owner = parseInt(game.map.MAP[i].owner);
        if(game.map.PlayerData[owner].credits >= game.map.MAP[i].industry) {
          game.map.PlayerData[owner].credits -= game.map.MAP[i].industry;
          game.map.MAP[i].industry = parseInt(game.map.MAP[i].industry, 10) + 1;
        }
        break;
      }
    }
  }

  function incrementScienceServer(socketId, game, order) {
    for(let i = 0; i < game.map.MAP.length; i++) {
      if(game.map.MAP[i].id == order.order[0].id) {
        const owner = parseInt(game.map.MAP[i].owner);
        if(game.map.PlayerData[owner].credits >= game.map.MAP[i].science) {
          game.map.PlayerData[owner].credits -= game.map.MAP[i].science;
          game.map.MAP[i].science = parseInt(game.map.MAP[i].science, 10) + 1;
        }
        break;
      }
    }
  }

  function incrementEconomyServer(socketId, game, order) {
    for(let i = 0; i < game.map.MAP.length; i++) {
      if(game.map.MAP[i].id == order.order[0].id) {
        const owner = parseInt(game.map.MAP[i].owner);
        if(game.map.PlayerData[owner].credits >= game.map.MAP[i].economy) {
          game.map.PlayerData[owner].credits -= game.map.MAP[i].economy;
          game.map.MAP[i].economy = parseInt(game.map.MAP[i].economy, 10) + 1;
        }
        break;
      }
    }
  }

  function shipCombat(game, defender, attacker) {
    let defenderShips = defender.ships;
    let defenderWeaponsTech = getWeaponsTech(game, defender.owner);
    let defenderDefenseTech = getDefenseTech(game, defender.owner);
    let attackerShips = attacker.ships;
    let attackerWeaponsTech = getWeaponsTech(game, attacker.owner);
    let attackerDefenseTech = getDefenseTech(game, attacker.owner);

    while(defenderShips > 0 && attackerShips > 0) {
      let defendingDamage = defenderShips * defenderWeaponsTech / attackerDefenseTech;
      attackerShips -= defendingDamage;
      if(attackerShips > 0) {
        let attackingDamage = attackerShips * attackerWeaponsTech / defenderDefenseTech;
        defenderShips -= attackingDamage;
      }
    }
    if(defenderShips > 0) {
      defender.ships = defenderShips;
    } else {
      defender.ships = attackerShips;
      defender.owner = attacker.owner;
    }
  }

module.exports = {app: app, server: server};