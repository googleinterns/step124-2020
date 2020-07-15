// Get elements for authentication
const nameSignUp = document.getElementById('nameSignUp')
const emailSignUp = document.getElementById('emailSignUp');
const passwordSignUp = document.getElementById('passwordSignUp');
const passwordConfirmation = document.getElementById('passwordConfirmation');
const name = document.getElementById('nameSignUp');

// Preferred method of material form behavior interaction is jQuery
// When the document is loaded, add validity check to form on submit.
$(document).ready(function() {
    $('#submit').click(function() {
      // if form is invalid, stop event
      if (!passwordConfirmation.validity.valid) {
        event.preventDefault();
        event.stopPropagation();
      } else {
        signUp();
      }
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

signUp = () => {
  // The user will be notified if it is invalid in the validate() function
  const promise = firebase.auth().createUserWithEmailAndPassword(emailSignUp.value, passwordSignUp.value);
  promise.then(e => {
    alert("You have sucessfully signed up!");
    var ref = firebase.database().ref('users/' + firebase.auth().currentUser.uid );
    var data = {
      name: name.value,
      email: emailSignUp.value,    
      uID: firebase.auth().currentUser.uid,
      places: null
    }
    ref.set(data); //.then(_ => window.location.href = 'index.html');
  });
  promise.catch(e => alert.(e.message));
}
