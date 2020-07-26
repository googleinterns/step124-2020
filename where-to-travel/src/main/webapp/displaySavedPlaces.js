/**
 * Populates display with places returned by a query. First, adds pins to the map. Then, adds
 * cards to the location card scroller in the DOM.
 *
 * @param {array} placeArray Array of Google Maps Place Objects
 */

function savedPlaces() {
  const placesSnapshot = firebase.database().ref('users/'+ firebase.auth().currentUser.uid + '/' + 'places').once('value', function(placesSnapshot){
    var placeArray = [];
    placesSnapshot.forEach((placesSnapshot) => {
      const place = placesSnapshot.val();
      placeArray.push(place);
    });
    populatePlaces(placeArray);
  });
}

