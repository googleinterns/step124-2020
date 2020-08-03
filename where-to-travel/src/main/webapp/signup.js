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
const signUpForm = document.getElementById('signUpForm');
const name = document.getElementById('nameSignUp');

const signUpSubmit = document.getElementById('signUpSubmit');

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

  signUpSubmit.addEventListener('click', () => {
    let validated = true;

    const fields = [nameSignUp, emailSignUp, passwordSignUp, passwordConfirmation]

    // Loop over input fields and check if they are all valid
    for (let field of fields) {
      if (!field.checkValidity()) {
        validated = false;
        break;
      }         
    }

    if (validated) {
      signUp();
    }
    
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


/** Unhides modal containing signup form */
function showSignUp() {
  $('#signUp-modal').modal({show: true});
}

/** Clear all input to form once modal is closed */
$('#signUp-modal').on('hidden.bs.modal', function(){
  $(this).find('form')[0].reset();
});
 
/** Signs up user using Firebase API **/
function signUp() {
  const promise = firebase.auth().createUserWithEmailAndPassword(emailSignUp.value, passwordSignUp.value);
    promise.then(_ => {
      let ref = firebase.database().ref('users/' + firebase.auth().currentUser.uid);
      let data = {
        name: nameSignUp.value,
        email: emailSignUp.value,    
        uID: firebase.auth().currentUser.uid
      };
    ref.set(data)
      .then(_ => $('#signUp-modal').modal('hide'))
      .catch(e => {console.log(e.message); alert(e.message);});
  }).catch(e => {console.log(e.message); alert(e.message);});
}
