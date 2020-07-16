// Get elements for authentication
const emailLogin = document.getElementById('emailLogin');
const passwordLogin = document.getElementById('passwordLogin');

// Preferred method of material form behavior interaction is jQuery
// When the document is loaded, add validity check to form on submit.
$(document).ready(function() {
  $(document).on('submit', '#loginForm', function() {
    const email = emailLogin.value;
    const pass = passwordLogin.value;
    const auth = firebase.auth();

    const promise = auth.signInWithEmailAndPassword(email, pass); 
    promise
      .then(_ => $('#login-modal').modal('hide'))
      .catch(e => {console.log(e.message); alert(e.message);});

    return false;
  });
});

/** Unhides modal containing signup form */
function showLogin() {
  $('#login-modal').modal({show: true});
}

// Clear all input to form once modal is closed
$('#login-modal').on('hidden.bs.modal', function(){
    $(this).find('form')[0].reset();
});