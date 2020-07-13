
// Get elements for authentication
const emailSignUp = document.getElementById('emailSignUp');
const passwordSignUp = document.getElementById('passwordSignUp');
const passwordConfirmation = document.getElementById('passwordConfirmation');
const btnSignUp = document.getElementById('signUp');

// Preferred method of material form behavior interaction is jQuery
// When the document is loaded, add validity check to form on submit.
$(document).ready(function() {
    $('#signUpForm').submit(function() {
      // if form is invalid, stop event
      if (!passwordConfirmation.validity.valid) {
        event.preventDefault();
        event.stopPropagation();
      } else {
        signUp();
        // send to home page
        window.location.href = 'index.html';
      }
      $('#signUpForm').addClass('was-validated');
    });
});

function validatePassword(){
  if(passwordSignUp.value != passwordConfirmation.value) {
    passwordConfirmation.setCustomValidity('x');
  } else {
    passwordConfirmation.setCustomValidity('');
  }
}

passwordSignUp.onchange = validatePassword;
passwordConfirmation.onkeyup = validatePassword;



// Add signup event
function signUp() {
  //TODO: Check for real emails
  const email = emailSignUp.value;
  const pass = passwordSignUp.value;
  const auth = firebase.auth();

  // Sign up
  const promise = auth.createUserWithEmailAndPassword(email, pass);
  promise.catch(e => console.log(e.message));
}
