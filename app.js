var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var WebSocketServer = require('websocket').server;
var http = require('http');

var routes = require('./routes/index');
var users = require('./routes/users');

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

app.use('/', routes);
app.use('/users', users);

var mapX = 1000;
var mapY = 600;

//game logic
var mapObj = {MAP:[]};
var starNamesList = ["Ain", "Acamar", "Acrux", "Albireo", "Alcor", "Altais", "Betria", "Caph", "Chara", "Dabih",
                  "Decrux", "Diphda", "Duhr",  "Enif", "Errai", "Furud", "Gatria", "Giedi", "Hadar", "Heka",
                  "Kajam", "Kastra", "Keid", "Kraz", "Kuma", "Maasym", "Maia", "Markab", "Gemini", "Cetus",
                  "Corvus", "Naos", "Pherkad", "Polaris", "Pollux", "Rana", "Regor", "Rigel", "Sabik", "Zain"];

for(i=0; i < 4; i++) {
  switch(i) {
    case 0:
      var xMin = 0;
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
      var xMin = 0;
      var xMax = 500;
      var yMin = 0;
      var yMax = 300;
      break;
    case 3:
      var xMin = 500;
      var xMax = 1000;
      var yMin = 0;
      var yMax = 300;
      break;
  }
  for (j = 0; j < 10; j++) {
    var x = Math.floor(Math.random() * (xMax - xMin + 1)) + xMin;
    var y = Math.floor(Math.random() * (yMax - yMin + 1)) + yMin;

    mapObj.MAP.push({
      "i": {
        id: starNamesList.splice(Math.floor(Math.random() * starNamesList.length), 1),
        type: "star",
        ships: "5",
        destination: "null",
        x: x,
        y: y,
        resourceBase: "10",
        science: "1",
        industry: "1",
        economy: "1",
        owner: "2"
      }
    });
  }
}

mapObj.MAP.push({
  "i": {
    id: starNamesList.splice(Math.floor(Math.random() * starNamesList.length), 1),
    type: "ship",
    ships: "5",
    destination: "Duhr",
    x: 500,
    y: 200,
    owner: "2"
  }
});
console.log("log");
console.log(JSON.stringify(mapObj));

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
  console.log((new Date()) + ' Connection accepted.');
  connection.on('message', function(message) {
    if (message.type === 'utf8') {
      console.log('Received Message: ' + message.utf8Data);
      if(message.utf8Data == "Map?") {
        connection.send(JSON.stringify(mapObj));
      }
    }
  });
  connection.on('close', function(reasonCode, description) {
    console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
  });
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
