// Get elements for authentication
const emailLogin = document.getElementById('emailLogin');
const passwordLogin = document.getElementById('passwordLogin');

// Preferred method of material form behavior interaction is jQuery
$(document).ready(function() {
  $(document).on('submit', '#loginForm', function() {
    const email = emailLogin.value;
    const password = passwordLogin.value;
    const auth = firebase.auth();

    const promise = auth.signInWithEmailAndPassword(email, password); 
    promise
      .then(_ => $('#login-modal').modal('hide'))
      .catch(e => {console.log(e.message); alert(e.message);});

    return false;
  });
});

/** Unhides modal containing login form */
function showLogin() {
  $('#login-modal').modal('show');
}

/** Clear all input to form once modal is closed */
$('#login-modal').on('hidden.bs.modal', function(){
    $(this).find('form')[0].reset();
});
