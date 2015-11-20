var express = require('express.io');
var app = express();
app.http().io();

//app.use(express.cookieParser());
//app.use(express.session({secret:'emolyse secret_key'}));

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

app.listen(3001, function () {
    console.log("Listening localhost:3001");
});