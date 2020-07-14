// Get elements for authentication
const emailSignUp = document.getElementById('emailSignUp');
const passwordSignUp = document.getElementById('passwordSignUp');
const passwordConfirmation = document.getElementById('passwordConfirmation');

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
signUp = () => {
  const promise = firebase.auth().createUserWithEmailAndPassword(emailSignUp.value, passwordSignUp.value);
    promise.then(e => {
      alert("You have sucessfully signed up!");
      
      // Add user information to the real time database in Firebase
      let ref = firebase.database().ref('users');
      let data = {
        email: emailSignUp.value,    
        uID: firebase.auth().currentUser.uid
      }
      ref.push(data);
    }).catch(e => {console.log(e.message); alert(e.message);}); 
  }


