var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var session = require('client-sessions');
var path = require("path");

var app = express();

var config = require('../config.js');

app.use(session({
    cookieName: 'session',
    secret: config.secret,
    duration: 24 * 60 * 60 * 1000,
    activeDuration: 24 * 60 * 60 * 1000
}));

router.get('/', function(req, res, next) {
    console.log("Welcome");
    if (req.session && req.session.user) {
        connection = mysql.createConnection({
            host: config.rdsHost,
            user: config.rdsUser,
            password: config.rdsPassword,
            database: config.rdsDatabase
        });

        connection.connect();
        query = 'CALL getGamesByUser(' + req.session.user + ');';
        connection.query(query, function(err, rows, fields) {
            if (!err) {
                data = rows[0][0];
                stringFromServer = JSON.stringify(rows[0][0]);
                console.log(data);
                res.render('welcome', {
                    fromServer: data,
                    stringFromServer: stringFromServer,
                    username: req.session.user
                });
            } else {
                console.log(err);
            }
        });
        connection.end();
    } else {
        res.render('login');
    }
});

module.exports = router;