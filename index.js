var express = require('express.io');
var app = express();
app.http().io();

app.use(express.cookieParser());
app.use(express.session({secret:'emolyse secret_key'}));

app.io.route('evenement', function (requete) {

});

app.listen(3001, function () {

});