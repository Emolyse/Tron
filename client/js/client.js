var joueur = {
    pseudo:localStorage.pseudo
};
var motoPath = '/client/img/motos/moto_';
var motosFiles = ['blue.png', 'green.png', 'greenblue.png', 'greyblue.png', 'orange.png', 'pink.png', 'purple.png', 'red.png', 'violet.png', 'yellow.png'];

var playersData;

/* Variables de l'initialisation du canvas */
var screenHeight = innerHeight;
var screenWidth = innerWidth;
var ctx;

    if(!joueur) {
        document.body.innerHTML += "" +
        "<div class='overlay'><form class='formLogin' name='login' action='#'>" +
        "<input type='text' name='pseudo' placeholder='Pseudo'><input name='submit' type='button' value='Jouer'/>" +
        "</form></div>";
    }

(function($) {
    console.log("je suis debile");
$(document).ready(function() {

    io = io.connect();
    io.emit("newclient", joueur, function (resp) {
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
            if (!joueur.moto) {
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
    $("body").append('<canvas id="tronCanvas" height="' + screenHeight + '" width="' + screenWidth + '"> </canvas>');
    var $canvas = $("#tronCanvas");
    var canvas = $canvas[0];
    canvas.width = screenWidth;
    canvas.height = screenHeight;
    canvas.style.background = "#f2f2f2";
    ctx = canvas.getContext("2d");
    ctx.lineWidth = 5;
    drawPlayers();


    ////////////    INGAME   /////////////////
    /** Evénements du joueur **/
    document.addEventListener('keyup', function (evt) {
        if ((evt.keyCode >= 37 && evt.keyCode <= 40) || (evt.which >= 37 && evt.which <= 40)) {
            var data = {joueur: joueur, direction: evt.which};
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
    function drawPlayers() {
        var data = {
            "list": ["Loxy", "proxy"],
            //Cette liste permet de naviguer dans clientData
            //On retrouve ensuite les 0 à 10 clients du plateau
            "players": {
                "Loxy": {
                    position: {//Position de la moto du joueur ( pos du svg du client)
                        x: 400,
                        y: 400
                    },
                    direction: 'E',//Direction courante dans laquelle se dirige le joueur
                    moto: 'blue',//Le couleur de la moto choisie
                    path: {
                        moveto: [50, 50],
                        lineto: [50, 400, 400, 400]
                    }//Représente la trace de chaque joueur ( tracé du canvas pour ce joueur)
                },

                "proxy": {
                    position: {//Position de la moto du joueur ( pos du svg du client)
                        x: 200,
                        y: 100
                    },
                    direction: 'W',//Direction courante dans laquelle se dirige le joueur
                    moto: 'red',//Le couleur de la moto choisie
                    path: {
                        moveto: [800, 800],
                        lineto: [800, 500, 500, 500, 500, 100, 200, 100]
                    }//Représente la trace de chaque joueur ( tracé du canvas pour ce joueur)
                }
            }
        };
        var clientData = data.players;
        $.each(clientData, function (i, item) {
            var paths = clientData[i].path.lineto;
            var color = clientData[i].moto;
            ctx.beginPath();
            ctx.moveTo(clientData[i].path.moveto[0], clientData[i].path.moveto[1]);
            for (var j = 0; j < paths.length; j = j + 2) {
                ctx.lineTo(clientData[i].path.lineto[j], clientData[i].path.lineto[j + 1]);
            }
            ;
            var img = new Image();
            img.src = motoPath + color + ".png";
            drawRotated(clientData[i].direction, clientData[i].position.x, clientData[i].position.y, img);
            ctx.strokeStyle = clientData[i].moto;
            ctx.stroke();
        });
    }

    /* Permet de modifier la direction de l'image de la moto*/
    function drawRotated(direction, x, y, img) {
        var degres = 0;
        switch (direction) {
            case "W":
                degres = 180;
                break;
            case "N":
                degres = -90;
                break;
            case "S":
                degres = 90;
                break;
            default:
                degres = 0;
        }
        img.onload = function () {
            ctx.save();
            var rad = degres * Math.PI / 180;
            //ctx.drawImage(img, x,y-img.height/2);  //Image de base
            ctx.translate(x, y);
            ctx.rotate(rad);
            ctx.drawImage(img, 0, -img.height / 2);
            ctx.restore();
        };
    }

    // Tableau de position des motos sur le client ET sur le serveur
    // sur le serveur on a une fonction avec un set interval qui renverra le tableau des positions des motos à tous les clients pour les mettre a jour
});
})(jQuery);
