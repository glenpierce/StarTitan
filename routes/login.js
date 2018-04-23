var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var bcrypt = require('bcryptjs');
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
    res.render('login');
});

router.post('/', function(req, res){

    console.log('login request received');

    var connection = mysql.createConnection({
        host: config.rdsHost,
        user: config.rdsUser,
        password: config.rdsPassword,
        database: config.rdsDatabase
    });

    connection.connect();

    connection.query('CALL login("' + req.body.username + '")', function(err, rows, fields){
        if (!err && rows[0][0] != undefined) {
            console.log(rows);
            bcrypt.compare(req.body.password, rows[0][0].hashedPassword, function(err, response) {  //todo: bcrypt.compare(req.body.password + "salty salt", rows[0][0].hashedPassword, function(err, response) {
                console.log(response);
                if(response){
                    console.log(req);
                    req.session.user = req.body.username;
                    return res.send('/welcome');
                }
            });
        } else {
            console.log('Error while performing Query.');
        }
    });

    connection.end();
});

module.exports = router;
