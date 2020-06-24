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

function createMap() {
  map = new google.maps.Map(
    document.getElementById("map-container"),
    {center: {lat: 36.150813, lng: -40.352239}, zoom: 2});
}

function findPlaces() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(queryPlaces);
  } else {
    alert("Geolocation is not supported by this browser.");
  }
}


function queryPlaces(position) {
  //const userLat = position.coords.latitude;
  //const userLong = position.coords.longitude;
  
  const userLat = 37.926916;
  const userLong = -98.981257;

  const latSpread = 1
  const longSpread = 2

  queryDirection(userLat - latSpread, userLong); // West
  queryDirection(userLat, userLong + longSpread); // North
  queryDirection(userLat + latSpread, userLong); // East
  queryDirection(userLat, userLong - longSpread); // South

}

function queryDirection(lat, lng) {
  const sw = new google.maps.LatLng(lat - .4, lng - 4);
  const ne = new google.maps.LatLng(lat + .4, lng + 4); 

  const boundBox = new google.maps.LatLngBounds(sw, ne);

  const request = {
    query: 'Tourist Attractions', 
    bounds: boundBox
  };

  service = new google.maps.places.PlacesService(map);
  service.textSearch(request, callback);
}

function callback(results, status, pagination) {
  if (status == google.maps.places.PlacesServiceStatus.OK) {
    

    for (result of results) {
      if (result.business_status == 'OPERATIONAL') {
        createMarker(result)
      }
    }

    if (pagination.hasNextPage) {
      pagination.nextPage()
    }

  }
}

function createMarker(place) {
  const marker = new google.maps.Marker({
    map: map,
    title: place.name,
    position: place.geometry.location
  });

  const infoWindow = new google.maps.InfoWindow({content: place.name});

  marker.addListener("click", () => {infoWindow.open(map, marker)});
}
