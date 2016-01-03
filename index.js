var express = require('express.io');
var app = express();
app.http().io();

/**
 * @global clientData
 * @description C'est l'objet contenant toutes les informations nécessaires au client à chaque itération du jeu
 * @type {{list: Array, pathLength: Array, players: {}}}
 */
var clientData = {
    //Cette liste permet de naviguer dans clientData
    list:[],
    //Longueur de la trainée
    pathLength:[],
    //On retrouve ensuite les 0 à 10 clients du plateau
    players :{
    }
};

/**
 * @global serverData
 * @description Données nécessaire au fonctionnement du serveur
 * @type {{playing: boolean, capacity: number, pas: number, pathLength: number, motoSize: {w: number, l: number},
 *     motos_available: string[], initial_position: string[], waitingRoom: Array, pseudoMap: {}, iteration}}
 */
var serverData = {
    playing         : false,
    capacity        : {min:1,max:1,current:0},
    pas             : 3,
    gameSize        : {w:500,l:500},
    pathLength      : 150,
    motoSize        : { w: 7, l: 23},//La largeur doit toujours être impair
    motos_available :["blue", "green", "greenblue", "greyblue", "orange", "pink", "purple", "red", "violet", "yellow"],//motos
                                                                                                                       // disponibles
                                                                                                                       // pour
    initial_position:[{x:10,y:10,direction:'e'},{x:490,y:490,direction:'w'},
                      {x:490,y:10,direction:'s'},{x:10,y:490,direction:'n'},
                      {x:0,y:0,direction:'e'},{x:0,y:0,direction:'e'},
                      {x:0,y:0,direction:'e'},{x:0,y:0,direction:'e'},],//tableau de position x/y pour chaque couleur
                                                                        // de moto
    waitingRoom     : [],//Joueur en attente quand le plateau est plein max:10 joueurs
    connections     : {},//On associe chaque pseudo à son sessionid
    startTime       : 5000,//Durée d'attente avant le lancement de la partie
    refreshTimoutId : -1,
    invincibleTime   : 4000//temps d'invincibilité quand un joueur rejoint une partie en cours
};

var chatData = [];

/****************************************
 *          Routage Client              *
 ****************************************/

/**
 * @mapping '/'
 * @description Lorsque le joueur se connecte à la racine du serveur on fournit le client
 */
app.get('/', function (req,res) {res.sendfile("client/index.html");});
/**
 * @mapping '/client/*'
 * @description On route tous les fichiers nécessaires au client
 * @param filePath Chemin du fichier voulu
 */
app.get('/client/*', function (req,res) {res.sendfile("client/"+req.params[0]);});

/****************************************
 *          Functions Server            *
 ****************************************/
/**
 * @name isAvailablePseudo
 * @description Indique si le pseudo est disponible
 * @param {String} pseudo Identifiant du client
 * @returns {boolean} if pseudo is available or not
 */
function isAvailablePseudo (pseudo) {
    if(!pseudo){
        return false;
    }
    for(var p in clientData.list){
        if(clientData.list[p]===pseudo){
            return false;
        }
    }
    return true;
 }

/**
 * @name createPlayer
 * @description On crée un objet corrspondant au player sur le serveur (clientData.players)
 * @param player L'objet contenant pseudo et moto
 * @param socketId The id of the player'socket
 */
function createPlayer(player,sId){
    serverData.connections[sId]=player.pseudo;
    clientData.list.push(player.pseudo);
    clientData.players[player.pseudo]= { pseudo:player.pseudo,position:{ x: -1, y: -1}, direction: 'x', moto: '', path:[], motoSize:{l:-1, w:-1},statut:"waiting",score:0};
    console.log("Create",player.pseudo,sId,clientData.list);
    console.log(serverData.waitingRoom);
}

/**
 * @name initPlayer
 * @description On indique la moto choisit par le joueur dans l'objet serveur correspondant
 * @param player L'objet contenant pseudo et moto
 * @returns {boolean} indiquant si la moto a pu être choisie
 */
function initPlayer(player){
    for(var i=0;i<serverData.motos_available.length;i++){
        if(serverData.motos_available[i]===player.moto){
            serverData.motos_available.splice(i,1);
            clientData.players[player.pseudo].moto = player.moto;
            clientData.players[player.pseudo].motoSize.l = serverData.motoSize.l;
            clientData.players[player.pseudo].motoSize.w = serverData.motoSize.w;
            return true;
        }
    }
    return false;
}

