const express = require('express');
const router = express.Router();
const mysql = require('mysql');
const session = require('client-sessions');
const path = require("path");

const app = express();

let configJs;

try {
    configJs = require('../config.js');
} catch (error) {
    configJs = {
        secret: "someSecret",
        rdsHost: "rdsHost",
        rdsUser: "rdsUser",
        rdsPassword: "rdsPassword",
        rdsDatabase: "rdsDatabase"
    }
}

const config = configJs;

app.use(session({
    cookieName: 'session',
    secret: config.secret,
    duration: 24 * 60 * 60 * 1000,
    activeDuration: 24 * 60 * 60 * 1000
}));

router.get('/', function(req, res, next) {
    if(req.session.user) {
        if (req.session && req.session.user) {
            const connection = mysql.createConnection({
                host: config.rdsHost,
                user: config.rdsUser,
                password: config.rdsPassword,
                database: config.rdsDatabase
            });

            connection.connect();
            const query = 'select * from games where status between 0 and 2;';
            connection.query(query, function (err, rows, fields) {
                if (!err) {
                    if (rows[0] == null) {
                        renderWelcomePage(res);
                    } else {
                        const data = getGamesFromRows(rows);
                        const stringFromServer = JSON.stringify(rows);
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

    const connection = mysql.createConnection({
        host: config.rdsHost,
        user: config.rdsUser,
        password: config.rdsPassword,
        database: config.rdsDatabase
    });

    connection.connect();

    connection.query('CALL createGame("' + req.body.gameName + '", "' + req.body.username + '")', function(err, rows, fields){
        if (!err && rows != undefined) {
            res.send();
        } else {
            console.log('Error while performing Query.');
            console.log(err.code);
            console.log(err.message);
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
    const returnedRows = [];
    for(let i = 0; i < rows.length; i++) {
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