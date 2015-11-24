/**
 * Created by Rémy on 13/11/2015.
 */

(function($) {
	io = io.connect();
	/** Identification du joueur**/
	var joueur = localStorage.pseudo;

	if(!joueur){
	    document.body.innerHTML += "" +
	    "<div class='overlay'><form class='formLogin' name='login' action='#'>" +
	    "<input type='text' name='pseudo' placeholder='Pseudo'><input name='submit' type='button' value='Jouer'/>"+
	    "</form></div>";

	    document.login.children.submit.addEventListener("click",function(e) {
			e.preventDefault();
			var pseudo = document.login.children.pseudo.value;
			if(pseudo && pseudo!=""){
				localStorage.pseudo=pseudo;
	    		login();
			}
		});
	} else {

	}

	/** Démarrage de Tron **/
	function login () {
	    io.emit("login",joueur,function(resp) {
			$("div.overlay").fadeOut();
	    });
	}

    /** Evénements du joueur **/
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


})(jQuery);
