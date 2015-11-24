var express = require('express.io');
var app = express();
app.http().io();

//app.use(express.cookieParser());
//app.use(express.session({secret:'emolyse secret_key'}));

var nbPlayer;
var isPlaying = false;
var clientData = [{
        pseudo      :"Loxy",
        position    :{
            x:-1,
            y:-1
        },
        direction   : 'X',
        moto        : '-1'
    }
];

//On met en place le routage client
app.get('/', function (req,res) {res.sendfile("client/index.html");});
app.get('/client/*', function (req,res) {res.sendfile("."+req.url);});

// On créé le dialogue client/server
app.io.route('login', function (req) {
	//req.data
	req.io.respond({resp:true});
});

app.io.route('changeDir', function(req){
    // req contient l'id du joueur et la nouvelle direction
});

// On récupère une action pour la donner aux autres
app.io.route('direction', function(req) {
    req.io.respond("Action d'un autre joueur : "+req.data);
});

app.listen(3001, function () {
    console.log("Listening localhost:3001");
});