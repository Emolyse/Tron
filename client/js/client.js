var initGamma =false,initBeta=0;
var joueur = {
    pseudo:localStorage.pseudo
};

var motoPath = '/client/img/motos/moto_';
var motos = {
    blue        :{file: "blue.png", color: "#1A237E"},
    green       :{file: "green.png", color:"#2E7D32"},
    greenblue   :{file: "greenblue.png", color:"#00BCD4"},
    greyblue    :{file: "greyblue.png", color:"#B3E5FC"},
    orange      :{file: "orange.png", color:"#FF9800"},
    pink        :{file: "pink.png", color:"#E91E63"},
    purple      :{file: "purple.png", color:"#B71C1C"},
    red         :{file: "red.png", color:"#D50000"},
    violet      :{file: "violet.png", color:"#4A148C"},
    yellow      :{file: "yellow.png", color:"#FFEA00"}
};


/* Variable pour gérer les arrivées des messages*/
var lastDataMsg = {pseudo:""};
var lastDateMsg = new Date();

/* Variables de l'initialisation du canvas */
var ctx;
var canvas;
var canvasSize;
var marginCanvas = 10;


/*****************************
 *      Selector handler     *
 *****************************/
/**
 * @name motoSelector
 * @description Gère la sélection d'une moto
 * @param target
 */
function motoSelector(target) {
    joueur.moto = $(target).data("motoId");
    $("#motoSelector > img.selected").removeClass("selected");
    $(target).addClass("selected");
}

