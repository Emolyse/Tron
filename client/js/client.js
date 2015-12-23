var initGamma =false,initBeta=0;
var joueur = {
    pseudo:localStorage.pseudo
};
initedMoto = false;

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

var lastDataMsg = {pseudo:""};

/* Variables de l'initialisation du canvas */
var ctx;
var canvas;
var canvasSize;
var marginCanvas = 10;


/*****************************
 *        Event handlers     *
 *****************************/
 function motoSelector (target) {
    joueur.moto = $(target).data("motoId");
    $("#motoSelector>img.selected").removeClass("selected");
    $(target).addClass("selected");
 }

(function($) {
$(document).ready(function() {

	io = io.connect();
    io.emit("newclient",joueur, function (resp) {
        loadLoginOverlay(resp);
    });

    $(window).unload(function(){
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
        io.on("motoUnavailable", function (data) {
            //Si un autre joueur a sélectionné une moto on la supprime de la liste
            $("#loginMoto"+data.moto).remove();
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

    /** Démarrage de Tron **/
    function login() {
        //Une fois les données reccueillie on signal au serveur que notre profil peut etre créé
        io.emit("login", joueur, function (resp) {
            if (resp.error) {//Si on a un conflit concernant les paramètre de log (un log simultané de 2 joueurs avec le meme pseudo/moto

            } else {
                io.removeListener('motoUnavailable');
                io.removeListener('motoAvailable');
                //On fait disparaitre l'overlay
                var $overlay = $("div.overlay");
                if ($overlay.is(":visible")) {
                    $overlay.animate({height: 0}, 400, null, function () {
                        $overlay.remove();
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
    ////////////    INIT GAME ////////////////
    function loadGame(){
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

        $( window ).resize(resizeHaandler);

        //Quand on initialise la partie on charge l'ensemble des évenements qui peuvent survenir pendant la partie
        io.on("initialisation",function (data) { // Une partie commence
            //On charge l'ensemble des motos
            console.log("initialisation");
            regenerateMotos(deNormalizeAll(data), function () {
                drawPlayers(deNormalizeAll(data), function () {
                    //A chaque itération on met à jour le plateau
                    io.on("iteration",function(data){
                        drawPlayers(deNormalizeAll(data));
                    });
                });
                //Si un joueur arrive dans la partie on ajoute sa moto
                io.on("newPlayer", function (player) {
                    console.log("newplayer",player);
                    player = deNormalizePlayer(player);
                    addMoto(player);
                });

                //Si un joueur quitte la partie on supprime sa moto
                io.on("removePlayer", function (player) {
                    removeMoto(player);
                });
                //Lorsque la partie commence en charge le controle utilisateur
                io.on('start', function(){
                    console.log("start");
                    window.addEventListener('deviceorientation', orientationHandler,true);
                    initVirtualControl();
                    document.addEventListener('keydown', controlKeyHandler);
                    //On supprime tous les listeners liés à la partie lorsqu'elle se termine
                    io.on("end", function () {
                        io.removeListener("iteration");
                        io.removeListener("newPlayer");
                        io.removeListener("removePlayer");
                        window.removeEventListener('deviceorientation',orientationHandler);
                        window.removeEventListener('keydown',controlKeyHandler);
                        $(".fleches").remove();
                    });
                });
            });
        });
        io.emit("ready",joueur);

    }


    ////////////   CONTROLS  /////////////////
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
    function initVirtualControl(){
        //Sur les mobiles on ajoute des touches tactiles virtuelles
        if( navigator.userAgent.match(/Android/i) || navigator.userAgent.match(/webOS/i)
            || navigator.userAgent.match(/iPhone/i) || navigator.userAgent.match(/iPad/i)
            || navigator.userAgent.match(/iPod/i) || navigator.userAgent.match(/BlackBerry/i)
            || navigator.userAgent.match(/Windows Phone/i)
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

    ////////////    INGAME   /////////////////



    /****************************************
     *       DESSINS DES TRACES ET MOTOS    *
     ****************************************/
    /*On parcourt les donnees envoyees par le serveur pour dessiner les joueurs*/
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
     * @param x nouvelle position horizontale de la moto
     * @param y nouvelle position verticale de la moto
     * @param currentmoto élément js de la moto
     * @param direction de la moto
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
     *       FONCTIONS UTILES               *
     ****************************************/

    /*Redimentionne le canvas quand la taille de la fenêtre change*/
    function resizeHaandler() {
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
     * @description Convertit les coordonnées du jeu de données normalisé en position adaptées à l'écran
     * @param data jeu de données normalisé
     * @return {Object} jeu de données dénormalisé
     */
    function deNormalizeAll(data){
        var playersData = jQuery.extend(true, {}, data);
        $.each(playersData.players, function(i) {
            playersData.players[i] = deNormalizePlayer(playersData.players[i])
        });
        return playersData;
    }

    /**
     * @name removeMoto
     * @description supprime l'élément moto d'un joueur
     * @param player
     */
    function removeMoto(player){
        $("#moto"+player.moto).remove();
    }

    /**
     * @name addMoto
     * @description crée l'élément moto d'un joueur et l'ajoute au plateau
     * @param player
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
        return true;
    }

    /**
     * @name regenerateMoto
     * @description supprime et réinsère tous les éléments moto des joueurs en jeu
     * @param playersData
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
     *                 SCORE                *
     ****************************************/
    function loadScore(){
        var score = document.createElement("section");
        score.id = "score";

    }

    /****************************************
     *                  CHAT                *
     ****************************************/
    function getMessageElement(data,perso){

        var message = document.createElement("div");
        if(data.pseudo == "server"){
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

    function loadChat(){
        io.on('chat', function (data) {
            addMessageElt(data,false)
        });
        var chat = document.createElement("form");
        chat.id = "chat";
        chat.innerHTML = '<section class="msg-container"></section>' +
            '<section class="input-container">' +
            '<input type="text" id="input-msg">' +
            '<input type="submit" id="submit-msg" value=">">' +
            '</section>';
        document.querySelector("main").appendChild(chat);
        chat.addEventListener('submit',function (e) {
            e.preventDefault();
            var date = new Date();
            var heure = date.getHours();
            var min   = date.getMinutes();
            var sec   = date.getSeconds();
            date = (heure<10?"0":"")+heure+":"+(min<10?"0":"")+min+":"+(sec<10?"0":"")+sec;
            var data = {pseudo:joueur.pseudo,msg:$("#input-msg").val(),date:date,color:motos[joueur.moto].color};
            if(data.msg.length>0){
                $("#input-msg").val("");
                io.emit('chat',data,function(rep){
                    if(rep.error){
                        //Indiquer un problème (ex : flood)
                    } else {
                        addMessageElt(data,true);
                    }
                });
            }
        });
    }

    //Fonction de debug qui affiche la grille de collision envoyée par le serveur
    //io.on("drawGrid", function (data) {
    //    var canGrid = document.createElement("canvas");
    //    canGrid.id = "truc";
    //    canGrid.width = 500;
    //    canGrid.height = 500;
    //    canGrid.style.position = "fixed";
    //    canGrid.style.top = 0;
    //    canGrid.style.left = 0;
    //    canGrid.style.backgroundColor= "#fff";
    //    document.body.appendChild(canGrid);
    //    var ctxGrid = canGrid.getContext('2d');
    //    console.log(data);
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

    // Tableau de position des motos sur le client ET sur le serveur
    // sur le serveur on a une fonction avec un set interval qui renverra le tableau des positions des motos à tous les
    // clients pour les mettre a jour
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
