var database = firebase.database();
var ref = database.ref('users');

var data = {
  name: "Emma",
  email: "emmapaczkowski@gmail.com"
}
ref.push(data);
