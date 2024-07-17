const express = require('express');
const router = express.Router();
const games = require('../Games');

router.get('/', function(req, res, next) {
  if (req.session.user == undefined) {
    req.session.user = `Player_${Math.floor(Math.random() * 100)}`;
  }
  console.log(`username: ${req.session.user}`);
  res.render( 'index',{ user: req.session.user }); //I don't want to waste time rendering this page, so I just wrote it in HTML
});

router.get('/test', function (req, res, next) {
  res.type('text/plain');
  res.send(JSON.stringify(games, null, 2));
});

router.get('/getGames', function (req, res, next) {
  res.type('application/json');
  let gameIds = [];
  games.forEach(game => {
    gameIds.push(game.id);
  });

  res.send(gameIds);
});

// router.get('/getUserName', function (req, res, next) {
//   res.type('application/json');
//   // console.log(req);
//   res.send(req.body);
// });

module.exports = router;