/**
 * @name removePlayer
 * @description Supprime le joueur de la clientData.list, de clientData.players et de la waiting room
 * @param pseudo Identifiant du joueur
 */
function removePlayer(pseudo,callback){
    if(pseudo) {
        var pos = clientData.list.indexOf(pseudo);
        if (pos > -1) {
            //Le client était dans clientData
            clientData.list.splice(pos, 1);
            var player = clientData.players[pseudo];
            if (player.statut != "waiting") {//Le client était en jeu
                app.io.broadcast('removePlayer', player);
                serverData.capacity.current--;
                app.io.broadcast("chat",{pseudo:"server",msg:pseudo+" leave the game."});
            }
            if (player.moto !== '') {//Le client avait une moto
                if (serverData.motos_available.indexOf(player.moto) == -1) {
                    serverData.motos_available.push(player.moto);
                    app.io.broadcast('motoAvailable', player.moto);
                }
            }
            delete clientData.players[pseudo];
            pos = serverData.waitingRoom.indexOf(pseudo);
            if(pos >-1 ){//Le client était dans la waitingRoom
                serverData.waitingRoom.splice(pos,1);
                app.io.broadcast("chat",{pseudo:"server",msg:pseudo+" leave the waiting room."});
            }
        }
    }
    if(callback)
        callback();
}

/**
 * @name initPlayerPosition
 * @description Initialise les positions des joueurs arrivant le commencement d'une partie
 * @param player {Object}
 * @param indice position in the waiting room
 * @param callback
 */

function initPlayerPosition(player,indice,callback){
    var pos = serverData.initial_position[indice];
    player.position.x = pos.x;
    player.position.y = pos.y;
    if(callback) callback();
}

/**
 * @name initPlayerInGame
 * @description Initialise et ajoute un joueur à une partie en cours ou sur le point de commencer
 * @param player
 * @param callback
 * @returns {boolean} true si le joueur est ajouté, false s'il n'y a plus de place
 */
function initPlayerInGame(player, callback){
    if(serverData.capacity.current>=serverData.capacity.max){
        console.log(clientData.players);
        console.log("Il n'y plus de position initiale disponible");
        return false;
    }
    var pos = serverData.initial_position[serverData.capacity.current];
    player.position.x = pos.x;
    player.position.y = pos.y;
    player.direction = pos.direction;
    player.motoSize.l = serverData.motoSize.l;
    player.motoSize.w = serverData.motoSize.w;
    if(serverData.playing) {
        player.statut = "invincible";
    } else {
        player.statut = "playing";
        player.path.push({x:pos.x,y:pos.y});
    }
    player.score = 0;
    serverData.capacity.current++;
    if(callback){
        callback();
    }
    return true;
}
/**
 * @name insertPlayerInGame
 * @description Lorsqu'une partie est en cours on utilise cette fonction pour ajouter un nouveau joueur  à la partie
 * @param player
 * @param callback
 */
function insertPlayerInGame(player,sId,callback){
    initPlayerInGame(player, function () {
        //On signale le nouveau joueur
        app.io.sockets.sockets[sId].broadcast.emit('newPlayer', normalizePlayer(player));
        //On initialise son plateau

        app.io.sockets.sockets[sId].emit('initialisation', normalize()).emit('start');
        //Il est invincible pendant serverData.invincibleTime
        setTimeout(function () {
            player.path.push({x: player.position.x, y: player.position.y});
            player.statut = "playing";
            if(callback)
                callback();
        }, serverData.invincibleTime);
    });
}
 /**
 * @name initGame
 * @description On prend les capacité max premier joueur de la file d'attente et on les insère dans la partie
 *              Lorqu'il n'y a plus de place dans la partie l'initialisation s'arrete
 * @returns {boolean} Quand l'initialisation est terminée.
 */
function initGame (callback) {
    for(var i=0;i<serverData.waitingRoom.length;i++){
        if(initPlayerInGame(clientData.players[serverData.waitingRoom[i]])){
            serverData.waitingRoom.splice(i,1);
            i--;
        } else {
            //On est arrivé à la capacité max
            break;
        }
    }
    app.io.broadcast('initialisation', normalize());
     if(callback)
        callback();
    return true;
}

