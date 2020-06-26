// Copyright 2019 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
 
 function filterByDistance(time, listPlaces, home) {
  var userLocation = new google.maps.LatLng(home.lat, home.lng)
  var acceptablePlaces = [];
  var userDestinations = [];

  //itterate through listPlaces and to get all the destinations
  for (var i = 0; i < listPlaces.length; i++) {
      let destination = new google.maps.LatLng(listPlaces[i].geometry.location.lat, listPlaces[i].geometry.location.lng)
    userDestinations.push(destination);
  }

  var service = new google.maps.DistanceMatrixService();
  service.getDistanceMatrix({
    origins: [userLocation],
    destinations: userDestinations,
    travelMode: 'DRIVING',
    unitSystem: google.maps.UnitSystem.IMPERIAL,
  }, callback);

  function callback(response, status) {
    if (status == 'OK') {
      var origins = response.originAddresses;
      var destinations = response.destinationAddresses;
     
      //added for testing
        var outputDiv = document.getElementById('output');
            outputDiv.innerHTML = '';

      for (var i = 0; i < origins.length; i++) {
        var results = response.rows[i].elements;
        for (var j = 0; j < results.length; j++) {
          var element = results[j];
          var distance = element.distance.text;
          var duration = element.duration.text;
          var from = origins[i];
          var to = destinations[j];

          //Check if the time is within the +- 30 min = 1800 sec range
          if (element.duration.value < time + 1800 && element.duration.value > time - 1800) {
            acceptablePlaces.push({
              "name": listPlaces[j].name,
              "timeInSeconds": element.duration.value,
              "timeAsString": element.duration.text
            })
          }

          outputDiv.innerHTML += "Origin" + userLocation + ' to ' + destinations[j] +
                    '.  Time in seconds:  ' + element.duration.value + '.  Time as String: ' +
                    results[j].duration.text + '<br>';
        }
      }
    }
  }
  return acceptablePlaces;
}