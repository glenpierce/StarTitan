var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var session = require('client-sessions');
var path = require("path");
var http = require('http');
var https = require('https');
var config = require('../config.js');

var app = express();

router.get('/update', function(req, res, next) {
    update();
    res.redirect('/');
});

function update(){
    connection = mysql.createConnection({
        host: config.rdsHost,
        user: config.rdsUser,
        password: config.rdsPassword
        //database: config.rdsDatabase //we have not yet created the database schema, so trying to connect to a schema will not work
    });

    connection.connect();

    query = [];

    createDb = "create database starTitan;";
    query.push(createDb);

    useDb = "use starTitan;";
    query.push(useDb);

    createUsersTable =
        "create table users(" +
        "email VARCHAR(254) NOT NULL," +
        "hashedPassword CHAR(254) not null," +
        "alias VARCHAR(254) NOT NULL," +
        "privileges INT, " +
        "PRIMARY KEY (email)," +
        "UNIQUE INDEX (email)" +
        ");";
    query.push(createUsersTable);

    createGamesTable =
        "create table games(" +
        "`id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY," +
        "`turn` INT" +
        "`players` JSON" +
        "`json` JSON" +
        ");";

    for(var i = 0; i < query.length; i++) {

        console.log(query[i]);
        connection.query(query[i], function (err, rows, fields) {
            if (!err) {
                console.log("success");
            } else {
                console.log('Error while performing Query.');
                console.log(err.code);
                console.log(err.message);
            }
        });

    }

    connection.end();
}

module.exports = router;