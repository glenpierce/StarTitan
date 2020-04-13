const express = require('express');
const router = express.Router();
const games = require('../Games');

router.get('/', function(req, res, next) {
  res.sendFile( "views/index.html",{ root: '.' }); //I don't want to waste time rendering this page, so I just wrote it in HTML
});

router.get('/test', function (req, res, next) {
  res.type('text/plain');
  res.send(JSON.stringify(games, null, 2));
});

module.exports = router;