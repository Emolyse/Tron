var initGamma =false,initBeta=0;
var joueur = {
    pseudo:localStorage.pseudo,
    moto:"blue"
};
var motoPath = '/client/img/motos/moto_';
var motos = {
    blue        :{file: "blue.png", color: "blue"},
    green       :{file: "green.png", color:"green"},
    greenblue   :{file: "greenblue.png", color:"greenblue"},
    greyblue    :{file: "greyblue.png", color:"greyblue"},
    orange      :{file: "orange.png", color:"orange"},
    pink        :{file: "pink.png", color:"pink"},
    purple      :{file: "purple.png", color:"purple"},
    red         :{file: "red.png", color:"red"},
    violet      :{file: "violet.png", color:"violet"},
    yellow      :{file: "yellow.png", color:"yellow"}
};

var playersData = {
    //"list": ["Loxy", "proxy"],
    "list": ["Loxy", "proxy"],
    //Cette liste permet de naviguer dans clientData
    //On retrouve ensuite les 0 à 10 clients du plateau
    "players": {
        /*"Loxy": {
            position: {x: 0.25, y: 0.10},//Position de la moto du joueur ( pos du svg du client)
            direction: 'e',//Direction courante dans laquelle se dirige le joueur
            moto: "blue",//Le couleur de la moto choisie
            path: [{x: 0.05, y: 0.1}, {x: 0.05, y: 0.25}, {x: 0.15, y: 0.25}, {x: 0.15, y: 0.10}, {x:0.25, y:0.10}]
            //Représente la trace de chaque joueur ( tracé du canvas pour ce joueur)
        },

        "proxy": {
            position: {x: 0.7, y: 0.05},//Position de la moto du joueur ( pos du svg du client)
            direction: 'n',//Direction courante dans laquelle se dirige le joueur
            moto: "red",//Le couleur de la moto choisie
            path: [{x: 0.5, y: 0.1}, {x: 0.5, y: 0.25}, {x: 0.7, y: 0.25}, {x: 0.7, y: 0.05}]//Représente la trace de chaque joueur ( tracé du canvas pour ce joueur)
        }*/
    }
};
/*Variable qui sert de test utilisée dans le redimentionnement de la fenêtre*/
var playersData2 = {"list": ["Loxy", "proxy"], "players": {"Loxy": {position: {x: 0.25, y: 0.25}, direction: 's', moto: "blue", path: [{x: 0.05, y: 0.1}, {x: 0.05, y: 0.25}, {x: 0.15, y: 0.25}, {x: 0.15, y: 0.10}, {x:0.25, y:0.10},{x: 0.25, y: 0.25}]}, "proxy": {position: {x: 0.5, y: 0.05}, direction: 'w', moto: "red", path: [{x: 0.5, y: 0.1}, {x: 0.5, y: 0.25}, {x: 0.7, y: 0.25}, {x: 0.7, y: 0.05}, {x: 0.5, y: 0.05}]}}};

/* Variables de l'initialisation du canvas */
var ctx;
var canvas;
var canvasSize;


/*****************************
 *        Event handlers     *
 *****************************/
 function motoSelector (target) {
    joueur.moto = $(target).data("motoId");
    $("#motoSelector>img.selected").removeClass("selected");
    $(target).addClass("selected");
 }

function setInvalidInputMsg(e,msg) {
    if (e.value.search(new RegExp(input.getAttribute('pattern'))) >= 0) {
        e.setCustomValidity('');
    } else {
        e.setCustomValidity(msg);
    }
}
 // <<<<<<<<<<<<<<<<<<<<<<<<<<

