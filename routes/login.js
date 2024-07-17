const express = require('express');
const router = express.Router();
const mysql = require('mysql');
const bcrypt = require('bcryptjs');
const session = require('client-sessions');
const path = require("path");

const app = express();

let configJs;

try {
    configJs = require('./config.js');
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
    res.render('login');
});

router.post('/', function(req, res){


    const connection = mysql.createConnection({
        host: config.rdsHost,
        user: config.rdsUser,
        password: config.rdsPassword,
        database: config.rdsDatabase
    });

    connection.connect();

    connection.query('CALL login("' + req.body.username + '")', function(err, rows, fields){
        if (!err && rows[0][0] != undefined) {
            bcrypt.compare(req.body.password, rows[0][0].hashedPassword, function(err, response) {  //todo: bcrypt.compare(req.body.password + "salty salt", rows[0][0].hashedPassword, function(err, response) {
                if(response){
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
