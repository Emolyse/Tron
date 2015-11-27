var express = require('express.io');
var app = express();
app.http().io();

//app.use(express.cookieParser());
//app.use(express.session({secret:'emolyse secret_key'}));

var nbPlayer;
var isPlaying = false;
var clientData = {
    //Cette liste permet de naviguer dans clientData
    list:["Loxy"],
    //On retrouve ensuite les 0 à 10 clients du plateau
    players :{
        Loxy :{
            position  :{//Position de la moto du joueur ( pos du svg du client)
                x:-1,
                y:-1
            },
            direction : 'X',//Direction courante dans laquelle se dirige le joueur x : initialisation, n : north, s : south, e : east, w : west
            moto      : '-1',//Le couleur de la moto choisie
            path      :[{}]//Représente la trace de chaque joueur ( tracé du canvas pour ce joueur)
        }
    }
};

var serverData = {
    motos_available :[0,1,2,3,4,5,6,7,8,9],//motos disponibles pour
    initial_position:[],//tableau de position x/y pour chaque couleur de moto
    waitingRoom     : []//Joueur en attente quand le plateau est plein max:10 joueurs
}

/****************************************
 *          Routage Client              *
 ****************************************/

//Connexion au serveur : On fournit le client
app.get('/', function (req,res) {res.sendfile("client/index.html");});
//On route tous les fichiers clients nécessaires
app.get('/client/*', function (req,res) {res.sendfile("client/"+req.params[0]);});

/****************************************
 *       DIALOGUE Client/Server         *
 ****************************************/
////////////    LOGIN   /////////////////

// Route pour l'identification du joueur sur le server
app.io.route('newclient', function (req) {
	console.log("newclient");
    req.io.respond({
        res:true,
        availableMotos:serverData.motos_available
    });
});


////////////    INGAME   /////////////////
// On récupère une action pour la donner aux autres
app.io.route('changeDir', function(req){
    var loginJoueur = req.data.joueur;
    var directionJoueur = req.data.direction;
    console.log("directionJoueur : "+directionJoueur);
    //clientData.players[loginJoueur].direction = directionJoueur;
    console.log("clientdata : "+clientData);
    // req contient l'id du joueur et la nouvelle direction
    req.io.broadcast("changeDir", "Action du joueur "+req.data.joueur+" : "+req.data.direction); // envoie aux autres client des infos du joueur
});

app.listen(3001, function () {
    console.log("Listening localhost:3001");
});