/**
 * @name startGame
 * @description Après que la partie ait été initialisée on lance les itérations de jeu
 */
function startGame () {
    if(serverData.refreshTimoutId == -1) {
        serverData.playing = true;
        if (serverData.refreshIntervalId) {
            clearInterval(serverData.refreshIntervalId);
            serverData.refreshIntervalId = null;
            //console.log("Clear Interval");
            //app.io.broadcast("chat",{pseudo:"server",msg:"Clear Interval"});
        }
        app.io.broadcast('launch', {time: Math.round(serverData.startTime / 1000), msg: "Go !"});
        serverData.date = new Date();
        serverData.refreshTimoutId = setTimeout(function () {
            serverData.refreshTimoutId = -1;
            serverData.date = new Date();
            app.io.broadcast('start');
            //console.log("Set Interval");
            serverData.refreshIntervalId = setInterval(function () {
                iteration(function () {
                    var normalizeData = normalize();
                    app.io.broadcast('iteration', normalizeData);
                    collision();
                });
            }, 25);
        }, serverData.startTime);
    }
}

/**
 * @name stopGame
 * @description Arrete la partie, le signale à tout le monde et replace les joueurs au début de la file d'attente
 * @param callback
 */
function stopGame (callback){
    console.log("Partie Interrompue");
    if(serverData.refreshIntervalId){
        clearInterval(serverData.refreshIntervalId);
        serverData.refreshIntervalId = null;
        console.log("Clear Interval");
        //app.io.broadcast("chat",{pseudo:"server",msg:"Clear Interval"});
    }
    //On signale à tout le monde l'intérruption de la partie
    app.io.broadcast("end");
    app.io.broadcast("chat",{pseudo:"server",msg:"Game finished !"});
    //Ici on rajoute les joueur != waiting à la waitingroom afin qu'ils soient les premiers ajouté à la création de
    // partie
    for(var p in clientData.players){
        var player = clientData.players[p];
        if(player.statut != "waiting"){
            serverData.waitingRoom.unshift(p);
            player.statut = "waiting";
            player.path = [];
            serverData.capacity.current--;
        }
    }
    serverData.playing = false;
    if(callback)
        callback();
}

/**
 * @name getPathLength
 * @description Renvoie la longeur du chemin en entrée selon l'echelle de la grille de jeu
 * @param path
 * @returns {number} longueur du chemin
 */
function getPathLength(path){
    var res = 0;
    for(var i=1;i<path.length;i++){
        res+= Math.abs(path[i].x-path[i-1].x)+Math.abs(path[i].y-path[i-1].y);
    }
    return res;
}
/**
 * @name adjustPath
 * @description Réajuste un chemin pour que sa taille corresponde à la limite
 * @param dif
 * @return {boolean} true when done
 */
function adjustPath(path,dif){
    var difX = path[1].x-path[0].x;
    var difY = path[1].y-path[0].y;
    var newDif = dif - Math.max(Math.abs(difX),Math.abs(difY));
    if(newDif>0){//Si le premier segment est trop court on le supprime et on réajuste le segment suivant
        dif = path.shift();
        return adjustPath(path,Math.abs(newDif));
    }
    //On réajuste suivant l'axe x
    if(difX!=0)
        path[0].x+=dif*difX/Math.abs(difX);//Si difX<0 (West) on multiplie par -1
    else//ou suivant l'axe y
        path[0].y+=dif*difY/Math.abs(difY);//Si difY<0 (Nord) on multiplie par -1
    return true;
}
/**
 * @name pathHandler
 * @description Met à jour la trace d'un joueur, si elle est trop longue il la réduit
 * @param player
 * @returns {boolean}
 */
function pathHandler(player){
    if(player.statut=="playing") {
        var newPoint = {x: player.position.x, y: player.position.y};
        if(player.path.length>1){
            var oldPoint = player.path[player.path.length-2];
            //Si on reste sur le meme axe on supprime le dernier point du chemin avant d'ajouter le nouveau
            if(newPoint.x-oldPoint.x==0 || newPoint.y-oldPoint.y==0){
                oldPoint=player.path.pop();
            }
        }
        player.path.push(newPoint);
    }
    //Si la taille du chemin est limité : serverData>0, on ajuste la taille du chemin
    var dif = getPathLength(player.path)- serverData.pathLength;
    if( dif>0 && serverData.pathLength>0){
        return adjustPath(player.path,dif);
    }
    return false;
}
/**
 * @name iteration
 * @description La fonction itération incrémente toutes les clientData.players[player].position déplaçant ainsi chaque
 * moto. Elle ajoute aussi le premier point de à chaque trace clientData.players[player].path
 * @param callback
 */
