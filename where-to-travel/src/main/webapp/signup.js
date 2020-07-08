
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
  const auth = firebase.auth();

  // Sign up
  const promise = auth.createUserWithEmailAndPassword(email, pass);
  promise.catch(e => console.log(e.message));
});
