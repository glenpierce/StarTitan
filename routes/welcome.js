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
    if(req.session.user) {
        if (req.session && req.session.user) {
            connection = mysql.createConnection({
                host: config.rdsHost,
                user: config.rdsUser,
                password: config.rdsPassword,
                database: config.rdsDatabase
            });

            connection.connect();
            query = 'select * from games where status between 0 and 2;';
            connection.query(query, function (err, rows, fields) {
                if (!err) {
                    if (rows[0] == null) {
                        renderWelcomePage(res);
                    } else {
                        data = getGamesFromRows(rows);
                        stringFromServer = JSON.stringify(rows);
                        res.render('welcome', {
                            gamesObject: data,
                            gamesString: stringFromServer,
                            username: req.session.user
                        });
                    }
                } else {
                    console.log(err);
                    console.log(err.code);
                    console.log(err.message);
                }
            });
            connection.end();
        } else {
            renderWelcomePage(res);
        }
    } else {
        res.redirect('login');
    }
});

router.post('/', function(req, res){

    console.log(req.body);

    var connection = mysql.createConnection({
        host: config.rdsHost,
        user: config.rdsUser,
        password: config.rdsPassword,
        database: config.rdsDatabase
    });

    connection.connect();

    connection.query('CALL createGame("' + req.body.gameName + '", "' + req.body.username + '")', function(err, rows, fields){
        if (!err && rows != undefined) {
            console.log(rows);
            res.send();
        } else {
            console.log('Error while performing Query.');
            res.send();
        }
    });

    connection.end();
});

function renderWelcomePage(res){
    res.render('welcome', {
        fromServer: "nothing",
        stringFromServer: "stringFromServer",
        username: "req.session.user",
        games: [
            {gameName: "name", gamePlayerCount: "player Count", gameStatus: "null"}
        ]
    });
}

function getGamesFromRows(rows){
    if(rows == null || rows.length < 1){
        return "";
    }
    var returnedRows = [];
    for(i = 0; i < rows.length; i++) {
        game = {};
        game.id = rows[i].id;
        game.name = rows[i].name;
        game.status = rows[i].status;
        game.creator = rows[i].creator;
        returnedRows.push(game);
    }
    return returnedRows;
}

module.exports = router;