/**
 * Populates display with places returned by a query. First, adds pins to the map. Then, adds
 * cards to the location card scroller in the DOM.
 *
 * @param {array} placeArray Array of Google Maps Place Objects
 */
// function displaySaved() {
//   let ref = firebase.database().ref('users/' + tPYO5KQJsbPnQseiaDFh6yGyg3b2 + '/' + 'places' + '/' + 'Paint Pots')
//   // Import Admin SDK
//   var admin = require("firebase-admin");

//   // Get a database reference to our posts
//   var db = admin.database();
//   var ref = db.ref("server/saving-data/fireblog/posts");

//   // Attach an asynchronous callback to read the data at our posts reference
//   ref.on("value", function(snapshot) {
//     console.log(snapshot.val());
//   }, function (errorObject) {
//   console.log("The read failed: " + errorObject.code);
// });
// }
  
//   for(place of placeArray) {
//     // marker creation
//     let placeMarker = new google.maps.Marker({
//       position: place.geometry.location,
//       map: map,
//       title: place.name,
//       icon: PIN_PATH,
//     });

//     const htmlContent = getLocationCardHtml(place);

//     // For the material bootstrap library, the preferred method of dom interaction is jquery,
//     // especially for adding elements.
//     let cardElement = $(htmlContent).click(function(event) {
//       if(event.target.nodeName != 'SPAN') {
//         toggleFocusOff();
//         selectLocationMarker(place.name);
//         $(this).addClass('active-card');
//        focusedCard = this;
//       }
//     });
//     $('#' + SCROLL_ID).append(cardElement);

//     // Add events to focus card and pin
//     placeMarker.addListener('click', function () {
//       toggleFocusOff();
//       focusedPin = placeMarker;
//       selectLocationCard(placeMarker.getTitle());
//       placeMarker.setIcon(SELECTED_PIN_PATH);
//       focusedCard.scrollIntoView({behavior: 'smooth', block: 'center'});
//     });

//     placeMarker.addListener('mouseover', function () {
//       placeMarker.setIcon(SELECTED_PIN_PATH);
//     });

//     placeMarker.addListener('mouseout', function () {
//       if (placeMarker != focusedPin) {
//         placeMarker.setIcon(PIN_PATH);
//       }
//     });

//     markers.push(placeMarker);
//   }

//   document.getElementById(SCROLL_ID).hidden = false;

//   // Handle favoriting a place
//   $('.icon').click(function() {
//     $(this).toggleClass('press');
//     if (firebase.auth().currentUser && $(this).hasClass('press')) {
//       const name = $(this).parent().parent().parent().attr('placeName');
//       const link = $(this).parent().next().attr('href');
//       const time = $(this).parent().next().next().text();
//        // Add users saved places to the real time database in Firebase when star is pressed
//       const database = firebase.database();
//       var uID = firebase.auth().currentUser.uid;
//       var ref = database.ref('users/' + uID + '/' + 'places' + '/' + name);
//       var data = {
//         name: name,
//         link: link,
//         time: time,
//       }
//       ref.set(data);
//     } else if (firebase.auth().currentUser && (!$(this).hasClass('press'))) {
//       const name = $(this).parent().parent().parent().attr('placeName');
//        // Delete user saved places when the star is not pressed
//       var ref = firebase.database().ref('users/' + firebase.auth().currentUser.uid + '/' + 'places' + '/' + name);
//       ref.remove();
//     }
//   });
// }
