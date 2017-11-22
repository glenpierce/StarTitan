var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
  res.sendfile("views/index.html"); //I don't want to waste time rendering this page, so I just wrote it in HTML
});

module.exports = router;