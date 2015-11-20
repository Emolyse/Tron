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
			localStorage.pseudo=document.login.children.pseudo.value;
	    	login();
		});
	} else {

	}

	/** Démarrage de Tron **/
	function login () {
	    io.emit("login",joueur,function(resp) {
			$("div.overlay").fadeOut();
	    });
	}
})(jQuery);