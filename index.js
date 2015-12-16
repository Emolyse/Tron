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
 * @type {{playing: boolean, capacity: number, pas: number, pathLength: number, motoSize: {w: number, l: number}, motos_available: string[], initial_position: string[], waitingRoom: Array, pseudoMap: {}, iteration}}
 */
var serverData = {
    playing         : false,
    capacity        : 10,
    pas             : 12,
    gameSize        : {w:2000,l:2000},
    grid            : [],
    pathLength      : 150,
    motoSize        : { w: 30, l: 90},
    motos_available :["blue", "green", "greenblue", "greyblue", "orange", "pink", "purple", "red", "violet", "yellow"],//motos disponibles pour
    initial_position:[{x:0,y:20,direction:'e'},{x:2000,y:1992,direction:'w'},
                      {x:1992,y:0,direction:'s'},{x:8,y:2000,direction:'n'},
                      {x:0,y:0,direction:'e'},{x:0,y:0,direction:'e'},
                      {x:0,y:0,direction:'e'},{x:0,y:0,direction:'e'},],//tableau de position x/y pour chaque couleur de moto
    waitingRoom     : [],//Joueur en attente quand le plateau est plein max:10 joueurs
    pseudoMap       : {}//On associe chaque pseudo à son sessionid
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
    clientData.players[player.pseudo]= { position:{ x: -1, y: -1}, direction: 'X', moto: '', path:[], motoSize:{l:-1, w:-1}};
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
                delete clientData.players[pseudo];
                if(moto){
                    for(var i=0;i<serverData.motos_available;i++){
                        if(serverData.motos_available[i]===moto)
                            break;
                    }
                    serverData.motos_available.push(moto);
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
 * @description Ondétecte les collisions
 */
function collision () {
    var g = serverData.grid;
    for(var i in clientData.players){
        var player = clientData.players[i];
        var pos = player.position;
        if(pos.x<0 || pos.y<0 || pos.x>serverData.gameSize.w || pos.y>serverData.gameSize.l){
            player.direction = "x";
        }
        for(var j in clientData.players[i].path){
            var point = clientData.players[i].path[j];
            
        }

    };
}

 /**
 * @name initGame
 * @description On initialise les positions et directions de chaque joueur
 */
function initGame () {
    serverData.playing = true;
    var keys = Object.keys(clientData.players);
    for(var i=0;i<keys.length;i++){
        var pos = serverData.initial_position[i];
        clientData.players[keys[i]].position.x = pos.x;
        clientData.players[keys[i]].position.y = pos.y;
        clientData.players[keys[i]].direction = pos.direction;
        clientData.players[keys[i]].motoSize.l = serverData.motoSize.l;
        clientData.players[keys[i]].motoSize.w = serverData.motoSize.w;
        clientData.players[keys[i]].path.push({x:pos.x,y:pos.y});
    }
    app.io.broadcast('initialisation', normalize());
    startGame();
}

/**
 * @name startGame
 * @description Après que la partie ait été initialisée on lance les itérations de jeu
 */

function startGame () {
    app.io.broadcast('start');
    setInterval(function(){
        iteration(function(){
            var normalizeData = normalize();
            app.io.broadcast('iteration', normalizeData);
        });
    },25);
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
        switch(player.direction){
            case "n":
                player.position.y += -serverData.pas;
                player.path.push({x:player.path[player.path.length-1].x,y:player.path[player.path.length-1].y-serverData.pas});
                break;
            case "e":
                player.position.x += serverData.pas;
                player.path.push({x:player.path[player.path.length-1].x+serverData.pas,y:player.path[player.path.length-1].y});
                break;
            case "s":
                player.position.y += serverData.pas;
                player.path.push({x:player.path[player.path.length-1].x,y:player.path[player.path.length-1].y+serverData.pas});
                break;
            case "w":
                player.position.x += -serverData.pas;
                player.path.push({x:player.path[player.path.length-1].x-serverData.pas,y:player.path[player.path.length-1].y});
                break;
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
});
/**
 * @route availablePseudo
 * @description Lorsqu'un client demande si un pseudo est disponible, si oui on lui réserve en l'ajoutant à clientData.list
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
        else app.io.broadcast('motoUnvailable', req.data);
        req.io.respond(resp);

        
    }else req.io.respond({error:"Nice try ;-) !"});
});

app.io.route('ready', function (req) {
    if(serverData.pseudoMap[req.socket.id]===req.data.pseudo) {
        if(serverData.waitingRoom.length>=0 && !serverData.playing){//On a au moins 2 joueurs on peut commencer une partie #DEBUG
            initGame(function () {
                startGame();
            });
        } else {
            serverData.waitingRoom.push(req.data.pseudo);
            console.log(serverData.waitingRoom);
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
        var directionJoueur = req.data.direction;
        var oldDir = clientData.players[loginJoueur].direction;
        var player = clientData.players[loginJoueur];
        var pas = serverData.motoSize.l + serverData.motoSize.w/2;
        switch (directionJoueur){
            //case 's': if(oldDir!=='n'){
            //
            //}
            case "n":
                if(oldDir!=='s' && oldDir!=='n') {
                    player.position.y += -pas;
                    player.path.push({
                        x: player.path[player.path.length - 1].x,
                        y: player.path[player.path.length - 1].y - pas
                    });
                    player.direction = directionJoueur;
                }
                break;
            case "e":
                if(oldDir!=='w' && oldDir!=='e') {
                    player.position.x += pas;
                    player.path.push({
                        x: player.path[player.path.length - 1].x + pas,
                        y: player.path[player.path.length - 1].y
                    });
                    player.direction = directionJoueur;
                }
                break;
            case "s":
                if(oldDir!=='n' && oldDir!=='s') {
                    player.position.y += pas;
                    player.path.push({
                        x: player.path[player.path.length - 1].x,
                        y: player.path[player.path.length - 1].y + pas
                    });
                    player.direction = directionJoueur;
                }
                break;
            case "w":
                if(oldDir!=='e' && oldDir!=='w') {
                    player.position.x += -pas;
                    player.path.push({
                        x: player.path[player.path.length - 1].x - pas,
                        y: player.path[player.path.length - 1].y
                    });
                    player.direction = directionJoueur;
                }
                break;
        }
        // req contient l'id du joueur et la nouvelle direction
        //req.io.broadcast("changeDir", "Action du joueur " + req.data.pseudo + " : " + req.data.direction); // envoie aux autres client des infos du joueur
    }
});

// Détection de la collision sur les bords du canvas / de l'écran
function collisionBordures(joueur){
    if(joueur.position.y - motoSize.l > 1 && joueur.direction == "n"){
        return true;
    }
    if(joueur.position.y + motoSize.l > 1 && joueur.direction == "s"){
        return true;
    }
    if(joueur.position.x + motoSize.l > 1 && joueur.direction == "e"){
        return true;
    }
    if(joueur.position.x - motoSize.l > 1 && joueur.direction == "w"){
        return true;
    }
    return false;
}

// Détection de la collition avec les autres joueurs / traces
function collisionTraces(joueur){

    return false;
}

app.listen(3001, function () {
    console.log("Listening localhost:3001");
});

app.io.route('console', function(req){
    console.log(req.data);
});