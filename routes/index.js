var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
  var canvas = document.getElementById("myCanvas");
  canvas.width = document.body.clientWidth;
  canvas.height = document.body.clientHeight;
  var context = canvas.getContext("2d");
  context.fillStyle = "#FF0000";
  context.fillRect(0,0,150,75);
});

module.exports = router;