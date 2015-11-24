var express = require('express.io');
var app = express();
app.http().io();

//app.use(express.cookieParser());
//app.use(express.session({secret:'emolyse secret_key'}));

var nbPlayer;
var isPlaying = false;
var clientsDatas = {
    "player": {
        "id": "id",
        "name": "name",
        "posX": 100,
        "posY":100,
        "color":"red",
        "direction":""
    }
};

// On route les pages de l'UI
app.get('/', function (req,res) {res.sendfile("client/index.html");});
app.get('/jquery', function (req,res) {res.sendfile("client/bower_components/jquery/dist/jquery.min.js");});
app.get('/client_script', function (req,res) {res.sendfile("client/js/client.js");});
app.get('/client_css', function (req,res) {res.sendfile("client/css/style.css");});


// On créé le dialogue client/server
app.io.route('login', function (req) {
	//req.data
	req.io.respond("Coucou toi !");
});

// On récupère une action pour la donner aux autres
app.io.route('direction', function(req) {
    req.io.respond("Action d'un autre joueur : "+req.data);
});

app.listen(3001, function () {
    console.log("Listening localhost:3001");
});