function iteration(callback){
    var newDate = new Date();
    var time = newDate-serverData.date;
    serverData.date = newDate;
    for(var p in clientData.players){
        //On transforme ce switch en fonction setMove(player,pas)
        var player = clientData.players[p];
        if(player.statut=="playing" || player.statut=="invincible") {
            player.score+= time;
            switch (player.direction) {
                case "n":
                    player.position.y += -serverData.pas;
                    break;
                case "e":
                    player.position.x += serverData.pas;
                    break;
                case "s":
                    player.position.y += serverData.pas;
                    break;
                case "w":
                    player.position.x += -serverData.pas;
                    break;
            }
        }
        trash = pathHandler(player);
    }
    if(callback)
        callback();
    return true;
}

/**
 * @name normalizePlayer
 * @description On normalize les données d'un client
 * @return client normalisé
 */
//var iter = 0;
function normalizePlayer(p){
    var player = JSON.parse(JSON.stringify(p));
    player.position.x/=serverData.gameSize.w;
    player.position.y/=serverData.gameSize.l;
    player.motoSize.l/=serverData.gameSize.l;
    player.motoSize.w/=serverData.gameSize.w;
    for(var path in player.path){
        player.path[path].x/=serverData.gameSize.w;
        player.path[path].y/=serverData.gameSize.l;
    }
    return player;
}
/**
 * @name normalize
 * @description On normalize les données clientData avant de les envoyer au client
 * @return A jeu de données normalisé construit à partir de clientData
 */
function normalize () {
    var normalizeData = JSON.parse(JSON.stringify(clientData));
    for(var p in normalizeData.players){
        normalizeData.players[p] = normalizePlayer(normalizeData.players[p]);
    }
    return normalizeData;
}
/**
 * @name collision
 * @description On détecte toutes les collisions possible si le joueur est en jeu 'il est invincible il boucle sur
 *     plateau lorsqu'il touche une bordure
 */
