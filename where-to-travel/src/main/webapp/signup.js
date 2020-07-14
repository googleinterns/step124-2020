
// Get elements for authentication
const emailSignUp = document.getElementById('emailSignUp');
const passwordSignUp = document.getElementById('passwordSignUp');
const passwordConfirmation = document.getElementById('passwordConfirmation');
const btnSignUp = document.getElementById('signUp');

'use strict';
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
  
  const email = document.getElementById('emailSignUp');
  email.addEventListener('focusout', function(event) {
    if (event.target.validity.valid === false) {
      event.target.parentNode.classList.add('was-validated');
    }
  });

  const password = document.getElementById('passwordSignUp');
  password.addEventListener('focusout', function(event) {
    if (event.target.validity.valid === false) {
      event.target.parentNode.classList.add('was-validated');
    }
  });

  const confirmPass = document.getElementById('passwordConfirmation');
  confirmPass.addEventListener('focusout', function(event) {
    if (event.target.validity.valid === false) {
      event.target.parentNode.classList.add('was-validated');
    }
  });

  // Fetch all the forms we want to apply custom Bootstrap validation styles to
  var forms = document.getElementsByClassName('needs-validation');
  // Loop over them and prevent submission
  var validation = Array.prototype.filter.call(forms, function(form) {
    form.addEventListener('submit', function(event) {
      if (form.checkValidity() === false) {
        event.preventDefault();
        event.stopPropagation();
      }
      form.classList.add('was-validated');
    }, false);
  });
}, false);


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
