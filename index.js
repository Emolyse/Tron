var express = require('express.io');
var app = express();
app.http().io();

//app.use(express.cookieParser());
//app.use(express.session({secret:'emolyse secret_key'}));

var clientData = {
    //Cette liste permet de naviguer dans clientData
    list:["Machin"],
    //On retrouve ensuite les 0 à 10 clients du plateau
    players :{
        /*
        Machin :{
            position  :{//Position de la moto du joueur ( pos du svg du client)
                x:-1,
                y:-1
            },
            direction : 'X',//Direction courante dans laquelle se dirige le joueur x : initialisation, n : north, s : south, e : east, w : west
            moto      : 'blue',//Le couleur de la moto choisie
            path      :[{}]//Représente la trace de chaque joueur ( tracé du canvas pour ce joueur)
        }*/
    }
};

var serverData = {
    playing         : false,
    capacity        : 10,
    pas             : 0.01,
    motos_available :["green", "greenblue", "greyblue", "orange", "pink", "purple", "red", "violet", "yellow"],//motos disponibles pour
    initial_position:[],//tableau de position x/y pour chaque couleur de moto
    waitingRoom     : [],//Joueur en attente quand le plateau est plein max:10 joueurs
    pseudoMap       : {},//On associe chaque pseudo à son sessionid
    iteration       : iteration()
}

/****************************************
 *          Routage Client              *
 ****************************************/

//Connexion au serveur : On fournit le client
app.get('/', function (req,res) {res.sendfile("client/index.html");});
//On route tous les fichiers clients nécessaires
app.get('/client/*', function (req,res) {res.sendfile("client/"+req.params[0]);});

/****************************************
 *          Functions Server            *
 ****************************************/
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
function createPlayer(player,socketId){
    serverData.pseudoMap[socketId]=player.pseudo;
    clientData.list.push(player.pseudo);
    clientData.players[player.pseudo]= { position:{ x: -1, y: -1}, direction: 'X', moto: '', path:[{}]};
    console.log("Create",player.pseudo,socketId,clientData.list);
}
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

function iterate(player){

}
function iteration(){
    for(var p in clientData.players){
        console.log(p);
        iterate(clientData.players[p]);
    }
}
/****************************************
 *       DIALOGUE Client/Server         *
 ****************************************/
////////////    LOGIN   /////////////////
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
});// Route pour l'identification du joueur sur le server
app.io.route('rmclient', function (req) {
    removePlayer(serverData.pseudoMap[req.socket.id]);
});//Quand un client quitte la partie
app.io.route('availablePseudo', function (req) {
    var available = isAvailablePseudo(req.data.pseudo);
    if(available){
        createPlayer(req.data,req.socket.id);
    }
    req.io.respond({res:available});
});// Lorsqu'un client demande si un pseudo est dispo, si oui on lui réserve
app.io.route('login', function (req) {// Lorque le client a choisi un pseudo et une moto disponibles on cré son profil
    if(serverData.pseudoMap[req.socket.id]===req.data.pseudo) {
        var resp = {res: initPlayer(req.data)};
        if (!resp.res) {
            resp.error = "La moto" + req.data.moto + " n'est plus disponible";
        }
        else app.io.broadcast('motoUnvailable', req.data);
        req.io.respond(resp);

        if(serverData.capacity-1>serverData.motos_available.length){//On a au moins 2 joueurs on peut commencer une partie
            iteration();
        } else {
            serverData.waitingRoom.push(req.data.pseudo);
        }
    }else req.io.respond({error:"Nice try ;-) !"});
});

////////////    INGAME   /////////////////
// On récupère une action pour la donner aux autres
app.io.route('changeDir', function(req){
    //On vérifie que le client est le bon et qu'il n'a pas changé son pseudo via la console
    if(serverData.pseudoMap[req.socket.id]===req.data.pseudo) {
        var loginJoueur = req.data.joueur;
        var directionJoueur = req.data.direction;
        clientData.players[loginJoueur].direction = directionJoueur;
        // req contient l'id du joueur et la nouvelle direction
        req.io.broadcast("changeDir", "Action du joueur " + req.data.joueur + " : " + req.data.direction); // envoie aux autres client des infos du joueur
    }
});

app.listen(3001, function () {
    console.log("Listening localhost:3001");
});