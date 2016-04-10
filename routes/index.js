var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  //res.render('index', { title: 'Express' });
  res.sendfile("views/index.html");
  //var mapString = "{map:[]}";
  //var mapObj = JSON.parse(mapString);
  //mapObj.push({id:"sol", type:"star", ships:"0", destination:"null", x:"0", y:"0", resourceBase:"10", science:"1", industry:"1", economy:"1"});
  //
  //res.json({json:"json"});
  //var canvas = document.getElementById("myCanvas");
  //canvas.width = document.body.clientWidth;
  //canvas.height = document.body.clientHeight;
  //var context = canvas.getContext("2d");
  //context.fillStyle = "#FF0000";
  //context.fillRect(0,0,150,75);
});

module.exports = router;