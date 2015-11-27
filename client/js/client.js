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
				joueur = pseudo;
	    		login();
			}
		});
	} else {
		login();
	}



	/** Démarrage de Tron **/
	function login () {
	    io.emit("login",joueur,function(resp) {
	    	if($("div.overlay").is(":visible")){
				$("div.overlay").fadeOut();
				console.log(resp);
	    	}
			if(resp.resp){
				var profil = $("<div id=profil>"
					+"Bonjour "+joueur
					+"</div>");
				$("body").append(profil);
			}
	    });
	}

    /** Evénements du joueur **/
    document.addEventListener('keyup', function(evt){
        if((evt.keyCode >= 37 && evt.keyCode <= 40) || (evt.which >= 37 && evt.which <= 40)){
            var data = {joueur:joueur, keycode:evt.which};
            io.emit('changeDir', data, function(resp){
                console.log(resp);
            });
        }
    });

    /** Récupération des infos d'un joueur **/
    io.on('changeDir', function(data) {
        console.log('data : '+data);
    });

    // Tableau de position des motos sur le client ET sur le serveur
    // sur le serveur on a une fonction avec un set interval qui renverra le tableau des positions des motos à tous les clients pour les mettre a jour

})(jQuery);