function collision () {
    var stopTheGame = true;
    var cptAlive = 0;
    var grid = [];
    for (var i = 0; i < serverData.gameSize.w; i++) {
        grid[i]=[];
    }
    for(var i in clientData.players) {
        var player = clientData.players[i];
        if (player.statut != "waiting") {
            var pos = player.position;
            //On détecte les collisions avec les bordures
            if (player.statut == "playing") {
                switch (player.direction) {
                    case 'n':
                        if (pos.y - serverData.motoSize.l < 0) player.statut = "dead";
                        break;
                    case 'e':
                        if (pos.x + serverData.motoSize.l > serverData.gameSize.w) player.statut = "dead";
                        break;
                    case 's':
                        if (pos.y + serverData.motoSize.l > serverData.gameSize.l) player.statut = "dead";
                        break;
                    case 'w':
                        if (pos.x - serverData.motoSize.l < 0) player.statut = "dead";
                        break;
                }
            }

            //Dessine la trace dans la grille
            if (player.statut == "playing" || player.statut == "dead") {
                if (player.path.length > 0) {
                    var point = player.path[0];
                    if (point.x < 0 || point.y < 0) break;
                    var oldPoint, xmax, ymax;
                    //var gridVal = grid[point.x][point.y];
                    //if (typeof gridVal == "number") {
                    //    clientData.players[clientData.list[gridVal]].statut = "dead";
                    //}
                    //grid[point.x][point.y] = "t";
                    for (var j = 1; j < player.path.length; j++) {
                        oldPoint = player.path[j - 1];
                        point = player.path[j];
                        xmax = point.x - oldPoint.x;
                        ymax = point.y - oldPoint.y;
                        if (xmax == 0) {
                            var y;
                            if (ymax > 0) {
                                y = oldPoint.y;
                                ymax = point.y;
                            } else {
                                y = point.y + 1;
                                ymax = oldPoint.y + 1;
                            }
                            for (; y < ymax; y++) {
                                gridVal = grid[point.x][y];
                                if (typeof gridVal == "number") {
                                    clientData.players[clientData.list[gridVal]].statut = "dead";
                                }
                                grid[point.x][y] = "t";
                            }
                        } else {
                            var x;
                            if (xmax > 0) {
                                x = oldPoint.x;
                                xmax = point.x;
                            } else {
                                x = point.x + 1;
                                xmax = oldPoint.x + 1;
                            }
                            for (; x < xmax; x++) {
                                gridVal = grid[x][point.y];
                                if (typeof gridVal == "number") {
                                    clientData.players[clientData.list[gridVal]].statut = "dead";
                                }
                                grid[x][point.y] = "t";
                            }
                        }
                    }
                }
            }

            //On dessine la moto dans la grille
            if (player.statut == "playing") {
                var winit = (serverData.motoSize.w - 1) / 2, linit = serverData.motoSize.l - 1;
                var x = player.position.x, y = player.position.y, xmax = serverData.motoSize.w, ymax = serverData.motoSize.l;
                switch (player.direction) {
                    case 'n':
                        x -= winit;
                        y -= linit;
                        xmax += x;
                        ymax += y;
                        break;
                    case 'e':
                        y -= winit;
                        ymax = y + xmax;
                        xmax = x + serverData.motoSize.l;
                        break;
                    case 's':
                        x -= winit;
                        xmax += x;
                        ymax += y;
                        break;
                    case 'w':
                        x -= linit;
                        y -= winit;
                        ymax = y + xmax;
                        xmax = x + serverData.motoSize.l;
                        break;
                }
                //console.log(x,xmax,y,ymax);
                for (; x < xmax; x++) {
                    for (var j = y; j < ymax; j++) {
                        var gridVal = grid[x][j];
                        if (typeof gridVal == "number") {
                            clientData.players[clientData.list[gridVal]].statut = "dead";
                            player.statut = "dead";
                        } else if (gridVal == "t") {
                            player.statut = "dead";
                        } else {
                            grid[x][j] = clientData.list.indexOf(i);
                        }
                    }
                }
            }
            //if(iter++==200){
            //    app.io.broadcast("drawGrid",grid);
            //}
            //On gère qu'un statut invincible boucle sur les bordures
            if (player.statut == "invincible") {
                switch (player.direction) {
                    case 'n':
                        if (pos.y < 0) {
                            player.position.y = serverData.gameSize.l + serverData.motoSize.l;
                        }
                        break;
                    case 'e':
                        if (pos.x > serverData.gameSize.w) {
                            player.position.x = -serverData.motoSize.l;
                        }
                        break;
                    case 's':
                        if (pos.y > serverData.gameSize.l) {
                            player.position.y = -serverData.motoSize.l;
                        }
                        break;
                    case 'w':
                        if (pos.x < 0) {
                            player.position.x = serverData.gameSize.w + serverData.motoSize.l;
                        }
                        break;
                }
            }

            if (clientData.players[i].statut != 'dead') {
                stopTheGame = false;
            }
        }
    }

    if(stopTheGame) stopGame(function () {
        //Si il y a suffisament de monde dans la waiting room on relance automatiquement la partie au bout de 10 sec
        {
            app.io.broadcast('chat', {pseudo: "server", msg: "The game will restart in 15 seconds"});
            serverData.refreshTimoutId = setTimeout(function () {
                if(serverData.waitingRoom.length >= serverData.capacity.min) {
                    initGame(function () {
                        app.io.broadcast('chat', {pseudo: "server", msg: "Ready ! The game will start !"});
                        console.log("## Start Game : Relance auto");
                        serverData.refreshTimoutId = -1;
                        startGame();
                    });
                }
            },15000);
        }
    });
}
/****************************************
 *       DIALOGUE Client/Server         *
 ****************************************/
////////////    LOGIN   /////////////////
/**
 * @route newclient
 * @description Lors de la première connexion d'un client on vérifie si son ancien pseudo (si existant) est toujours
 * disponible si oui on l'enregistre et on crée un profil joueur
 * @request {Object} player > {String} pseudo Identifiant du client
 * @response {Object}
 *      > {boolean} res
 *      > {Array} availableMotos Le tableau des motos disponible
 *      > {boolean} availablePseudo Si le pseudo est disponible ou non
 * @response {boolean} res
 */
