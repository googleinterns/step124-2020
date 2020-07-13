// Get elements for authentication
const emailSignUp = document.getElementById('emailSignUp');
const passwordSignUp = document.getElementById('passwordSignUp');
const passwordConfirmation = document.getElementById('passwordConfirmation');
const btnSignUp = document.getElementById('signUp');

// Add signup event
btnSignUp.addEventListener('click', e => {
  if (validate()==false) {
    return;
  } else if(passwordSignUp.value != passwordConfirmation.value) {
    alert("Your passwords do not match. Please try again.");
  } else if(passwordSignUp.value.length < 6) {
    alert("Your password must be at least 6 characters long. Please try again");
  } else {
    // Sign up
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
    });
    promise.catch(e => console.log(e.message), alert(e.message));
  }
});

// Verify that the email address is properly formatted using a regular expression.
// A valid email is a string (a subset of ASCII characters) separated into two parts by an @ symbol. 
// The two parts being personal_info and a domain, that is personal_info@domain. 
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