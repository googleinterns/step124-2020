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
 
/** 
 * If browser supports geolocation and user provides permissions, obtains user's 
 * latitude and longitude. Otherwise, asks user to input address and converts input
 * to latitude and longitude.
 *
 * @return {Object} Contains latitude and longitude corresponding to user's location
 */
function getUserLocation() {
    function success(position) {
    return {lat: position.coords.latitude, lng: position.coords.longitude};
  }

  function error() {
    getLocationFromUserInput();
  }

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(success, error);
  } else {
    getLocationFromUserInput();
  }
}


/** 
 * If browser does not support geolocation or user does not provide permissions,
 * asks user to input address and utilizes Geocoding API to convert address to
 * latitude and longitude. User will be prompted until they provide a valid address.
 *
 * @return {Object} Contains latitude and longitude corresponding to input address
 */
function getLocationFromUserInput() {
  const address = prompt("Please enter a valid address as your start location.");
  if (address == null || address == "") {
    getLocationFromUserInput();
  }
 
  const geocoder = new google.maps.Geocoder();
  geocoder.geocode({'address': address}, function(results, status) {
    if (status == 'OK') {
      const lat = results[0].geometry.location.lat;
      const lng = results[0].geometry.location.lng;
      return {lat: lat() , lng: lng()};  
    } else {
      getLocationFromUserInput();
    }
  });
}

/** 
 * Finds places centered around user's position and passes to filter function
 * to return places that are close to travel time requested by user. Uses four
 * bounding boxes that lie north, south, east, and west of user's location.
 *
 * @param {object} timeObj Travel time requested by user in hours and mins
 */
async function getPlacesFromTime(timeObj) {
  //const userLat = home.lat;
  //const userLng = home.lng;
  
  // Center of Kansas
  const userLat = 37.926916;
  const userLng = -98.981257;

  // These spread the search area for the four bounding boxes
  const latSpread = 2
  const lngSpread = 8

  let place_candidates = [];
  place_candidates = await queryDirection(userLat - latSpread, userLng, place_candidates); // West
  place_candidates = await queryDirection(userLat, userLng + lngSpread, place_candidates); // North
  place_candidates = await queryDirection(userLat + latSpread, userLng, place_candidates); // East
  place_candidates = await queryDirection(userLat, userLng - lngSpread, place_candidates); // South

  // TODO: Call Emma's function to get list of places that are within time 
  // return filterByDistance(timeObj, place_candidates);
}

/** 
 * Finds tourist attractions constrained to bounding box centered at provided latitude
 * and longitude. Adds all places with operational business status to array of place candidates.
 *
 * @param {number} lat Bounding box center latitude
 * @param {number} lng Bounding box center longitude
 * @param {array} place_candidates Array of place objects
 * @return {Promise} An array promise of added place candidates
 */
function queryDirection(lat, lng, place_candidates) {
  return new Promise(function(resolve, reject) {
    const sw = new google.maps.LatLng(lat - .4, lng - 4);
    const ne = new google.maps.LatLng(lat + .4, lng + 4); 

    const boundBox = new google.maps.LatLngBounds(sw, ne);

    const request = {
      query: 'Tourist Attractions', 
      bounds: boundBox
    };

    function callback(results, status) {
      if (status == google.maps.places.PlacesServiceStatus.OK) {
        for (result of results) {
          if (result.business_status == 'OPERATIONAL') {
            place_candidates.push(result);
            createMarker(result)
          }
        }
      }

      resolve(place_candidates);
    }

    service = new google.maps.places.PlacesService(map);
    service.textSearch(request, callback);
  });
}