app.io.route('newclient', function (req) {
	var available = isAvailablePseudo(req.data.pseudo);
    if(available){
        createPlayer(req.data,req.socket.id);
    }
    req.io.respond({
        res:true,
        availableMotos:serverData.motos_available,
        availablePseudo:available
    });
});
/**
 * @route rmclient
 * @description Quand un client quitte l'application on supprime l'intégralité des ses données présentent sur le serveur
 */
app.io.route('rmclient', function (req) {
    removePlayer(serverData.connections[req.socket.id], function () {
        if( serverData.playing ){ // Partie en cours
            if( serverData.capacity.current < serverData.capacity.max //Place disponible
            && serverData.waitingRoom.length>0) { //Joueur en attente
                var pseudo = serverData.waitingRoom.shift();
                var player = clientData.players[pseudo];
                //Si jamais le joueur et à la fois en jeu est dans la waiting room
                //while(player.statut!="waiting" && serverData.waitingRoom.length>0){
                //    player = clientData.players[serverData.waitingRoom.shift()];
                //}
                for (var sId in serverData.connections) {
                    if(serverData.connections[sId]==pseudo){
                        insertPlayerInGame(player,sId);
                        break;
                    }
                }
            }else if( serverData.current == 0){//Personne en attente et plus personne dans la partie
                stopGame();
            }
        }
    });
});
/**
 * @route availablePseudo
 * @description Lorsqu'un client demande si un pseudo est disponible, si oui on lui réserve en l'ajoutant à
 *     clientData.list
 * @request {Object} player > {String} pseudo Identifiant du client
 * @response {Object} > {boolean} res Si le pseudo est disponible
 */
app.io.route('availablePseudo', function (req) {
    var available = isAvailablePseudo(req.data.pseudo);
    if(available){
        createPlayer(req.data,req.socket.id);
    }
    req.io.respond({res:available});
});// Lorsqu'un client demande si un pseudo est dispo, si oui on lui réserve

/**
 * @route login
 * @description Lorque le client a choisi un pseudo et une moto disponibles on finalise son profil sur le serveur
 * @request {Object} player Profil du client
 *      > {String} pseudo Identifiant du client
 *      > {String} moto Moto sélectionnée par le client
 * @response {Object}
 *      > {boolean} res Si l'initialisation est réussie ou non
 *      > {String} error Message d'une erreure éventuelle
 */
app.io.route('login', function (req) {
    if(serverData.connections[req.socket.id] == req.data.pseudo) {
        var resp = {res: initPlayer(req.data)};
        if (!resp.res) {
            resp.error = "La moto" + req.data.moto + " n'est plus disponible";
        }
        else app.io.broadcast('motoUnavailable', req.data);
        req.io.respond(resp);

        
    }else req.io.respond({error:"Nice try ;-) !"});
});

/**
 * @route ready
 * @description
 */
