var joueur = {
    pseudo:localStorage.pseudo
};
var motoPath = '/client/img/motos/moto_';
var motosFiles = ['blue.png', 'green.png', 'greenblue.png', 'greyblue.png', 'orange.png', 'pink.png', 'purple.png', 'red.png', 'violet.png', 'yellow.png'];

var playersData;


(function($) {
    console.log("je suis debile");
$(document).ready(function() {

	io = io.connect();
    io.emit("newclient",joueur, function (resp) {
        loadLoginOverlay(resp);
    });
    /****************************************
     *       DIALOGUE Client/Server         *
     ****************************************/
    ////////////    LOGIN   /////////////////
    function loadLoginOverlay(loginData,callback){
        //On créé la sélection de motos disponibles
        var motoElements="";
        for(var i=0;i<loginData.availableMotos.length;i++){
            motoElements+="<img src="+motoPath+motosFiles[loginData.availableMotos[i]]+" data-moto-id="+loginData.availableMotos[i]+">";
        }
        //On vérifie si le joueur a un pseudo disponible
        var pseudoElement;
        if(loginData.availablePseudo){
            pseudoElement = "<h1>Bonjour "+joueur.pseudo+" !</h1>";
        } else {
            joueur.pseudo = undefined;
            pseudoElement = "<input id='pseudoLogin' type='text' name='pseudo' placeholder='Pseudo'>";
        }
        document.body.innerHTML += "" +
            "<div class='overlay'>" +
            "<div id='motoSelector'>"+motoElements+"</div>"+
            "<form id='formLogin' name='login' onsubmit='return false;'>" + pseudoElement +
            "<input id='loginBTN' name='submit' type='submit' value='Jouer'/>"+
            "</form></div>";
        //On écoute si une moto est sélectionnée par un autre joueur
        io.on("motoUnvailable", function (data) {
            //Si un autre joueur a sélectionné une moto on la supprime de la liste
        });

        //On effectue le traitement du clic sur Joueur
        $("#formLogin").submit(function(e) {
            e.preventDefault();
            if(!joueur.pseudo) {
                var pseudo = document.login.children.pseudo.value;
                //On vérifie si le pseudo est disponible si il est dispo le serveur le valide
                io.emit('availablePseudo',joueur.pseudo, function (resp) {
                    if(resp){
                        localStorage.pseudo = pseudo;
                        joueur.pseudo = pseudo;
                        if(!joueur.moto){
                            $('#pseudoLogin').fadeOut("fast", function () {
                                this.remove();
                                $('#formLogin').prepend("<h1>Bonjour "+joueur.pseudo+" ! Choisis une moto.</h1>");
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
            if(joueur.pseudo && joueur.moto){
                login();
                callback();
            }
        });
    }


	/** Démarrage de Tron **/
	function login () {
        //Une fois les données reccueillie on signal au serveur que notre profil peut etre créé
	    io.emit("login",joueur,function(resp) {
            if(resp.error){//Si on a un conflit concernant les paramètre de log (un log simultané de 2 joueurs avec le meme pseudo/moto

            }else{
                //On fait disparaitre l'overlay
			    var overlay = $("div.overlay");
                if(overlay.is(":visible")){
                    overlay.animate({height:0},400,null, overlay.remove);
                }

            }
			if(resp){
				var profil = $("<div id=profil>"
					+"Bonjour "+joueur.pseudo
					+"</div>");
				$("body").append(profil);
			}
	    });
	}

    ////////////    INGAME   /////////////////
    document.addEventListener('keyup', function(e) {
        if ((e.keyCode || e.which) == 38) {
            console.log("haut");
            direction("haut");
        }
        if ((e.keyCode || e.which) == 40) {
            console.log("bas");
            direction("bas");
        }
        if ((e.keyCode || e.which) == 39) {
            console.log("droite");
            direction("droite");
        }
        if ((e.keyCode || e.which) == 37) {
            console.log("gauche");
            direction("gauche");
        }
    }, true);

    function direction(dir){

        io.emit("direction",joueur,function(resp) {
        });
    }

    // Tableau de position des motos sur le client ET sur le serveur
    // sur le serveur on a une fonction avec un set interval qui renverra le tableau des positions des motos à tous les clients pour les mettre a jour

});
})(jQuery);
