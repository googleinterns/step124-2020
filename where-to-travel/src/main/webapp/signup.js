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
  
  signUpForm.addEventListener('submit', function() {
    signUp();
    return false;
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
    // Add user information to the real time database in Firebase
    let ref = irebase.database().ref('users/' + firebase.auth().currentUser.uid );
    let data = {
      name: name,
      email: emailSignUp.value,    
      uID: firebase.auth().currentUser.uid
    };
    ref.set(data)
      .then(_ => $('#signUp-modal').modal('hide'))
      .catch(e => {console.log(e.message); alert(e.message);});
  });
}
