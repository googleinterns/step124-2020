/**
 * All javascript that handles the behavior of the sign-up form.
 * Importantly, this file includes all js validation for sign-up fields.
 */

'use strict';
// Get elements for authentication
const nameSignUp = document.getElementById('nameSignUp')
const emailSignUp = document.getElementById('emailSignUp');
const passwordSignUp = document.getElementById('passwordSignUp');
const passwordConfirmation = document.getElementById('passwordConfirmation');
const name = document.getElementById('nameSignUp');

// On window load, attach all validation functions to input elements.
window.addEventListener('load', function() {
  function validatePassword(){
    if(passwordSignUp.value != passwordConfirmation.value) {
      passwordConfirmation.setCustomValidity('x');
    } else {
      passwordConfirmation.setCustomValidity('');
    }
  }

  passwordSignUp.onchange = validatePassword;
  passwordConfirmation.onkeyup = validatePassword;

  addFocusOutEvent(emailSignUp);
  addFocusOutEvent(passwordSignUp);
  addFocusOutEvent(passwordConfirmation);

  // Fetch all the forms we want to apply custom Bootstrap validation styles to
  const forms = document.getElementsByClassName('needs-validation');
  // Loop over them and prevent submission
  const validation = Array.prototype.filter.call(forms, function(form) {
    form.addEventListener('submit', function(event) {
      if (form.checkValidity() === false) {
        event.preventDefault();
        event.stopPropagation();
      }
      form.classList.add('was-validated');
    }, false);
  });
}, false);

/**
 * Attaches a listener to the focusout event for an input element.
 *
 * @param inputElement a DOM input element
 */
function addFocusOutEvent(inputElement) {
  inputElement.addEventListener('focusout', function(event) {
    if (event.target.validity.valid === false) {
      event.target.parentNode.classList.add('was-validated');
    }
  });
}
 
/**
 * Signs user up using the firebase auth API.
 */
function signUp() {
  //TODO: Check for real emails
  const email = emailSignUp.value;
  const pass = passwordSignUp.value;
  const auth = firebase.auth();

  // Sign up
  const promise = auth.createUserWithEmailAndPassword(email, pass);
  promise.catch(e => console.log(e.message));
}