(function($) {
$(document).ready(function() {

	io = io.connect();
    io.emit("newclient",joueur, function (resp) {
        loadLoginOverlay(resp);
    });
    $(window).unload(function () {
        io.emit("rmclient",joueur);
    });
    /****************************************
     *       DIALOGUE Client/Server         *
     ****************************************/
    ////////////    LOGIN   /////////////////
    function loadLoginOverlay(loginData, callback) {
        //On créé la sélection de motos disponibles
        var motoElements = "";
        for (var i = 0; i < loginData.availableMotos.length; i++) {
            motoElements += "<img src=" + motoPath + motos[loginData.availableMotos[i]].file +
                            " id='loginMoto"+loginData.availableMotos[i] + "'" +
                            " data-moto-id=" + loginData.availableMotos[i] +
                            " onclick=motoSelector(this)" + ">";
        }
        //On vérifie si le joueur a un pseudo disponible
        var pseudoElement;
        if (loginData.availablePseudo) {
            pseudoElement = "<h1>Bonjour " + joueur.pseudo + " !</h1>";
        } else {
            joueur.pseudo = undefined;
            pseudoElement = "<input id='pseudoLogin' type='text' name='pseudo' pattern='[a-zA-Z][a-zA-Z0-9]+' placeholder='Pseudo' required>";
        }
        document.body.innerHTML += "" +
        "<div class='overlay'>" +
        "<div class='container'>"+
        "<img src='/client/img/logo.png'>"+
        "<div id='motoSelector'>" + motoElements + "</div>" +
        "<form id='formLogin' name='login' onsubmit='return false;'>" + pseudoElement +
        "<input id='loginBTN' name='submit' type='submit' value='Jouer' />" +
        "</form></div></div>";
        //On écoute si une moto est sélectionnée par un autre joueur
        io.on("motoUnvailable", function (data) {
            //Si un autre joueur a sélectionné une moto on la supprime de la liste
            $("#loginMoto"+data.moto).remove();
        });

        //On effectue le traitement du clic sur Joueur
        $("#formLogin").submit(function (e) {
            e.preventDefault();
            //Quand le joueur a choisi un nom et sélectionné une moto il peut se logguer
            if (joueur.pseudo && joueur.moto) {
                login();
                if(callback)
                    callback();
            }
            if (!joueur.pseudo) {
                var pseudo = document.login.children.pseudo.value;
                //On vérifie si le pseudo est disponible si il est dispo le serveur le valide
                io.emit('availablePseudo', {pseudo:pseudo}, function (resp) {
                    if (resp.res) {
                        localStorage.pseudo = pseudo;
                        joueur.pseudo = pseudo;
                        if (!joueur.moto) {
                            $('#pseudoLogin').fadeOut("fast", function () {
                                this.remove();
                                $('#formLogin').prepend("<h1>Bonjour " + joueur.pseudo + " ! Choisis une moto.</h1>");
                            });
                        } else {
                            login();
                            if(callback)
                                callback();
                        }
                    } else {
                        //On affiche un message d'erreur demandant le choix du pseudo
                        console.log("Please choose another pseudo");
                        alert("Ce pseudo n'est pas disponnible");
                    }
                });
            }
            if(!joueur.moto){
                //On affiche un message d'erreur demandant la sélection d'une moto
                console.log("Please select a motorbike");
                alert("Sélectionnez une moto !")
            }
        });
    }


    /** Démarrage de Tron **/
    function login() {
        //Une fois les données reccueillie on signal au serveur que notre profil peut etre créé
        io.emit("login", joueur, function (resp) {
            if (resp.error) {//Si on a un conflit concernant les paramètre de log (un log simultané de 2 joueurs avec le meme pseudo/moto

            } else {
                io.removeListener('motoUnvailable');
                //On fait disparaitre l'overlay
                var $overlay = $("div.overlay");
                if ($overlay.is(":visible")) {
                    $overlay.animate({height: 0}, 400, null, function () {
                        $overlay.remove();
                        loadGame();
                    });
                }
            }
        });
    }


    /****************************************
     *                  JEU                 *
     ****************************************/
    ////////////    INIT GAME ////////////////
    function loadGame(){
        plateau = document.createElement("div");
        plateau.id = "plateau";
        canvasSize = Math.min(innerHeight, innerWidth);
        plateau.style.width =  canvasSize+"px";
        plateau.style.height = canvasSize+"px";
        plateau.style.overflow = "hidden";
        $("main").append(plateau);
        canvas = document.createElement("canvas");
        canvas.id = "tronCanvas";
        canvas.width = canvasSize;
        canvas.height = canvasSize;
        $("#plateau").append(canvas);
        ctx = canvas.getContext("2d");
        io.on("initialisation",function (data) {
            if(initMotos(deNormalize((data)))){
                drawPlayers(deNormalize(data));
            }
        });

        io.on("iteration",function(data){
            //console.log(data);
            drawPlayers(deNormalize(data));
        });
        io.emit("ready",joueur);

        io.on('start', function(){
            gamma = 0;
            beta = 0;
            window.addEventListener('deviceorientation', function(event) {
                var beta=0,gamma=0;
                if(initGamma){
                    initGamma = event.gamma;
                    initBeta = event.beta;
                }else {
                    gamma = event.gamma-initGamma;
                    beta = event.beta-initBeta;
                }
                var direction = "";
                if(gamma > 25){
                    direction = "e";
                }
                if(gamma < -25){
                    direction = "w";
                }
                if(beta > 25){
                    direction = "s";
                }
                if(beta < -25){
                    direction = "n";
                }
                var data = {pseudo: joueur.pseudo, direction: direction};
                io.emit('changeDir', data, function (resp) {});
            });

                document.addEventListener('keyup', function (evt) {
                    if ((evt.keyCode >= 37 && evt.keyCode <= 40) || (evt.which >= 37 && evt.which <= 40)) {
                        var key = evt.which;
                        var direction = "";
                        if(key == 37){
                            direction = "w";
                        }
                        if(key == 38){
                            direction = "n";
                        }
                        if(key == 39){
                            direction = "e";
                        }
                        if(key == 40){
                            direction = "s";
                        }
                        var data = {pseudo: joueur.pseudo, direction: direction};
                        io.emit('changeDir', data, function (resp) {
                        });
                    }
                });
            //} else {
            //    // Le navigateur ne supporte pas l'événement deviceorientation ou on est sur un pc
            //}
        });
    }


    ////////////    INGAME   /////////////////

    /** Récupération des infos d'un joueur **/
    io.on('changeDir', function (data) {
        console.log('data : ' + data);
    });

    /*Adapter les données à notre écran*/
    function deNormalize(data){
        var playersData = jQuery.extend(true, {}, data);
        $.each(playersData.players, function(i) {
            playersData.players[i].position.x *= canvasSize;
            playersData.players[i].position.y *= canvasSize;
            playersData.players[i].motoSize.l *= canvasSize;
            playersData.players[i].motoSize.w *= canvasSize;
            $.each(playersData.players[i].path, function(j){
                playersData.players[i].path[j].x *= canvasSize;
                playersData.players[i].path[j].y *= canvasSize;
            });
        });
        return playersData;
    }

    /****************************************
     *       DESSINS DES TRACES ET MOTOS    *
     ****************************************/
    /*On parcourt les donnees envoyees par le serveur pour dessiner les joueurs*/
    function drawPlayers(data){
        ctx.clearRect(0,0,canvasSize,canvasSize);
        var players = data.players;
        $.each(players, function(i) {
            var color = motos[players[i].moto].color;
            ctx.beginPath();
            ctx.moveTo(players[i].path[0].x,players[i].path[0].y);
            var path = players[i].path;
            $.each(path, function(j){
                ctx.lineTo(path[j].x, path[j].y);
            });
            drawMoto(players[i].position.x,players[i].position.y, players[i].moto, players[i].direction);
            ctx.strokeStyle = motos[players[i].moto].color;
            if(players[i].direction == "x"){
                ctx.strokeStyle = "#aaa";
            }
            ctx.lineWidth = 1;
            ctx.stroke();
        });
    }
    /* Permet d'ajouter l'image de la moto*/
    function drawMoto(x, y, moto, direction){
        var currentmoto = $('#moto'+moto);
        var degres = 0;
        switch(direction) {
            case "w":
                    degres = 180;
                break;
            case "n":
                    degres = -90;
                break;
            case "e":
                degres = 0;
                break;
            case "s":
                degres = 90;
                break;
            //default: degres = 0;
        }
        var transX = x;
        var transY = y - currentmoto[0].height/2;

        currentmoto[0].style.transformOrigin="0% 50%";
        currentmoto[0].style.transform="translate("+transX+"px,"+transY+"px)";
        currentmoto[0].style.transform += "rotate("+degres+"deg)";
    }



    /****************************************
     *       FONCTIONS UTILES               *
     ****************************************/

    /*Redimentionne le canvas quand la taille de la fenêtre change*/
    $( window ).resize(function() {
        canvasSize = Math.min(innerHeight, innerWidth);
        var plateau = document.getElementById("plateau");
        plateau.style.height = canvasSize+"px";
        plateau.style.width = canvasSize+"px";
        canvas.width = canvasSize;
        canvas.height = canvasSize;
    });

    /* Permet de charger toutes les motos en cours de jeu */
    function initMotos(playersData){
        $(".moto").remove();
        $.each(playersData.players, function(i) {
            console.log(playersData.players[i].motoSize);
            var moto = playersData.players[i].moto;
            var img = document.createElement("img");
            img.src = motoPath+motos[moto].file;
            img.style.position = "absolute";
            img.style.width = playersData.players[i].motoSize.l+"px";
            img.style.height = playersData.players[i].motoSize.w+"px";
            img.style.top = 0;
            img.style.left = 0;
            img.title = "moto"+moto;
            img.id = "moto"+moto;
            document.getElementById("plateau").appendChild(img);
        });
        return true;
    }



    // Tableau de position des motos sur le client ET sur le serveur
    // sur le serveur on a une fonction avec un set interval qui renverra le tableau des positions des motos à tous les clients pour les mettre a jour
});
})(jQuery);

//function initTrace(){
//    var ctx = document.querySelector("#canvasPoints").getContext('2d');
//    ctx.strokeStyle = "rgba(0, 0, 0, 1)";
//    ctx.lineWidth = 2;
//    ctx.beginPath();
//    ctx.moveTo(0, 90);
//    ctx.lineTo(180, 90);
//    ctx.moveTo(90, 0);
//    ctx.lineTo(90, 180);
//    ctx.stroke();
//}
//
//function trace(beta, gamma){
//    var ctx = document.querySelector("#canvasPoints").getContext('2d');
//    ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
//
//    ctx.fillRect(beta+90, 90-gamma, 2,2);
//}
