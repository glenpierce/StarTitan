var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var WebSocketServer = require('websocket').server;
var http = require('http');

var index = require('./routes/index');
var welcome = require('./routes/welcome');
var login = require('./routes/login');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/welcome', welcome);
app.use('/login', login);

var map = {MAP:[],PlayerData:[]};
var shipSpeed = 20;
var gameSpeed = 1000;
var players = [];
setupGame(map);
var gameOn = false;

var server = http.createServer(function(request, response) {
  console.log((new Date()) + ' Received request for ' + request.url);
  response.writeHead(404);
  response.end();
});
server.listen(3001, function() {
  console.log((new Date()) + ' Server is listening on port 3001');
});

wsServer = new WebSocketServer({
  httpServer: server,
  // You should not use autoAcceptConnections for production applications
  autoAcceptConnections: false
});

function originIsAllowed(origin) {
  // put logic here to detect whether the specified origin is allowed.
  return true;
}

wsServer.on('request', function(request) {
  if (!originIsAllowed(request.origin)) {
    request.reject();
    console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
    return;
  }

  var connection = request.accept('echo-protocol', request.origin);
  global.connection = connection;
  console.log((new Date()) + ' Connection accepted.');
  connection.on('message', function(message) {
    if (message.type === 'utf8') {
      console.log('Received Message: ' + message.utf8Data);
      if(message.utf8Data == "Map?") {
        gameOn = true;
        connection.send(JSON.stringify(map));
      } else if(message.utf8Data.substr(0,1) != "c"){
        var order = {order:[]};
        order = JSON.parse(message.utf8Data);
        console.log(JSON.stringify(order));
        console.log(order.order[0].id);
        dispatchOrder(order);
      }
    }
  });
  connection.on('close', function(reasonCode, description) {
    console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
  });
});

// catch 404 and forward to error handler
  app.use(function (req, res, next) {
    var err = new Error('Not Found');
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

  setInterval(gameLoop, gameSpeed);

  function gameLoop() {
    if(!gameOn){
      return;
    }
    for (i = 0; i < map.MAP.length; i++) {
      if (map.MAP[i].i.type == "star") {
        var industry = parseInt(map.MAP[i].i.industry, 10);
        var ships = parseInt(map.MAP[i].i.ships, 10);
        var owner = parseInt(map.MAP[i].i.owner);
        var manufacturingTech = getManufacturingTech(owner);
        map.MAP[i].i.ships = ships + industry * manufacturingTech;
        map.PlayerData[owner].i.credits = parseInt(map.MAP[i].i.economy) + parseInt(map.PlayerData[owner].i.credits);
      }
      if (map.MAP[i].i.type == "ship") {
        if(map.MAP[i].i.destination != "null") {
          var shipX = parseInt(map.MAP[i].i.x, 10);
          var shipY = parseInt(map.MAP[i].i.y, 10);
          var destinationX = 0;
          var destinationY = 0;
          var starIndex = -1;
          for (var j = 0; j < map.MAP.length; j++) {
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
              if(map.MAP[starIndex].i.owner == map.MAP[i].i.owner) {
                map.MAP[starIndex].i.ships = parseInt(map.MAP[starIndex].i.ships, 10) + parseInt(map.MAP[i].i.ships, 10);
              } else {
                //ship combat
                shipCombat(map.MAP[starIndex].i, map.MAP[i].i);
              }
              map.MAP.splice(i, 1);
            }
          } else {
              if (shipX > destinationX && shipY > destinationY) {
                var angle = Math.atan((shipX - destinationX) / (shipY - destinationY));
                map.MAP[i].i.x = shipX - Math.sin(angle) * shipSpeed;
                map.MAP[i].i.y = shipY - Math.cos(angle) * shipSpeed;
              } else if (shipX > destinationX && shipY < destinationY) {
                var angle = Math.atan((shipX - destinationX) / (destinationY - shipY));
                map.MAP[i].i.x = shipX - Math.sin(angle) * shipSpeed;
                map.MAP[i].i.y = shipY + Math.cos(angle) * shipSpeed;
              } else if (shipX < destinationX && shipY > destinationY) { //this is wrong somewhere
                var angle = Math.atan((destinationX - shipX) / (shipY - destinationY));
                map.MAP[i].i.x = shipX + Math.sin(angle) * shipSpeed;
                map.MAP[i].i.y = shipY - Math.cos(angle) * shipSpeed;
              } else if (shipX < destinationX && shipY < destinationY) {
                var angle = Math.atan((destinationY - shipY) / (destinationX - shipX));
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
    global.connection.send(JSON.stringify(map));
  }

  function getDistancebetween(x0, y0, x1, y1){
    return Math.hypot((x0-x1), (y0-y1));
  }

  function getManufacturingTech(player) {
    for(var i = 0; i < map.PlayerData.length; i++){
      if(player == parseInt(map.PlayerData[i].i.id, 10)){
        return parseInt(map.PlayerData[i].i.manufacturing, 10);
      }
    }
  }

  function getWeaponsTech(player){
    for(var i = 0; i < map.PlayerData.length; i++){
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
      switch (i) {
        case 0:
          var xMin = 10;
          var xMax = 500;
          var yMin = 300;
          var yMax = 600;
          break;
        case 1:
          var xMin = 500;
          var xMax = 1000;
          var yMin = 300;
          var yMax = 600;
          break;
        case 2:
          var xMin = 10;
          var xMax = 500;
          var yMin = 10;
          var yMax = 300;
          break;
        case 3:
          var xMin = 500;
          var xMax = 1000;
          var yMin = 10;
          var yMax = 300;
          break;
      }
      for (j = 0; j < 10; j++) {
        var x = Math.floor(Math.random() * (xMax - xMin + 1)) + xMin;
        var y = Math.floor(Math.random() * (yMax - yMin + 1)) + yMin;

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

    for(var i = 0; i < 5; i++)
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
    for(i=0; i < map.MAP.length; i++) {
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
    for(i=0; i < map.MAP.length; i++) {
      if(map.MAP[i].i.id == order.order[0].id){
        var owner = parseInt(map.MAP[i].i.owner);
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
        var owner = parseInt(map.MAP[i].i.owner);
        if(map.PlayerData[owner].i.credits >= map.MAP[i].i.science) {
          map.PlayerData[owner].i.credits -= map.MAP[i].i.science;
          map.MAP[i].i.science = parseInt(map.MAP[i].i.science, 10) + 1;
        }
        break;
      }
    }
  }

  function incrementEconomyServer(order){
    for(i=0; i < map.MAP.length; i++) {
      if(map.MAP[i].i.id == order.order[0].id){
        var owner = parseInt(map.MAP[i].i.owner);
        if(map.PlayerData[owner].i.credits >= map.MAP[i].i.economy) {
          map.PlayerData[owner].i.credits -= map.MAP[i].i.economy;
          map.MAP[i].i.economy = parseInt(map.MAP[i].i.economy, 10) + 1;
        }
        break;
      }
    }
  }

  function shipCombat(defender, attacker){
    var defenderShips = defender.ships;
    var defenderWeaponsTech = getWeaponsTech(defender.owner);
    var defenderDefenseTech = getDefenseTech(defender.owner);
    var attackerShips = attacker.ships;
    var attackerWeaponsTech = getWeaponsTech(attacker.owner);
    var attackerDefenseTech = getDefenseTech(attacker.owner);

    while(defenderShips > 0 && attackerShips > 0){
      var attackingDamage = attackerShips*attackerWeaponsTech/defenderDefenseTech;
      var defendingDamage = defenderShips*defenderWeaponsTech/attackerDefenseTech;
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

  module.exports = app;