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

io.on('connection', (socket) => {
  socket.on('createNewGame', () => {
    let game = createNewGame(socket);
    games.push(game);
    socket.emit(JSON.stringify(game.map));
  });

  socket.on('playerJoin', (gameId) => {
    addNewPlayer(socket, gameId);
  });

  socket.on('playerAction', (data) => {
    playerAction(socket.id, data);
  });

  socket.on('disconnect', () => {
    removePlayer(socket.id);
  })
});

function createNewGame(socket) {
  let game = {};
  game.id = generateRandomId();
  game.players = [];
  game.sockets = [socket];
  game.map = {MAP:[],PlayerData:[]};
  setupGame(game.map);
  game.shipSpeed = 20;
  game.gameSpeed = 1000;
  return game;
}

function generateRandomId() {
  const min = 0;
  const max = 999999;

  return Math.ceil(Math.random() * (max - min) + min);
}

function addNewPlayer(socket, gameId) {

}

function removePlayer(socketId) {

}

function playerAction(socketId, data) {
  let order = {order:[]};
  order = JSON.parse(data.utf8Data);
  console.log(JSON.stringify(order));
  console.log(order.order[0].id);
  dispatchOrder(order);
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

  setInterval(gameLoop, 60000);

  function gameLoop() {
    games.forEach(game => {
      if (game.state == 'PAUSED') {
        return;
      } else {
        let map = game.map;
        for (let i = 0; i < map.MAP.length; i++) {
          if (map.MAP[i].i.type == "star") {
            let industry = parseInt(map.MAP[i].i.industry, 10);
            let ships = parseInt(map.MAP[i].i.ships, 10);
            let owner = parseInt(map.MAP[i].i.owner);
            let manufacturingTech = getManufacturingTech(owner);
            map.MAP[i].i.ships = ships + industry * manufacturingTech;
            map.PlayerData[owner].i.credits = parseInt(map.MAP[i].i.economy) + parseInt(map.PlayerData[owner].i.credits);
          }
          if (map.MAP[i].i.type == "ship") {
            if (map.MAP[i].i.destination != "null") {
              let shipX = parseInt(map.MAP[i].i.x, 10);
              let shipY = parseInt(map.MAP[i].i.y, 10);
              let destinationX = 0;
              let destinationY = 0;
              let starIndex = -1;
              for (let j = 0; j < map.MAP.length; j++) {
                if (map.MAP[j].i.id == map.MAP[i].i.destination) {
                  destinationX = parseInt(map.MAP[j].i.x, 10);
                  destinationY = parseInt(map.MAP[j].i.y, 10);
                  starIndex = j;
                  j = map.MAP.length;
                }
              }
              console.log("ship: (" + shipX + ", " + shipY + ") " + "star:(" + destinationX + ", " + destinationY + ")" + " distance: " + getDistancebetween(shipX, shipY, destinationX, destinationY));
              if (getDistancebetween(shipX, shipY, destinationX, destinationY) <= shipSpeed) {
                if (starIndex != -1) {
                  if (map.MAP[starIndex].i.owner == map.MAP[i].i.owner) {
                    map.MAP[starIndex].i.ships = parseInt(map.MAP[starIndex].i.ships, 10) + parseInt(map.MAP[i].i.ships, 10);
                  } else {
                    //ship combat
                    shipCombat(map.MAP[starIndex].i, map.MAP[i].i);
                  }
                  map.MAP.splice(i, 1);
                }
              } else {
                if (shipX > destinationX && shipY > destinationY) {
                  const angle = Math.atan((shipX - destinationX) / (shipY - destinationY));
                  map.MAP[i].i.x = shipX - Math.sin(angle) * shipSpeed;
                  map.MAP[i].i.y = shipY - Math.cos(angle) * shipSpeed;
                } else if (shipX > destinationX && shipY < destinationY) {
                  const angle = Math.atan((shipX - destinationX) / (destinationY - shipY));
                  map.MAP[i].i.x = shipX - Math.sin(angle) * shipSpeed;
                  map.MAP[i].i.y = shipY + Math.cos(angle) * shipSpeed;
                } else if (shipX < destinationX && shipY > destinationY) { //this is wrong somewhere
                  const angle = Math.atan((destinationX - shipX) / (shipY - destinationY));
                  map.MAP[i].i.x = shipX + Math.sin(angle) * shipSpeed;
                  map.MAP[i].i.y = shipY - Math.cos(angle) * shipSpeed;
                } else if (shipX < destinationX && shipY < destinationY) {
                  const angle = Math.atan((destinationY - shipY) / (destinationX - shipX));
                  map.MAP[i].i.x = shipX + Math.sin(angle) * shipSpeed;
                  map.MAP[i].i.y = shipY + Math.cos(angle) * shipSpeed;
                } else if (shipX == destinationX) {
                  if (shipY > destinationY) {
                    map.MAP[i].i.y = shipY - shipSpeed;
                  } else {
                    map.MAP[i].i.y = shipY + shipSpeed;
                  }
                } else if (shipY == destinationY) {
                  if (shipX > destinationX) {
                    map.MAP[i].i.x = shipX - shipSpeed;
                  } else {
                    map.MAP[i].i.x = shipX + shipSpeed;
                  }
                }
              }
            }
          }
        }
        game.sockets.forEach((socket) => {
          io.to(socket).emit('state', JSON.stringify(map))
        });
      }
    });
  }

  function getDistancebetween(x0, y0, x1, y1){
    return Math.hypot((x0-x1), (y0-y1));
  }

  function getManufacturingTech(player) {
    for(let i = 0; i < map.PlayerData.length; i++){
      if(player == parseInt(map.PlayerData[i].i.id, 10)){
        return parseInt(map.PlayerData[i].i.manufacturing, 10);
      }
    }
  }

  function getWeaponsTech(player){
    for(let i = 0; i < map.PlayerData.length; i++){
      if(player == parseInt(map.PlayerData[i].i.id, 10)){
        return parseInt(map.PlayerData[i].i.weapons, 10);
      }
    }
  }

  function getDefenseTech(player){
    for(var i = 0; i < map.PlayerData.length; i++){
      if(player == parseInt(map.PlayerData[i].i.id, 10)){
        return parseInt(map.PlayerData[i].i.defense, 10);
      }
    }
  }

  function setupGame(map) {
    var starNamesList = ["Ain", "Acamar", "Acrux", "Albireo", "Alcor", "Altais", "Betria", "Caph", "Chara", "Dabih",
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
      for (j = 0; j < 10; j++) {
        let x = Math.floor(Math.random() * (xMax - xMin + 1)) + xMin;
        let y = Math.floor(Math.random() * (yMax - yMin + 1)) + yMin;

        map.MAP.push({
          "i": {
            id: starNamesList.splice(Math.floor(Math.random() * starNamesList.length), 1),
            type: "star",
            ships: "5",
            destination: "null",
            x: x,
            y: y,
            resourceBase: "10",
            science: 1,
            industry: 1,
            economy: 1,
            owner: i
          }
        });
      }
    }

    //map.MAP.push({
    //  "i": {
    //    id: "ship",
    //    type: "ship",
    //    ships: 5,
    //    destination: "Orion",
    //    x: 200,
    //    y: 200,
    //    owner: "4"
    //  }
    //});
    //
    //map.MAP.push({
    //  "i": {
    //    id: "ship",
    //    type: "ship",
    //    ships: 5,
    //    destination: "Orion",
    //    x: 500,
    //    y: 500,
    //    owner: "4"
    //  }
    //});
    //
    //map.MAP.push({
    //  "i": {
    //    id: "ship",
    //    type: "ship",
    //    ships: 5,
    //    destination: "Orion",
    //    x: 200,
    //    y: 500,
    //    owner: "4"
    //  }
    //});
    //
    //map.MAP.push({
    //  "i": {
    //    id: "ship",
    //    type: "ship",
    //    ships: 5,
    //    destination: "Orion",
    //    x: 500,
    //    y: 200,
    //    owner: "4"
    //  }
    //});
    //
    map.MAP.push({
      "i": {
        id: "Orion",
        type: "star",
        ships: 5,
        destination: "null",
        x: 300,
        y: 300,
        resourceBase: "10",
        science: "1",
        industry: "1",
        economy: "1",
        owner: 0
      }
    });

    for(let i = 0; i < 5; i++)
    {
      map.PlayerData.push({
        "i": {
          id: i,
          credits: 0,
          range: 1,
          weapons: 1,
          defense: 1,
          terraforming: 1,
          manufacturing: 1
        }
      });
    }

    console.log(JSON.stringify(map));
  }

  function dispatchOrder(order){
    if(order.order[0].type == "increment"){
      if(order.order[0].industry == "1"){
        incrementIndustryServer(order);
      } else if(order.order[0].science == "1"){
        incrementScienceServer(order);
      } else if(order.order[0].economy == "1"){
        incrementEconomyServer(order);
      }
    } else if(order.order[0].type == "shipOrder"){
      transmitShipOrdersServer(order);
    }
  }

  function transmitShipOrdersServer(order){
    for(let i = 0; i < map.MAP.length; i++) {
      if (map.MAP[i].i.type == "star") {
        if (map.MAP[i].i.id == order.order[0].origin) {
          map.MAP[i].i.ships = parseInt(map.MAP[i].i.ships, 10) - parseInt(order.order[0].numberOfShips, 10);
          break;
        }
      }
    }
    map.MAP.push({
      "i": {
        type: "ship",
        ships: order.order[0].numberOfShips,
        destination: order.order[0].destination[0],
        x: order.order[0].x,
        y: order.order[0].y,
        owner: order.order[0].owner
      }
    });
  }

  function incrementIndustryServer(order){
    for(let i = 0; i < map.MAP.length; i++) {
      if(map.MAP[i].i.id == order.order[0].id) {
        const owner = parseInt(map.MAP[i].i.owner);
        if(map.PlayerData[owner].i.credits >= map.MAP[i].i.industry) {
          map.PlayerData[owner].i.credits -= map.MAP[i].i.industry;
          map.MAP[i].i.industry = parseInt(map.MAP[i].i.industry, 10) + 1;
        }
        break;
      }
    }
  }

  function incrementScienceServer(order){
    for(i=0; i < map.MAP.length; i++) {
      if(map.MAP[i].i.id == order.order[0].id){
        const owner = parseInt(map.MAP[i].i.owner);
        if(map.PlayerData[owner].i.credits >= map.MAP[i].i.science) {
          map.PlayerData[owner].i.credits -= map.MAP[i].i.science;
          map.MAP[i].i.science = parseInt(map.MAP[i].i.science, 10) + 1;
        }
        break;
      }
    }
  }

  function incrementEconomyServer(order){
    for(let i = 0; i < map.MAP.length; i++) {
      if(map.MAP[i].i.id == order.order[0].id){
        const owner = parseInt(map.MAP[i].i.owner);
        if(map.PlayerData[owner].i.credits >= map.MAP[i].i.economy) {
          map.PlayerData[owner].i.credits -= map.MAP[i].i.economy;
          map.MAP[i].i.economy = parseInt(map.MAP[i].i.economy, 10) + 1;
        }
        break;
      }
    }
  }

  function shipCombat(defender, attacker){
    let defenderShips = defender.ships;
    let defenderWeaponsTech = getWeaponsTech(defender.owner);
    let defenderDefenseTech = getDefenseTech(defender.owner);
    let attackerShips = attacker.ships;
    let attackerWeaponsTech = getWeaponsTech(attacker.owner);
    let attackerDefenseTech = getDefenseTech(attacker.owner);

    while(defenderShips > 0 && attackerShips > 0){
      let attackingDamage = attackerShips*attackerWeaponsTech/defenderDefenseTech;
      let defendingDamage = defenderShips*defenderWeaponsTech/attackerDefenseTech;
      defenderShips -= attackingDamage;
      attackerShips -= defendingDamage;
    }
    if(defenderShips > 0){
      defender.ships = defenderShips;
    } else {
      defender.ships = attackerShips;
      defender.owner = attacker.owner;
    }
  }

module.exports = {app: app, server: server};