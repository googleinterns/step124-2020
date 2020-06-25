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
 
let map;

/* Creates initial map */
function createMap() {
  map = new google.maps.Map(
    document.getElementById("map-container"),
    {center: {lat: 36.150813, lng: -40.352239}, zoom: 2});
}

/** 
 * Obtains user location if they give permission otherwise asks
 * for address from user before  querying Places API for locations
 * that fall within time provided by user.
 *
 * @param {string} time Amount of travel time requested by user
 */
function findPlaces(time) {
  function success(position) {
    queryPlaces(position, time);
  }

  function error() {
    queryFromInputLocation(time);
  }

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(success, error);
  } else {
    queryFromInputLocation(time);
  }
}

/** 
 * If browser does not support geolocation or user does not provide permissions,
 * asks user to input address and utilizes Geocoding API to convert address to
 * latitude and longitude. User will be prompted until they provide a valid address.
 * 
 * @param {string} time Amount of travel time requested by user
 */
function queryFromInputLocation(time) {
  const address = prompt("Please enter a valid address as your start location.");
  if (address == null || address == "") {
    queryFromInputLocation(time);
  }
 
  const geocoder = new google.maps.Geocoder();
  geocoder.geocode({'address': address}, function(results, status) {
    if (status == 'OK') {
      const lat = results[0].geometry.location.lat;
      const lng = results[0].geometry.location.lng;
      const position = {coords: {latitude: lat() , longitude: lng()}};

      queryPlaces(position, time);
    } else {
      queryFromInputLocation(time);
    }
  });

}

/** 
 * Finds places centered around user's position and passes to filter function
 * to return places that are close to travel time requested by user. Uses four
 * bounding boxes that lie north, south, east, and west of the user's location.
 *
 * @param {object} position Contains user's latitude and longitude
 * @param {string} time Amount of travel time requested by user
 */
async function queryPlaces(position, time) {
  //const userLat = position.coords.latitude;
  //const userLng = position.coords.longitude;
  
  // Center of Kansas
  const userLat = 37.926916;
  const userLng = -98.981257;

  const userLocation = new google.maps.LatLng(userLat, userLng);
  
  // These spread the search area for the four bounding boxes
  const latSpread = 2
  const lngSpread = 8

  let place_candidates = [];
  place_candidates = await queryDirection(userLat - latSpread, userLng, place_candidates); // West
  place_candidates = await queryDirection(userLat, userLng + lngSpread, place_candidates); // North
  place_candidates = await queryDirection(userLat + latSpread, userLng, place_candidates); // East
  place_candidates = await queryDirection(userLat, userLng - lngSpread, place_candidates); // South

  return filterByDistance(time, place_candidates, userLocation);
}

/** 
 * Finds places constrained to bounding box centered at provided latitude and longitude.
 * Adds all places with operational business status to array of place candidates.
 *
 * @param {number} lat Bounding box center latitude
 * @param {number} lng Bounding box center longitude
 * @param {array} place_candidates Array of place objects
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

/**
* Creates marker from place object to display on map 
*
* @param {object} place Place object containing name and location 
*/
function createMarker(place) {
  const marker = new google.maps.Marker({
    map: map,
    title: place.name,
    position: place.geometry.location
  });

  const infoWindow = new google.maps.InfoWindow({content: place.name});

  marker.addListener("click", () => {infoWindow.open(map, marker)});
}

function filterByDistance(time, place_candidates, userLocation) {
    return;
}
