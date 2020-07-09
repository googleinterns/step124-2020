// Get elements for authentication
const emailSignUp = document.getElementById('emailSignUp');
const passwordSignUp = document.getElementById('passwordSignUp');
const passwordConfirmation = document.getElementById('passwordConfirmation');
const btnSignUp = document.getElementById('signUp');

// Add signup event
btnSignUp.addEventListener('click', e => {
  //TODO: Check for real emails
  const email = emailSignUp.value;
  const pass = passwordSignUp.value;
  const passConfirmation = passwordConfirmation.value;
  const auth = firebase.auth();

  if(pass != passConfirmation) {
    alert("Your passwords do not match. Please try again.");
  }
  // Passwords must be at least 6 characters in length
  else if(pass.length < 6) {
    alert("Your password must be at least 6 characters long. Please try again");
  }
  else {
    // Sign up
    const promise = auth.createUserWithEmailAndPassword(email, pass);
    promise.then(e => {
      alert("You have sucessfully signed up!")
    });
    promise.catch(e => console.log(e.message));
  }
});