const express = require('express');
const router = express.Router();

router.get('/', function(req, res, next) {
  res.sendFile( "views/index.html",{ root: '.' }); //I don't want to waste time rendering this page, so I just wrote it in HTML
});

module.exports = router;