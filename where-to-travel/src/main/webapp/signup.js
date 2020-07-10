// Get elements for authentication
const emailSignUp = document.getElementById('emailSignUp');
const passwordSignUp = document.getElementById('passwordSignUp');
const passwordConfirmation = document.getElementById('passwordConfirmation');
const btnSignUp = document.getElementById('signUp');

// Add signup event
btnSignUp.addEventListener('click', e => {
 
  const email = emailSignUp.value;
  const pass = passwordSignUp.value;
  const passConfirmation = passwordConfirmation.value;
  const auth = firebase.auth();

  if (validate()==false) {
      return;
  } 
  else if(pass != passConfirmation) {
    alert("Your passwords do not match. Please try again.");
  }
  // Password must be at least 6 characters in length
  else if(pass.length < 6) {
    alert("Your password must be at least 6 characters long. Please try again");
  }
  else {
    // Sign up
    const promise = auth.createUserWithEmailAndPassword(email, pass);
    promise.then(e => {
      alert("You have sucessfully signed up!");
      
      // Add user information to the real time database in Firebase
      var database = firebase.database();
      var ref = database.ref('users');
        var data = {
            email: email,    
            uID: auth.currentUser.uid
        }
     ref.push(data);
    });
    promise.catch(e => console.log(e.message), alert(e.message));
  }
});

// Verify that the email address is properly formatted using a regular expression
function validateEmail(email) {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}

function validate() {
  if (validateEmail(emailSignUp.value)) {
    document.getElementById("result").innerHTML= emailSignUp.value + " is a valid email address";
    return true;
  } else {
    document.getElementById("result").innerHTML=emailSignUp.value + " is NOT a valid email address";
    return false;
  }
  return false;
}