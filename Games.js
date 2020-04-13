const games = [];

function createNewGame(socket) {
    let game = {};
    game.id = socket * 10;
    game.players = [];
    game.sockets = [socket];
    game.map = {MAP:[],PlayerData:[]};
    // setupGame(map);
    game.shipSpeed = 20;
    game.gameSpeed = 1000;
    return game;
}

games.push(createNewGame("1"));
games.push(createNewGame("2"));

module.exports = games;