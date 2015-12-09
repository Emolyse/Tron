var joueur = {
    pseudo:localStorage.pseudo
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
    "list": ["Loxy", "proxy"],
    //Cette liste permet de naviguer dans clientData
    //On retrouve ensuite les 0 à 10 clients du plateau
    "players": {
        "Loxy": {
            position: {x: 0.25, y: 0.10},//Position de la moto du joueur ( pos du svg du client)
            direction: 'e',//Direction courante dans laquelle se dirige le joueur
            moto: "blue",//Le couleur de la moto choisie
            paths: [{x: 0.05, y: 0.1}, {x: 0.05, y: 0.25}, {x: 0.15, y: 0.25}, {x: 0.15, y: 0.10}, {x:0.25, y:0.10}]
            //Représente la trace de chaque joueur ( tracé du canvas pour ce joueur)
        },

        "proxy": {
            position: {x: 0.7, y: 0.05},//Position de la moto du joueur ( pos du svg du client)
            direction: 'n',//Direction courante dans laquelle se dirige le joueur
            moto: "red",//Le couleur de la moto choisie
            paths: [{x: 0.5, y: 0.1}, {x: 0.5, y: 0.25}, {x: 0.7, y: 0.25}, {x: 0.7, y: 0.05}]//Représente la trace de chaque joueur ( tracé du canvas pour ce joueur)
        }
    }
};
/*Variable qui sert de test utilisée dans le redimentionnement de la fenêtre*/
var playersData2 = {"list": ["Loxy", "proxy"], "players": {"Loxy": {position: {x: 0.25, y: 0.25}, direction: 's', moto: "blue", paths: [{x: 0.05, y: 0.1}, {x: 0.05, y: 0.25}, {x: 0.15, y: 0.25}, {x: 0.15, y: 0.10}, {x:0.25, y:0.10},{x: 0.25, y: 0.25}]}, "proxy": {position: {x: 0.5, y: 0.05}, direction: 'w', moto: "red", paths: [{x: 0.5, y: 0.1}, {x: 0.5, y: 0.25}, {x: 0.7, y: 0.25}, {x: 0.7, y: 0.05}, {x: 0.5, y: 0.05}]}}};

/* Variables de l'initialisation du canvas */
var ctx;
var canvas;


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
        canvas = document.createElement("canvas");
        canvas.id = "tronCanvas";
        canvas.style.display = "absolute";
        document.body.appendChild(canvas);
        canvas.width = innerWidth;
        canvas.height = innerHeight;
        canvas.style.background = "radial-gradient(#72CBD5, #013D4C)";
        ctx = canvas.getContext("2d");
        var deNormalizedPlayersData = deNormalize(playersData);
        initMotos(deNormalizedPlayersData);
        drawPlayers(deNormalizedPlayersData);
    }


    ////////////    INGAME   /////////////////
    /** Evénements du joueur **/
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

    /*Adapter les données à notre écran*/
    function deNormalize(data){
        var playersData = jQuery.extend(true, {}, data);
        $.each(playersData.players, function(i) {
            playersData.players[i].position.x *= innerWidth;
            playersData.players[i].position.y *= innerHeight;
            $.each(playersData.players[i].paths, function(j){
                playersData.players[i].paths[j].x *= innerWidth;
                playersData.players[i].paths[j].y *= innerHeight;
            });
        });
        return playersData;
    }

    /****************************************
     *       DESSINS DES TRACES ET MOTOS    *
     ****************************************/
    /*On parcourt les donnees envoyees par le serveur pour dessiner les joueurs*/
    function drawPlayers(data){

        var players = data.players;
        $.each(players, function(i) {
            var color = motos[players[i].moto].color;
            ctx.beginPath();
            ctx.moveTo(players[i].paths[0].x,players[i].paths[0].y);
            var paths = players[i].paths;
            $.each(paths, function(j){
                ctx.lineTo(paths[j].x, paths[j].y);
            });
            drawMoto(players[i].position.x,players[i].position.y, players[i].moto, players[i].direction);
            ctx.strokeStyle = motos[players[i].moto].color;
            ctx.lineWidth = 5;
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
            default: degres = 0;
        }
        var transX = x;
        var transY = y - 7.5; // A MODIFIER (DEMI TAILLE DE LA MOTO QUI SERA CALCULEE)

        currentmoto[0].style.transformOrigin="0% 50%";
        currentmoto[0].style.transform="translate("+transX+"px,"+transY+"px)";
        currentmoto[0].style.transform += "rotate("+degres+"deg)";
    }



    /****************************************
     *       FONCTIONS UTILES               *
     ****************************************/

    /*Redimentionne le canvas quand la taille de la fenêtre change*/
    $( window ).resize(function() {
        canvas.height = innerHeight;
        canvas.width = innerWidth;
        var deNormalizeData = deNormalize(playersData2);
        drawPlayers(deNormalizeData);
    });

    /* Permet de charger toutes les motos en cours de jeu */
    function initMotos(playersData){
        $(".moto").remove();
        $.each(playersData.players, function(i) {
            var moto = playersData.players[i].moto;
            var img = document.createElement("img");
            img.src = motoPath+motos[moto].file;
            img.style.position = "absolute";
            img.title = "moto"+moto;
            img.id = "moto"+moto;
            document.body.appendChild(img);
            var currentmoto = '#moto'+moto;
        });
    }

    // Tableau de position des motos sur le client ET sur le serveur
    // sur le serveur on a une fonction avec un set interval qui renverra le tableau des positions des motos à tous les clients pour les mettre a jour
});
})(jQuery);
