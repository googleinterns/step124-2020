// Get elements for authentication
const emailLogin = document.getElementById('emailLogin');
const passwordLogin = document.getElementById('passwordLogin');
const btnLogin = document.getElementById('login');
//const btnLogout = document.getElementById('logout');

// Add login event
btnLogin.addEventListener('click', e => {
  const email = emailLogin.value;
  const pass = passwordLogin.value;
  const auth = firebase.auth();
  
  // Login 
  const promise = auth.signInWithEmailAndPAssword(email, pass);
  promise.catch(e => console.log(e.message));
});
