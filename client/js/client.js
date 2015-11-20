/**
 * Created by Rémy on 13/11/2015.
 */

io = io.connect();

/** Identification du joueur**/
var joueur = localStorage['pseudo'];
function login(){
    io.emit("login",document.login.pseudo.value);
}
if(!joueur){
    document.body.append("" +
    "<div class='overlay'><form name='login' class='formLogin' onsubmit='login()'>" +
    "<input type='text' name='pseudo' placeholder='Pseudo'><input type='submit' value='Jouer'/>"+
    "</form></div>");
} else {
    io.emit("login",joueur);
}

