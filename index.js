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
        "color":"red"
    }
};

//On met en place le routage client
app.get('/', function (req,res) {res.sendfile("client/index.html");});
app.get('/client/*', function (req,res) {res.sendfile("."+req.url);});

// On créé le dialogue client/server
app.io.route('login', function (req) {
	//req.data
	req.io.respond({resp:true});
});

app.listen(3001, function () {
    console.log("Listening localhost:3001");
});