var express = require('express.io');
var app = express();
app.http().io();

//app.use(express.cookieParser());
//app.use(express.session({secret:'emolyse secret_key'}));

app.get('/', function (req,res) {
    res.sendfile("client/index.html");
});
app.get('/client_script', function (req,res) {

    res.sendfile("client/js/client.js");
});
app.get('/client_css', function (req,res) {

    res.sendfile("client/css/style.css");
});

//app.io.route('ready', function (req) {
//    req.io.respond("Coucou toi !");
//    req.io.emit("repnewuser","c'est encore moi");
//    req.io.broadcast("newuser","Yo les gars ya un nouveau! Il vous dis :"+req.data);
//    app.io.broadcast("relou","Je fais chier tout le monde !")
//});

app.listen(3001, function () {
    console.log("Listening localhost:3001");
});