(function($) {

    /*****************************
     *          Compteur         *
     *****************************/
    /**
     * @global compteur
     * @description L'objet compteur peut être réutilsé à l'aide de Object(compteur) afin de créer des comptes à rebours
     * @type {{init: compteur.init, offset: number, elt: Element, circle: Element, value: Element, launch: compteur.launch}}
     */
    var compteur = {
        /**
         * @name compteur.init
         * @description Crée l'élément de compte à rebours suivant les paramètres donnés
         * @param {int} size Diamètre du cercle
         * @param {String} color Couleur
         * @param {int} strokeWidth Epaisseur du trait formant le cercle
         * @returns {Element}
         */
        init : function (size,color,strokeWidth) {
            if(!color)
                color = "#03A9F4";
            if(strokeWidth)
                strokeWidth *= 100/size;
            else
                strokeWidth = 10;
            var rayon = (100-strokeWidth)/2;
            this.offset = Math.PI*2*rayon;
            var elt = document.createElement("div");
            elt.classList.add("compteur");
            elt.style.height = size+"px";
            elt.style.width = size+"px";
            elt.innerHTML = '<svg viewBox="0 0 100 100" preserveAspectRatio="none">'+
                '<circle cx="50" cy="50" r="'+rayon+'" stroke="'+color+'" stroke-width="'+strokeWidth+'" fill-opacity="0"/>'+
                '</svg>'+
                '<div class="value"></div>';
            this.elt = elt;
            $(elt).hide();
            this.circle = elt.querySelector("svg > circle");
            this.circle.style.strokeDasharray = this.offset;
            this.value = elt.querySelector(".value");
            this.value.style.color = color;
            this.value.style.fontSize = (size/2)+"px";
            this.value.style.lineHeight = (size/2)+"px";
            this.value.style.paddingTop = (size/4)+"px";
            return elt;
        },
        offset:0,
        //Par defaut on sélectionne le premier compteur existant
        elt : document.querySelector(".compteur"),
        circle : document.querySelector(".compteur > svg > circle"),
        value : document.querySelector(".compteur > .value"),
        /**
         * @name compteur.launch
         * @description Lance un compte à rebours
         * @param {int} time Durée du compte à rebours
         * @param {String} msg Message affiché à la fin du compte à rebours
         * @param callback
         */
        launch : function (time,msg,callback) {
            this.value.innerHTML = time;
            this.circle.style.strokeDashoffset = 0;
            var tis = this;
            $(this.elt).fadeIn(500);
            if(Math.round(time)>0){
                var decTime = time-1;
                tis.circle.style.strokeDashoffset = 0;
                tis.circle.style.strokeDashoffset = tis.offset*(decTime/time-1);
                var intId = setInterval(function () {
                    compteur.value.innerHTML = decTime--;
                    if(decTime<0){
                        clearInterval(intId);
                        tis.value.innerHTML = msg;
                        setTimeout(function () {
                            $(tis.elt).slideToggle(400, function () {
                                tis.circle.style.strokeDashoffset = 0;
                                if(callback) callback();
                            });
                        },1000)
                    } else {
                        tis.circle.style.strokeDashoffset = tis.offset*(decTime/time-1);
                    }
                },1000);
            }
        }

    };
$(document).ready(function() {
	io = io.connect();


    //On prévient le serveur de l'arrivé du nouveau client, on lui envoie le précent pseudo
    io.emit("newclient",joueur, function (resp) {
        loadLoginOverlay(resp);
    });

    //Quand le client quitte la page on prévient le serveur
    window.addEventListener('beforeunload',function(){
        io.emit("rmclient",joueur);
    });

    /****************************************
     *               CONNEXION              *
     ****************************************/
    /**
     * @name loadLoginOverlay
     * @description Crée l'écran de connexion au jeu et gère le choix et la validation du pseudo et de la moto
     * @param {Object} loginData
     *          > {Array<String>} availableMotos Liste des motos disponibles
     *          > {boolean} availablePseudo Si le précédent pseudo est toujours disponible ou non
     * @param callback
     */
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
        //On sélectionne la dernière moto par default
        joueur.moto = $("#motoSelector>img").last().addClass("selected").data("motoId");
        //On écoute si une moto est sélectionnée par un autre joueur
        io.on("motoUnavailable", function (data) {
            //Si un autre joueur a sélectionné une moto on la supprime de la liste et on reselectionne la dernière
            var $imgMoto = $("#motoSelector>img");
            var $rmMoto = $("#loginMoto"+data.moto);
            var hasClassSelected = $rmMoto.hasClass("selected");
            $rmMoto.remove();
            if($imgMoto.length>0 && hasClassSelected){
                joueur.moto = $imgMoto.last().addClass("selected").data("motoId");
            }
        });
        //On écoute si une moto est de nouveau disponible
        io.on("motoAvailable", function (data) {
            console.log("MotoAvailable");
            //Si un autre joueur a sélectionné une moto on la supprime de la liste
            document.querySelector('#motoSelector').innerHTML+="<img src=" + motoPath + motos[data].file +
            " id='loginMoto"+data + "'" +
            " data-moto-id=" + data +
            " onclick=motoSelector(this)" + ">";
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
    /**
     * @name login
     * @description Une fois le pseudo et la moto validés on démarre le chargement du jeu et le chat
     */
    function login() {
        //Une fois les données reccueillie on signal au serveur que notre profil peut etre créé
        io.emit("login", joueur, function (resp) {
            if (resp.error) {//Si on a un conflit concernant les paramètre de log (un log simultané de 2 joueurs avec le meme pseudo/moto
                alert(resp.error);
            } else {
                delete io.$events.motoUnavailable;
                delete io.$events.motoAvailable;
                //On fait disparaitre l'overlay
                var $overlay = $("div.overlay");
                if ($overlay.is(":visible")) {
                    $overlay.animate({height: 0}, 400, null, function () {
                        $overlay.remove();
                        //On charge l'environnement de jeu et le chat
                        loadGame();
                        loadChat();
                    });
                }
            }
        });
    }

    /****************************************
     *                  JEU                 *
     ****************************************/
    /**
     * @name loadGame
     * @description On charge l'environnement de jeu et on déclenche l'écoute d'évenement serveur
     */
    function loadGame(){
        //On crée le plateau de jeu
        plateau = document.createElement("div");
        plateau.id = "plateau";
        canvasSize = Math.min(innerHeight, innerWidth);
        if(canvasSize==innerHeight){
            canvasSize-=marginCanvas*2;
        }
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

        $( window ).resize(resizeHandler);

        //On initialise le compte à rebours
        var compteurInGame = Object(compteur);
        plateau.appendChild(compteurInGame.init(canvasSize/2,"#03A9F4",20));
        io.on("launch", function (data) {
            compteurInGame.launch(data.time,data.msg)
        });

        //Si un joueur arrive dans la partie on ajoute sa moto et son bloc score
        io.on("newPlayer", function (player) {
            console.log("newplayer",player);
            player = deNormalizePlayer(player);
            addMoto(player);
            addScore(player.pseudo,player.moto,player.win);
        });

        //Si un joueur quitte la partie on supprime sa moto et son bloc score
        io.on("removePlayer", function (player) {
            removeMoto(player);
            removeScore(player.pseudo);
        });

        //Quand on initialise la partie on charge l'ensemble des évenements qui peuvent survenir pendant la partie
        io.on("initialisation",function (data) { // Une partie commence
            //On charge l'ensemble des motos
            console.log("initialisation");
            ctx.clearRect(0,0,canvasSize,canvasSize);
            regenerateMotos(deNormalizeAll(data), function () {
                //drawPlayers(deNormalizeAll(data), function () {
                    //A chaque itération on met à jour le plateau
                    trash = loadScore(data.players);
                    io.on("iteration",function(dataBis){
                        drawPlayers(deNormalizeAll(dataBis));
                        updateScoreByTime(dataBis.players);
                    });
                //});
                //Lorsque la partie commence en charge le controle utilisateur
                io.on('start', function(){
                    console.log("start");
                    window.addEventListener('deviceorientation', orientationHandler,true);
                    initVirtualControl();
                    document.addEventListener('keydown', controlKeyHandler);
                    //On supprime tous les listeners liés à la partie lorsqu'elle se termine
                    io.on("end", function (players) {
                        updateScoreByWin(players)
                        delete io.$events.iteration;
                        window.removeEventListener('deviceorientation',orientationHandler);
                        document.removeEventListener('keydown',controlKeyHandler);
                        $(".fleches").remove();
                        delete io.$events.start;
                        delete io.$events.end;
                    });
                });
            });
        });

        //On signal au serveur qu'on est prêt
        io.emit("ready",joueur);
    }

    /****************************************
     *     PRISE EN CHARGE DES CONTROLES    *
     ****************************************/
    /**
     * @name orientationHandler
     * @description Prise en charge d'un évenement de changement d'orientation d'un appareil mobile
     * @param event
     */
    function orientationHandler(event){
        var beta = 0, gamma = 0;
        if (initGamma) {
            initGamma = event.gamma;
            initBeta = event.beta;
        } else {
            gamma = event.gamma - initGamma;
            beta = event.beta - initBeta;
        }
        var direction = "";
        if (gamma > 25) { direction = "e"; }
        if (gamma < -25) { direction = "w"; }
        if (beta > 25) { direction = "s"; }
        if (beta < -25) { direction = "n"; }

        var data = {pseudo: joueur.pseudo, direction: direction};
        io.emit('changeDir', data);
    }
    /**
     * @name controlKeyHandler
     * @description Prise en charge d'un évenement d'appui sur une touche
     * @param evt
     */
    function controlKeyHandler(evt){
        if ((evt.keyCode >= 37 && evt.keyCode <= 40) || (evt.which >= 37 && evt.which <= 40)) {
            var key = evt.which;
            var direction = "";
            if(key == 37){ direction = "w"; }
            if(key == 38){ direction = "n"; }
            if(key == 39){ direction = "e"; }
            if(key == 40){ direction = "s"; }
            var data = {pseudo: joueur.pseudo, direction: direction};
            io.emit('changeDir', data);
        }
    }
    /**
     * @name initVirtualControl
     * @description Ajout de touches virtuelles sur les mobiles ne naviguant pas sur chrome
     */
    function initVirtualControl(){
        //Sur les mobiles on ajoute des touches tactiles virtuelles
        if( (navigator.userAgent.match(/Android/i) || navigator.userAgent.match(/webOS/i)
            || navigator.userAgent.match(/iPhone/i) || navigator.userAgent.match(/iPad/i)
            || navigator.userAgent.match(/iPod/i) || navigator.userAgent.match(/BlackBerry/i)
            || navigator.userAgent.match(/Windows Phone/i))&& !/Chrome/i.test(navigator.userAgent)
        ){
            //On ajoute des touches de controle virtuelle
            try{
                screen.orientation.lock('landscape-secondary');
            } catch (e){
                console.log(e);
            }
            var $fleches = $('<div class="fleches">' +
                '<div class="hautBas">' +
                    '<img id="north" data-direction="n" src="/client/img/arrow.png">' +
                    '<img id="south" data-direction="s" src="/client/img/arrow.png">' +
                '<div class="droiteGauche">' +
                    '<img id="west" data-direction="w" src="/client/img/arrow.png">' +
                    '<img id="east" data-direction="e" src="/client/img/arrow.png">' +
                '</img>');
            $('main').append($fleches);
            //On ajoute les listener pour les appui tactiles
            $('#north, #south, #west, #east').on('touchstart click', function(e){
                var data = {pseudo: joueur.pseudo, direction: e.target.dataset.direction};
                io.emit('changeDir', data);
            });
        }
    }

    /****************************************
     *       DESSINS DES TRACES ET MOTOS    *
     ****************************************/
    /**
     * @name drawPlayers
     * @description On parcourt les donnees envoyees par le serveur pour mettre à jour les motos et les traces des joueurs
     * @param {Element} data
     * @param callback
     * @returns {boolean}
     */
    function drawPlayers(data,callback){
        ctx.clearRect(0,0,canvasSize,canvasSize);
        var players = data.players;
        $.each(players, function(i) {
            //On trace les chemins de tous les joueurs en jeu ou morts
            if (players[i].statut != "waiting") {
                ctx.beginPath();
                if (players[i].path.length > 1) {
                    ctx.strokeStyle = motos[players[i].moto].color;
                    if (players[i].statut == "dead") {
                        ctx.strokeStyle = "#aaa";
                    }
                    var path = players[i].path;
                    ctx.moveTo(path[0].x, path[0].y);
                    $.each(path, function (j) {
                        ctx.lineTo(path[j].x, path[j].y);
                    });
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
                var currentMoto = document.querySelector("#moto"+players[i].moto);
                //Si la moto existe et n'est pas en cours de disparition on met à jour son affichage
                if($(currentMoto).length && !$(currentMoto).hasClass("dead")) {
                    drawMoto(players[i].position.x, players[i].position.y, currentMoto, players[i].direction, function () {
                        //On gère la disparition d'une moto lorsque le joueur est mort
                        if(players[i].statut == "dead"){
                            console.log("Dead "+players[i].moto);
                            $(currentMoto).addClass("dead");
                            $(currentMoto).fadeOut(400,function () {
                                $(currentMoto).remove();
                            });
                        }
                    });
                    //On gère l'animation d'une moto invincible
                    if($(currentMoto).hasClass("invincible") && players[i].statut != "invincible"){
                        $(currentMoto).removeClass("invincible");
                    }
                    if(!$(currentMoto).hasClass("invincible") && players[i].statut == "invincible"){
                        $(currentMoto).addClass("invincible");
                    }
                }
            }
        });
        if(callback)
            callback();
        return true;
    }
    /**
     * @name drawMoto
     * @description on met à jour l'orientation et la position de la moto
     * @param {float} x nouvelle position horizontale de la moto
     * @param {float} y nouvelle position verticale de la moto
     * @param {Element} currentmoto élément js de la moto
     * @param {char} direction de la moto
     * @param callback
     */
    function drawMoto(x, y, currentmoto, direction,callback){
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
        var transY = y - currentmoto.clientHeight/2;
        currentmoto.style.webkitTransformOrigin="0% 50%";
        currentmoto.style.transformOrigin="0% 50%";
        currentmoto.style.webkitTransform ="translate("+transX+"px,"+transY+"px) rotate("+degres+"deg)";
        currentmoto.style.transform ="translate("+transX+"px,"+transY+"px) rotate("+degres+"deg)";
        if(callback){
            callback();
        }
    }

    /****************************************
     *          MOTO ELEMENT                *
     ****************************************/
    /**
     * @name removeMoto
     * @description supprime l'élément moto d'un joueur
     * @param {Object} player
     */
    function removeMoto(player){
        $("#moto"+player.moto).remove();
    }
    /**
     * @name addMoto
     * @description crée l'élément moto d'un joueur et l'ajoute au plateau
     * @param {Object} player
     * @returns {boolean}
     */
    function addMoto(player){
        console.log("Add moto",player);
        var moto = player.moto;
        var motoElt = document.createElement("div");
        motoElt.style.width = player.motoSize.l + "px";
        motoElt.style.height = player.motoSize.w + "px";
        motoElt.className += "moto";
        motoElt.title = "moto" + moto;
        motoElt.id = "moto" + moto;
        var img = document.createElement("img");
        img.src = motoPath + motos[moto].file;
        motoElt.appendChild(img);
        document.getElementById("plateau").appendChild(motoElt);
        drawMoto(player.position.x,player.position.y,motoElt,player.direction);
        return true;
    }
    /**
     * @name regenerateMoto
     * @description supprime et réinsère tous les éléments moto des joueurs en jeu
     * @param {Object} playersData
     * @param callback
     * @returns {boolean}
     */
    function regenerateMotos(playersData, callback){
        $(".moto").remove();
        $.each(playersData.players, function(i) {
            var player = playersData.players[i];
            if(player.statut == "playing" || player.statut=="invincible") {
                trash = addMoto(player);
            }
        });
        if(callback)
            callback();
        return true;
    }

    /****************************************
     *           OUTILS RESPONSIVE          *
     ****************************************/
    /**
     * @name resizeHandler
     * @description Redimentionne le canvas quand la taille de la fenêtre change
     */
    function resizeHandler() {
        canvasSize = Math.min(innerHeight, innerWidth);
        if(canvasSize==innerHeight){
            canvasSize-=marginCanvas*2;
        }
        var plateau = document.getElementById("plateau");
        plateau.style.height = canvasSize+"px";
        plateau.style.width = canvasSize+"px";
        canvas.width = canvasSize;
        canvas.height = canvasSize;
    }
    /**
     * @name deNormalizePlayer
     * @description Convertit les coordonnées du jeu de données normalisé en position adaptées à l'écran pour un joueur
     * @param {Object} p joueur normalisé
     * @return {Object} joueur dénormalisé
     */
    function deNormalizePlayer(p){
        var player = jQuery.extend(true, {}, p);
        player.position.x *= canvasSize;
        player.position.y *= canvasSize;
        player.motoSize.l *= canvasSize;
        player.motoSize.w *= canvasSize;
        $.each(player.path, function(j){
            player.path[j].x *= canvasSize;
            player.path[j].y *= canvasSize;
        });
        return player;
    }
    /**
     * @name deNormalizeAll
     * @description Convertit les coordonnées du jeu de données normalisé en position adaptées à l'écran pour tous les joueurs
     * @param {Object} data jeu de données normalisé
     * @return {Object} jeu de données dénormalisé
     */
    function deNormalizeAll(data){
        var playersData = jQuery.extend(true, {}, data);
        $.each(playersData.players, function(i) {
            playersData.players[i] = deNormalizePlayer(playersData.players[i])
        });
        return playersData;
    }

    /****************************************
     *                 SCORE                *
     ****************************************/
    /**
     * @name loadScore
     * @description Efface et reconstruit le tableau des scores
     * @param {Object} players
     * @returns {boolean}
     */
    function loadScore(players){
        if($("#score").length>0){
            document.querySelector("#score").innerHTML = "";
        } else {
            var score = document.createElement("section");
            score.id = "score";
            document.body.appendChild(score);
            if( navigator.userAgent.match(/Android/i) || navigator.userAgent.match(/webOS/i)
                || navigator.userAgent.match(/iPhone/i) || navigator.userAgent.match(/iPad/i)
                || navigator.userAgent.match(/iPod/i) || navigator.userAgent.match(/BlackBerry/i)
                || navigator.userAgent.match(/Windows Phone/i)
            ){
                score.style.top = (Math.min(innerHeight, innerWidth)+15)+"px";
            }
        }
        for(var pseudo in players){
            if(players[pseudo].statut != "waiting")
                trash = addScore(pseudo,players[pseudo].moto,players[pseudo].win);
        }
        updateScoreByWin(players);
        return true;
    }
    /**
     * @name addScore
     * @description Ajoute le bloc score dans nouvel arrivant dans le tableau
     * @param {String} pseudo Identifiant du nouvel arrivant
     * @param {String} moto Couleur
     * @param {Integer} win Nombre de victoire
     * @returns {Element} Le bloc
     */
    function addScore(pseudo,moto,win){
        var score = document.querySelector("#score");
        var block = document.createElement("div");
        block.classList.add("block")
        block.id="score_"+pseudo;
        $("<div class='position' style='background-color:"+motos[moto].color+"'> "+win+" </div>").appendTo(block);
        $("<div class='pseudo'>"+pseudo+"</div>").appendTo(block);
        $("<div class='value'>"+0+"</div>").appendTo(block);
        score.appendChild(block);
        block.style.top = ((score.children.length-1)*(block.clientHeight+5)+5)+"px";
        return block;
    }
    /**
     * @name removeScore
     * @description Supprime le bloc score d'un joueur
     * @param {String} pseudo Identifiant du joueur
     */
    function removeScore(pseudo){
        $("#score_"+pseudo).remove();
    }
    /**
     * @name updateScore
     * @description Mets à jour le tableau des scores suivant l'ordre de sortedKeys
     * @param {Object} players
     * @param {Array<String>} sortedKeys
     */
    function updateScore(players,sortedKeys){
        for (var i = 0; i < sortedKeys.length; i++) {
            if(players[sortedKeys[i]].statut != "waiting")
            {
                var block = document.querySelector("#score_" + sortedKeys[i]);
                block.style.top = (i * (block.clientHeight + 5) + 5) + "px";
                block.querySelector(".position").innerHTML = players[sortedKeys[i]].win + "";
                block.querySelector(".value").innerHTML = players[sortedKeys[i]].score;
            }
        }
    }
    /**
     * @name updateScoreByTime
     * @description Tri le tableau des scores suivant leur durée dans la partie
     * @param {Object} players
     */
    function updateScoreByTime(players){
        var sortedKeys = Object.keys(players).sort(function (a,b) {
            return players[b].score-players[a].score;
        });
        updateScore(players,sortedKeys);
    }
    /**
     * @name updateScoreByWin
     * @description Tri le tableau des scores suivant leur nombre de partie gagnée
     * @param {Object} players
     */
    function updateScoreByWin(players){
        var sortedKeys = Object.keys(players).sort(function (a,b) {
            return players[b].win-players[a].win;
        });
        updateScore(players,sortedKeys);
    }

    /****************************************
     *                  CHAT                *
     ****************************************/
    /**
     * @name getMessageElement
     * @description Renvoie l'élément à insérer dans le chat
     * @param {Object} data Objet du message
     *          > {String} pseudo
     *          > {String} msg
     *          > {String} date
     *          > {String} color
     * @param {boolean} perso Si le message provient du client courant
     * @returns {Element}
     */
    function getMessageElement(data,perso){
        var message = document.createElement("div");
        if(data.pseudo == "server"){
            var newDateMsg = new Date();
            if(newDateMsg-lastDateMsg>500)
                $("#chat > .msg-container > .msg-server").remove();
            lastDateMsg = newDateMsg;
            message.classList.add("msg-server");
            message.innerHTML = data.msg;
        }else{
            var pseudo = data.pseudo;
            message.classList.add("message");
            if(perso){
                message.classList.add("perso");
                pseudo  = "You";
            }
            message.innerHTML = '<div class="pseudo" style="color: '+data.color+'">'+pseudo+'</div>' +
                '<div class="date">'+data.date+'</div>' +
                '<div class="message-msg">'+data.msg+'</div>';
        }
        return message;
    }
    /**
     * @name addMessageElt
     * @description Ajoute un message arrivant au chat
     * @param {Object} data Objet du message
     *          > {String} pseudo
     *          > {String} msg
     *          > {String} date
     *          > {String} color
     * @param {boolean} perso Si le message provient du client courant
     */
    function addMessageElt(data,perso){
        var container = document.querySelector(".msg-container");
        if(lastDataMsg.pseudo == data.pseudo && data.pseudo != "server"){
            lastDataMsg.elt.querySelector(".message-msg").innerHTML+='<br>'+data.msg;
            lastDataMsg.elt.querySelector(".date").innerHTML=data.date;
        } else {
            var msg = getMessageElement(data,perso);
            lastDataMsg = data;
            container.appendChild(msg);
            lastDataMsg.elt = msg;
        }
        $(container).animate({scrollTop : container.scrollHeight-container.clientHeight},300);
    }
    /**
     * @name loadChat
     * @description Construit l'élément #chat pour les appareils non mobiles
     */
    function loadChat(){
        if( !(navigator.userAgent.match(/Android/i) || navigator.userAgent.match(/webOS/i)
            || navigator.userAgent.match(/iPhone/i) || navigator.userAgent.match(/iPad/i)
            || navigator.userAgent.match(/iPod/i) || navigator.userAgent.match(/BlackBerry/i)
            || navigator.userAgent.match(/Windows Phone/i))
        ) {
            io.on('chat', function (data) {
                addMessageElt(data, false)
            });
            var chat = document.createElement("form");
            chat.id = "chat";
            chat.innerHTML = '<section class="msg-container"></section>' +
                '<section class="input-container">' +
                '<input type="text" id="input-msg">' +
                '<input type="submit" id="submit-msg" value=">">' +
                '</section>';
            document.querySelector("main").appendChild(chat);
            chat.addEventListener('submit', function (e) {
                e.preventDefault();
                var date = new Date();
                var heure = date.getHours();
                var min = date.getMinutes();
                var sec = date.getSeconds();
                date = (heure < 10 ? "0" : "") + heure + ":" + (min < 10 ? "0" : "") + min + ":" + (sec < 10 ? "0" : "") + sec;
                var data = {
                    pseudo: joueur.pseudo,
                    msg: $("#input-msg").val(),
                    date: date,
                    color: motos[joueur.moto].color
                };
                if (data.msg.length > 0) {
                    $("#input-msg").val("");
                    io.emit('chat', data, function (rep) {
                        if (rep.error) {
                            //Indiquer un problème (ex : flood)
                        } else {
                            addMessageElt(data, true);
                        }
                    });
                }
            });
        }
    }

    //Fonction de debug qui affiche la grille de collision envoyée par le serveur
    //io.on("drawGrid", function (data) {
    //    $("#truc").remove();
    //    var canGrid = document.createElement("canvas");
    //    canGrid.id = "truc";
    //    canGrid.width = 500;
    //    canGrid.height = 500;
    //    canGrid.style.position = "fixed";
    //    canGrid.style.top = 0;
    //    canGrid.style.left = 0;
    //    canGrid.style.backgroundColor= "#fff";
    //    canGrid.style.opacity= 0.9;
    //    document.body.appendChild(canGrid);
    //    var ctxGrid = canGrid.getContext('2d');
    //    //console.log(data);
    //    for (var i = 0; i < 500; i++) {
    //        for (var j = 0; j < 500; j++) {
    //            if(data[i][j]==undefined)
    //                ctxGrid.fillStyle = "black";
    //            else if(data[i][j]=="t") ctxGrid.fillStyle = "red";
    //            else ctxGrid.fillStyle = "blue";
    //            ctxGrid.fillRect(i,j,1,1);
    //        }
    //    }
    //});
});
})(jQuery);

//Fonctions de debug permettant d'afficher en temps réelle la position de l'accéléromètre à l'écran
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