app.io.route('ready', function (req) {
    if(serverData.connections[req.socket.id] == req.data.pseudo) {
        if(!serverData.playing) {
            if (serverData.waitingRoom.indexOf(req.data.pseudo) == -1) {
                serverData.waitingRoom.push(req.data.pseudo);
                req.io.broadcast('chat', {pseudo:"server",msg:req.data.pseudo+" joined the wainting room !"});
            }
            if(serverData.waitingRoom.length >= serverData.capacity.min) {
                if(serverData.waitingRoom.length > serverData.capacity.max){
                    req.io.emit('chat', {pseudo: "server", msg: "The game is full ! Please watch and wait"});
                } else if(serverData.refreshTimoutId == -1) {
                    initGame(function () {
                        app.io.broadcast('chat', {pseudo: "server", msg: "Ready ! The game will start !"});
                        console.log("## Start Game : Capacité min atteinte");
                        startGame();
                    });
                }else {
                    var time = Date.now()-serverData.date;
                    req.io.emit('chat', {pseudo: "server", msg: "Game will start in "+ Math.round(time/1000) + " seconds"});
                }
            } else {
                var player = clientData.players[req.data.pseudo];
                initPlayerPosition(player, serverData.waitingRoom.length-1, function () {
                    app.io.broadcast("chat",{pseudo:"server",msg:"New player"});
                    app.io.broadcast('newPlayer',normalizePlayer(player));
                    console.log(normalizePlayer(player));
                    app.io.broadcast('chat', {pseudo: "server", msg: "Waiting for another player..."});
                })
            }
        //Il y a encore de la place dans la partie : on l'ajoute
        } else if(serverData.capacity.current < serverData.capacity.max){
            if(serverData.capacity.current+1==serverData.capacity.min){
                console.log("Restart game");
                //Si on atteint un nombre suffisant de joueur on restart la partie
                if (serverData.waitingRoom.indexOf(req.data.pseudo) == -1) {
                    serverData.waitingRoom.push(req.data.pseudo);
                    req.io.broadcast('chat', {pseudo:"server",msg:req.data.pseudo+" joined the game !"});
                }
                stopGame(function () {
                    initGame(function () {
                        app.io.broadcast('chat', {pseudo: "server", msg: "Ready ! The game will start !"});
                        console.log("## Start Game : Restart après leave");
                        startGame();
                    });
                });
            } else {
                //On insère le joueur dans la partie
                var player = clientData.players[req.data.pseudo];
                req.io.broadcast('chat', {pseudo:"server",msg:req.data.pseudo+" joined the game !"});
                insertPlayerInGame(player,req.socket.id);
            }
        } else {//Il n'y a plus de place dans la partie on met le joueur en attente
            if (serverData.waitingRoom.indexOf(req.data.pseudo) == -1) {
                serverData.waitingRoom.push(req.data.pseudo);
                req.io.emit('chat', {pseudo: "server", msg: "The game is full ! Please watch and wait"});
                req.io.emit('initialisation', normalize());
                req.io.broadcast('chat', {pseudo:"server",msg:req.data.pseudo+" joined the wainting room !"});
            }
        }
    }
})
////////////    INGAME   /////////////////
/**
 * @route changeDir
 * @description Cette route écoute chaque changement de direction des clients joueur. Elle modifie ainsi
 * @request {Object}
 *      > {String} pseudo Identifiant du client
 *      > {char} direction Nouvelle direction du client
 */
app.io.route('changeDir', function(req){
    if(serverData.connections[req.socket.id] == req.data.pseudo) {
        var loginJoueur = req.data.pseudo;
        var oldDir = clientData.players[loginJoueur].direction;
        var player = clientData.players[loginJoueur];
        if(player.statut=="invincible" || player.statut=="playing") {
            var directionJoueur = req.data.direction;
            var pas = serverData.motoSize.l - serverData.motoSize.w;
            if (oldDir == 'w' || oldDir == 'n') pas = -pas;
            switch (directionJoueur) {
                case "n":
                    if (oldDir !== 's' && oldDir !== 'n') {
                        player.position.x += pas;
                        trash = pathHandler(player);
                        player.direction = directionJoueur;
                    }
                    break;
                case "e":
                    if (oldDir !== 'w' && oldDir !== 'e') {
                        player.position.y += pas;
                        trash = pathHandler(player)
                        player.direction = directionJoueur;
                    }
                    break;
                case "s":
                    if (oldDir !== 'n' && oldDir !== 's') {
                        player.position.x += pas;
                        trash = pathHandler(player);
                        player.direction = directionJoueur;
                    }
                    break;
                case "w":
                    if (oldDir !== 'e' && oldDir !== 'w') {
                        player.position.y += pas;
                        trash = pathHandler(player);
                        player.direction = directionJoueur;
                    }
                    break;
            }
        }
    }
});

app.listen(3001, function () {
    console.log("Listening localhost:3001");
});

/**
 * @route chat
 * @description gestion du chat
 * @request {Object}
 *      > {String} pseudo Identifiant du client
 *      > {String} msg Message envoyé
 *      > {Date} date Date d'envoie du message
 *      > {String} color Couleur de la moto du joueur
 */
app.io.route('chat', function (req) {
    if(serverData.connections[req.socket.id] == req.data.pseudo) {
        chatData.push(req.data);
        if(chatData.length>5){
            chatData.shift();
        }
        req.io.broadcast('chat',req.data);
        req.io.respond({resp:true});
    }
});

/**
 * @route console
 * @description Route permettant de debugguer depuis un client mobile (en affichant les données sur le server)
 * @request {Object} data que la client veut afficher
 */
app.io.route('console', function(req){
    console.log(req.data);
});