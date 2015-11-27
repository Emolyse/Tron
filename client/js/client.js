var joueur = {
    pseudo:localStorage.pseudo
};
var motoPath = '/client/img/motos/moto_';
var motos = {
    "blue": {file: "blue.png", color: "blue"},
    "green":{file: "green.png", color:"green"},
    "greenblue":{file: "greenblue.png", color:"greenblue"},
    "greyblue":{file: "greyblue.png", color:"greyblue"},
    "orange":{file: "orange.png", color:"orange"},
    "pink":{file: "pink.png", color:"pink"},
    "purple":{file: "purple.png", color:"purple"},
    "red":{file: "red.png", color:"red"},
    "violet":{file: "violet.png", color:"violet"},
    "yellow":{file: "yellow.png", color:"yellow"}
};
var playersData;

/* Variables de l'initialisation du canvas */
var screenHeight = innerHeight;
var screenWidth = innerWidth;
var ctx;

(function($) {
$(document).ready(function() {

	io = io.connect();
    io.emit("newclient",joueur, function (resp) {
        loadLoginOverlay(resp);
    });

    /****************************************
     *       DIALOGUE Client/Server         *
     ****************************************/
    ////////////    LOGIN   /////////////////
    function loadLoginOverlay(loginData, callback) {
        //On créé la sélection de motos disponibles
        var motoElements = "";
        for (var i = 0; i < loginData.availableMotos.length; i++) {
            motoElements += "<img src=" + motoPath + motosFiles[loginData.availableMotos[i]] + " data-moto-id=" + loginData.availableMotos[i] + ">";
        }
        //On vérifie si le joueur a un pseudo disponible
        var pseudoElement;
        if (loginData.availablePseudo) {
            pseudoElement = "<h1>Bonjour " + joueur.pseudo + " !</h1>";
        } else {
            joueur.pseudo = undefined;
            pseudoElement = "<input id='pseudoLogin' type='text' name='pseudo' placeholder='Pseudo'>";
        }
        document.body.innerHTML += "" +
        "<div class='overlay'>" +
        "<div id='motoSelector'>" + motoElements + "</div>" +
        "<form id='formLogin' name='login' onsubmit='return false;'>" + pseudoElement +
        "<input id='loginBTN' name='submit' type='submit' value='Jouer'/>" +
        "</form></div>";
        //On écoute si une moto est sélectionnée par un autre joueur
        io.on("motoUnvailable", function (data) {
            //Si un autre joueur a sélectionné une moto on la supprime de la liste
        });

        //On effectue le traitement du clic sur Joueur
        $("#formLogin").submit(function (e) {
            e.preventDefault();
            if (!joueur.pseudo) {
                var pseudo = document.login.children.pseudo.value;
                //On vérifie si le pseudo est disponible si il est dispo le serveur le valide
                io.emit('availablePseudo', joueur.pseudo, function (resp) {
                    if (resp) {
                        localStorage.pseudo = pseudo;
                        joueur.pseudo = pseudo;
                        if (!joueur.moto) {
                            $('#pseudoLogin').fadeOut("fast", function () {
                                this.remove();
                                $('#formLogin').prepend("<h1>Bonjour " + joueur.pseudo + " ! Choisis une moto.</h1>");
                            });
                        }
                    } else {
                        //On affiche un message d'erreur demandant le choix du pseudo
                    }
                });
            }
            if(!joueur.moto){
                //On affiche un message d'erreur demandant la sélection d'une moto
            }
            //Quand le joueur a choisi un nom et sélectionné une moto il peut se logguer
            if (joueur.pseudo && joueur.moto) {
                login();
                callback();
            }
        });
    }


    /** Démarrage de Tron **/
    function login() {
        //Une fois les données reccueillie on signal au serveur que notre profil peut etre créé
        io.emit("login", joueur, function (resp) {
            if (resp.error) {//Si on a un conflit concernant les paramètre de log (un log simultané de 2 joueurs avec le meme pseudo/moto

            } else {
                //On fait disparaitre l'overlay
                var overlay = $("div.overlay");
                if (overlay.is(":visible")) {
                    overlay.animate({height: 0}, 400, null, overlay.remove);
                }

            }
            if (resp) {
                var profil = $("<div id=profil>"
                + "Bonjour " + joueur.pseudo
                + "</div>");
                $("body").append(profil);
            }
        });
    }


    ////////////    INIT GAME ////////////////
    $("body").append('<canvas id="tronCanvas" height="'+screenHeight+'" width="'+screenWidth+'"> </canvas>');
    var $canvas = $("#tronCanvas");
    var canvas = $canvas[0];
    canvas.width = screenWidth;
    canvas.height = screenHeight;
    canvas.style.background="#f2f2f2";
    ctx = canvas.getContext("2d");
    ctx.lineWidth = 5;
    drawPlayers();


    ////////////    INGAME   /////////////////
    /** Evénements du joueur **/
    document.addEventListener('keyup', function (evt) {
        if ((evt.keyCode >= 37 && evt.keyCode <= 40) || (evt.which >= 37 && evt.which <= 40)) {
            var key = evt.which;
            console.log(key);
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

            var data = {joueur: joueur.pseudo, direction: direction};
            io.emit('changeDir', data, function (resp) {
                console.log(resp);
            });
        }
    });

    /** Récupération des infos d'un joueur **/
    io.on('changeDir', function (data) {
        console.log('data : ' + data);
    });

    //On parcours les donnees envoyees par le serveur pour dessiner les joueurs
    function drawPlayers(){
        var data = {
            "list":["Loxy","proxy"],
            //Cette liste permet de naviguer dans clientData
            //On retrouve ensuite les 0 à 10 clients du plateau
            "players" : {
                    "Loxy": {
                        position: {x: 400, y: 400},//Position de la moto du joueur ( pos du svg du client)
                        direction: 'E',//Direction courante dans laquelle se dirige le joueur
                        moto: "blue",//Le couleur de la moto choisie
                        paths: [{x: 50, y: 400}, {x: 400, y: 400}]
                        //Représente la trace de chaque joueur ( tracé du canvas pour ce joueur)
                    },

                    "proxy": {
                        position: {x: 200, y: 100},//Position de la moto du joueur ( pos du svg du client)
                        direction: 'W',//Direction courante dans laquelle se dirige le joueur
                        moto: "red",//Le couleur de la moto choisie
                        paths: [{x: 800, y: 500}, {x: 500, y: 500}, {x: 500, y: 100}, {x: 200, y: 100}]//Représente la trace de chaque joueur ( tracé du canvas pour ce joueur)
                    }
            }
        };
        var players = data.players;
        $.each(players, function(i) {
            var color = motos[players[i].moto].color;
            ctx.beginPath();
            ctx.moveTo(players[i].paths[0].x,players[i].paths[0].y);
            var paths = players[i].paths;
            $.each(paths, function(j){
                ctx.lineTo(paths[j].x, paths[j].y);
            });
            var img = new Image();
            img.src = motoPath+motos[players[i].moto].file;
            drawRotated(players[i].direction,players[i].position.x,players[i].position.y,img);
            ctx.strokeStyle = players[i].moto;
            ctx.stroke();
        });
    }
    /* Permet de modifier la direction de l'image de la moto*/
    function drawRotated(direction, x, y, img){
        var degres = 0;
        switch(direction) {
            case "W":
                degres = 180;
                break;
            case "N":
                degres = -90;
                break;
            case "S":
                degres = 90;
                break;
            default: degres = 0;
        }
        img.onload = function() {
            ctx.save();
            var rad = degres*Math.PI/180;
            //ctx.drawImage(img, x,y-img.height/2);  //Image de base
            ctx.translate(x, y);
            ctx.rotate(rad);
            ctx.drawImage(img, 0,-img.height/2);
            ctx.restore();
        };
    }

    // Tableau de position des motos sur le client ET sur le serveur
    // sur le serveur on a une fonction avec un set interval qui renverra le tableau des positions des motos à tous les clients pour les mettre a jour
});
})(jQuery);
