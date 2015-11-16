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
    "<overlay><form name='login' onsubmit='login()'>" +
    "<input type='text' name='pseudo' placeholder='Pseudo'><input type='submit' value='Jouer'/>"+
    "</form></overlay>");
} else {
    io.emit("login",joueur);
}

