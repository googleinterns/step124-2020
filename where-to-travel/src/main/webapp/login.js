// Get elements for authentication
const emailLogin = document.getElementById('emailLogin');
const passwordLogin = document.getElementById('passwordLogin');
const btnLogin = document.getElementById('login');

// Add login event
btnLogin.addEventListener('click', e => {
  const email = emailLogin.value;
  const pass = passwordLogin.value;
  const auth = firebase.auth();
  
  // Login 
  const promise = auth.signInWithEmailAndPassword(email, pass);
  promise.then(e => {
      alert("You have sucessfully loged in!");

      var database = firebase.database();
var ref = database.ref('users');

var data = {
  name: "Emma",
  email: "emmapaczkowski@gmail.com"
  
}
ref.push(data);
  });
  promise.catch(e => {
    console.log(e.message);
    alert(e.message);
  });
});
