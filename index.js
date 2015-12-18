var express = require('express.io');
var app = express();
app.http().io();
var refreshIntervalId;

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
    capacity        : {min:2,max:3,current:0},
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
    pseudoMap       : {},//On associe chaque pseudo à son sessionid
    invincibleTime   : 4000//temps d'invincibilité quand un joueur rejoint une partie en cours
}

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
function createPlayer(player,socketId){
    serverData.pseudoMap[socketId]=player.pseudo;
    clientData.list.push(player.pseudo);
    clientData.players[player.pseudo]= { position:{ x: -1, y: -1}, direction: 'x', moto: '', path:[], motoSize:{l:-1, w:-1},statut:"waiting"};
    console.log("Create",player.pseudo,socketId,clientData.list);
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
            if(serverData.playing){
                var pos = serverData.initial_position[serverData.capacity.current];
                clientData.players[player.pseudo].position.x = pos.x;
                clientData.players[player.pseudo].position.y = pos.y;
                clientData.players[player.pseudo].direction = pos.direction;
                clientData.players[player.pseudo].path.push({x:pos.x,y:pos.y});
            }
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
function removePlayer(pseudo){
    //On empeche un client malhonnete de
    if(pseudo){
        var moto;
        for(var p in clientData.list){
            if(clientData.list[p]==pseudo){
                clientData.list.splice(p,1);
                moto = clientData.players[pseudo].moto;
                if(clientData.players[pseudo].statut=="invincible" || clientData.players[pseudo].statut=="playing" || clientData.players[pseudo].statut=="dead") {
                    console.log("suppression d'un joueur de current");
                    serverData.capacity.current--;
                    console.log("CURRENT "+ serverData.capacity.current);
                }
                delete clientData.players[pseudo];
                if(moto){
                    var rmMoto = true;
                    for(var i=0;i<serverData.motos_available;i++){
                        if(serverData.motos_available[i]===moto) {
                            rmMoto = false;break;
                        }
                    }
                    if(rmMoto) {
                        serverData.motos_available.push(moto);
                        app.io.broadcast("motoAvailable",moto);
                    }
                }
                console.log("Remove",pseudo,clientData.list);
            }
        }
        for(var p in serverData.waitingRoom){
            if(serverData.waitingRoom[p]==pseudo){
                serverData.waitingRoom.splice(p,1);
            }
        }
    }
}
/**
 * @name normalize
 * @description On normalize les données clientData avant de les envoyer au client
 */
 function normalize () {
    var normalizeData = JSON.parse(JSON.stringify(clientData));
    for(var p in normalizeData.players){
        normalizeData.players[p].position.x/=serverData.gameSize.w;
        normalizeData.players[p].position.y/=serverData.gameSize.l;
        normalizeData.players[p].motoSize.l/=serverData.gameSize.l;
        normalizeData.players[p].motoSize.w/=serverData.gameSize.w;
        for(var path in normalizeData.players[p].path){
            normalizeData.players[p].path[path].x/=serverData.gameSize.w;
            normalizeData.players[p].path[path].y/=serverData.gameSize.l;
        }
    }
    return normalizeData;
 }

/**
 * @name collision
 * @description On détecte toutes les collisions possible si le joueur est en jeu 'il est invincible il boucle sur plateau lorsqu'il touche une bordure
 */
var iter = 0;
function collision () {
    iter++;
    var grid = [];
    for (var i = 0; i < serverData.gameSize.w; i++) {
        grid[i]=[];
    }
    for(var i in clientData.players){
        var player = clientData.players[i];
        var pos = player.position;
        //On détecte les collisions avec les bordures
        if(player.statut=="playing") {
            switch (player.direction) {
                case 'n': if (pos.y - serverData.motoSize.l < 0) player.statut = "dead"; break;
                case 'e': if (pos.x + serverData.motoSize.l > serverData.gameSize.w) player.statut = "dead"; break;
                case 's': if (pos.y + serverData.motoSize.l > serverData.gameSize.l) player.statut = "dead"; break;
                case 'w': if (pos.x - serverData.motoSize.l < 0) player.statut = "dead"; break;
            }
        }

        //Dessine la trace dans la grille
        if(player.statut=="playing" || player.statut=="dead"){
            if(player.path.length > 0) {
                var point = player.path[0];
                var oldPoint, xmax,ymax;
                var x,y;
                var gridVal = grid[point.x][point.y];
                if (typeof gridVal == "number") {
                    clientData.players[clientData.list[gridVal]].statut = "dead";
                }
                grid[point.x][point.y] = "t";
                for (var j=1;j<player.path.length-1;j++) {
                    oldPoint = player.path[j-1];
                    point = player.path[j];
                    xmax= point.x-oldPoint.x;
                    ymax= point.y-oldPoint.y;
                    x = xmax>0?oldPoint.x+1:point.x;
                    y = ymax>0?oldPoint.y+1:point.y;
                    if(xmax==0){
                        ymax = y+Math.abs(ymax);
                        for (;y< ymax; y++) {
                            gridVal = grid[point.x][y];
                            if(typeof gridVal == "number"){
                                clientData.players[clientData.list[gridVal]].statut = "dead";
                            }
                            grid[point.x][y]="t";
                        }
                    }else{
                        xmax = x+Math.abs(xmax);
                        for (;x<xmax; x++) {
                            gridVal = grid[x][point.y];
                            if(typeof gridVal == "number"){
                                clientData.players[clientData.list[gridVal]].statut = "dead";
                            }
                            grid[x][point.y]="t";
                        }
                    }
                }
            }
        }

        //On dessine la moto dans la grille
        if(player.statut=="playing") {
            var winit = (serverData.motoSize.w - 1) / 2, linit = serverData.motoSize.l-1;
            var x=player.position.x,y= player.position.y,xmax= serverData.motoSize.w,ymax=serverData.motoSize.l;
            switch (player.direction) {
                case 'n': x -= winit; y -= linit; xmax+=x;ymax+=y; break;
                case 'e': y -= winit; ymax = y+xmax; xmax = x+serverData.motoSize.l; break;
                case 's': x -= winit; xmax+=x;ymax+=y;break;
                case 'w': x -= linit; y -= winit; ymax = y+xmax; xmax = x+serverData.motoSize.l; break;
            }
            //console.log(x,xmax,y,ymax);
            for(;x<xmax;x++){
                for (var j=y; j<ymax; j++) {
                    var gridVal = grid[x][j];
                    if(typeof gridVal == "number"){
                        clientData.players[clientData.list[gridVal]].statut = "dead";
                        player.statut = "dead";
                    }else if(gridVal == "t"){
                        player.statut = "dead";
                    } else {
                        grid[x][j] = clientData.list.indexOf(i);
                    }
                }
            }
        }

        //if(iter==100) {
        //    app.io.broadcast("drawGrid", grid);
        //    stopGame();
        //}
        //On gère qu'un statut invincible boucle sur les bordures
        if (player.statut=="invincible"){
            switch (player.direction) {
                case 'n':
                    if (pos.y < 0) {
                        player.position.y=serverData.gameSize.l+serverData.motoSize.l;
                    } break;
                case 'e':
                    if (pos.x > serverData.gameSize.w) {
                        player.position.x=-serverData.motoSize.l;
                    } break;
                case 's':
                    if (pos.y > serverData.gameSize.l) {
                        player.position.y=-serverData.motoSize.l;
                    } break;
                case 'w':
                    if (pos.x < 0) {
                        player.position.x=serverData.gameSize.w+serverData.motoSize.l;
                    } break;
            }
            if(player.path.length>serverData.pathLength){
                player.path.shift();
            }
        }
    }
    //console.log(clientData.players);
}

 /**
 * @name initGame
 * @description On initialise les positions et directions de chaque joueur
 */
function initGame () {
    var keys = Object.keys(clientData.players);
    for(var i=0;i<keys.length;i++){
        var pos = serverData.initial_position[i];
        var player = clientData.players[keys[i]];
        player.position.x = pos.x;
        player.position.y = pos.y;
        player.direction = pos.direction;
        player.motoSize.l = serverData.motoSize.l;
        player.motoSize.w = serverData.motoSize.w;
        clientData.players[keys[i]].path.length = 0;
        player.path.push({x:pos.x,y:pos.y});
        player.statut = "playing";
    }
    app.io.broadcast('initialisation', normalize());
    return true;
}

/**
 * @name startGame
 * @description Après que la partie ait été initialisée on lance les itérations de jeu
 */

function startGame () {
    serverData.playing=true;
    clearInterval(refreshIntervalId);
    setTimeout(function(){
        app.io.broadcast('start');
        refreshIntervalId = setInterval(function(){
            iteration(function () {
                var normalizeData = normalize();
                app.io.broadcast('iteration', normalizeData);
                collision();
            });
        },25);
    },0);//#DEBUG
}

function stopGame (){
    console.log("stoooop");
    serverData.playing = false;
    clearInterval(refreshIntervalId);
}

/**
 * @name iteration
 * @description La fonction itération incrémente toutes les clientData.players[player].position déplaçant ainsi chaque
 * moto. Elle ajoute aussi le premier point de à chaque trace clientData.players[player].path
 * @param callback
 */
function iteration(callback){
    for(var p in clientData.players){
        //On transforme ce switch en fonction setMove(player,pas)
        var player = clientData.players[p];
        var pasX = 0, pasY = 0;
        if(player.statut=="playing" || player.statut=="invincible") {
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
        if(player.statut=="playing"){
            player.path.push({x:player.position.x,y:player.position.y});
        }
        if(player.path.length>serverData.pathLength){
            player.path.shift();
        }
        //
    }
    if(callback)
        callback();
    return true;
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
    removePlayer(serverData.pseudoMap[req.socket.id]);
    if(serverData.playing) {
        if (serverData.capacity.current < serverData.capacity.min) {
            for  (var p in clientData.players) {
                console.log(clientData.players[p].statut);
                if (clientData.players[p].statut !== "waiting" && serverData.waitingRoom.indexOf(p)==-1) {
                    serverData.waitingRoom.push(p);
                }
            }
            serverData.capacity.current = 0;
            stopGame();
        }
    }
    app.io.broadcast('initialisation', normalize());
    app.io.broadcast('newPlace', normalize());
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
    if(serverData.pseudoMap[req.socket.id]===req.data.pseudo) {
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
    if(serverData.pseudoMap[req.socket.id]===req.data.pseudo) {
        serverData.waitingRoom.push(req.data.pseudo);
        if(!serverData.playing) {
            if(initGame()){
                if(serverData.waitingRoom.length>=serverData.capacity.min){//On a au moins capacity.min joueurs on peut commencer une partie
                    serverData.capacity.current = serverData.waitingRoom.length;
                    console.log("current après initgame "+ serverData.capacity.current);
                    serverData.waitingRoom.length=0;
                    startGame();
                } else {
                    if(serverData.waitingRoom.indexOf(req.data.pseudo) == -1){
                        serverData.waitingRoom.push(req.data.pseudo);
                    }
                    console.log("non playing waiting "+ serverData.waitingRoom);
                }
            }
        } else if(serverData.capacity.current < serverData.capacity.max){

            for(var p in serverData.waitingRoom){
                if(serverData.waitingRoom[p]==req.data.pseudo){
                    serverData.waitingRoom.splice(p,1);
                }
            }
            serverData.capacity.current++;
            clientData.players[req.data.pseudo].statut = "invincible";
            app.io.broadcast('initialisation', normalize());
            app.io.broadcast('start');
            setTimeout(function () {
                clientData.players[req.data.pseudo].path = [];
                clientData.players[req.data.pseudo].path.push({x:clientData.players[req.data.pseudo].position.x,y:clientData.players[req.data.pseudo].position.y});
                clientData.players[req.data.pseudo].statut = "playing";
            },serverData.invincibleTime);
        } else {
            if(serverData.waitingRoom.indexOf(req.data.pseudo) == -1){
                serverData.waitingRoom.push(req.data.pseudo);
            }
            app.io.broadcast('initialisation', normalize());
            console.log("waiting + playing  : "+ serverData.waitingRoom);
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
    //On vérifie que le client est le bon et qu'il n'a pas changé son pseudo via la console
    //console.log(req.data);
    //console.log(serverData.pseudoMap,req.socket.id);
    if(serverData.pseudoMap[req.socket.id]===req.data.pseudo) {
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
                        if (player.statut == "playing")
                            player.path.push({x: player.position.x, y: player.position.y});
                        player.direction = directionJoueur;
                    }
                    break;
                case "e":
                    if (oldDir !== 'w' && oldDir !== 'e') {
                        player.position.y += pas;
                        if (player.statut == "playing")
                            player.path.push({x: player.position.x, y: player.position.y});
                        player.direction = directionJoueur;
                    }
                    break;
                case "s":
                    if (oldDir !== 'n' && oldDir !== 's') {
                        player.position.x += pas;
                        if (player.statut == "playing")
                            player.path.push({x: player.position.x, y: player.position.y});
                        player.direction = directionJoueur;
                    }
                    break;
                case "w":
                    if (oldDir !== 'e' && oldDir !== 'w') {
                        player.position.y += pas;
                        if (player.statut == "playing")
                            player.path.push({x: player.position.x, y: player.position.y});
                        player.direction = directionJoueur;
                    }
                    break;
            }
        }
        // req contient l'id du joueur et la nouvelle direction
        //req.io.broadcast("changeDir", "Action du joueur " + req.data.pseudo + " : " + req.data.direction); // envoie
        // aux autres client des infos du joueur
    }
});

app.listen(3001, function () {
    console.log("Listening localhost:3001");
});


/**
 *
 */
app.io.route('console', function(req){
    console.log(req.data);
});