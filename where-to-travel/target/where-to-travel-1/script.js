// This is map stylings for the GMap api
const mapStyles = [
  {
    featureType: 'landscape',
    stylers: [
      {
        visibility: 'off'
      }
    ]
  },
  {
    featureType: 'poi',
    elementType: 'labels.icon',
    stylers: [
      {
        visibility: 'off'
      }
    ]
  },
  {
    featureType: 'transit',
    stylers: [
      {
        visibility: 'off'
      }
    ]
  }
];
// End map stylings

let open = false;
// Need to blur header and blur mapwrap
function openNav() {
  document.getElementById('sidenav').style.width = '250px';
  document.getElementById('main').style.marginLeft = '250px';
  document.body.style.backgroundColor = 'rgba(0,0,0,0.4)';
  mapOverlay = document.getElementById('over_map');
  mapOverlay.style.zIndex = '5';
  mapOverlay.style.transition = 'background-color .5s';
  mapOverlay.style.backgroundColor = 'rgba(0,0,0,0.4)';
  open = true;
}

function closeNav() {
  document.getElementById('sidenav').style.width = '0';
  document.getElementById('main').style.marginLeft = '0';
  document.body.style.backgroundColor = 'white';
  mapOverlay = document.getElementById('over_map');
  mapOverlay.style.transition = 'background-color .5s';
  mapOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0)';
  open = false;
  mapOverlay.addEventListener('transitionend', (event) => {
    if (!open) {
      event.target.style.zIndex = '-1';
    }
  });
}

const submitId = 'submit';
const hoursId = 'hrs';
const minutesId = 'mnts';

let map;
let home = null;

const markers = [];

// Add gmap js library to head of page
const script = document.createElement('script');
script.src =
  'https://maps.googleapis.com/maps/api/js?key=' +
  secrets['googleMapsKey'] +
  '&libraries=places';
script.defer = true;
script.async = true;

document.head.appendChild(script);

/** Initializes map window, runs on load. */
async function initialize() {
  const submit = document.getElementById(submitId);
  submit.addEventListener('click', submitDataListener);
  home = await getUserLocation();
  const mapOptions = {
    center: home,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    zoom: 16,
    mapTypeControl: false,
    styles: mapStyles,
  };

  map = new google.maps.Map(document.getElementById('map'), mapOptions);

  let homeMarker = new google.maps.Marker({
    position: home,
    icon: 'icons/home.svg',
    map: map,
    title: 'Home',
  });
}

/**
 * Responds to click on submit button by getting places and placing pins.
 *
 * @param {Event} event Click event from which to respond
 */
function submitDataListener(event) {
  const hours = document.getElementById(hoursId).value;
  const minutes = document.getElementById(minutesId).value;
  const timeObj = { hours: hours, minutes: minutes };
  getPlacesFromTime(timeObj).then(places => {
    clearPlaces();
    populatePlaces(places);
  });
}

/**
 * Populates map with pins. Given a list of places, put markers at each
 * lat/long location.
 *
 * @param {array} placeArray array of places to place markers at
 */
function populatePlaces(placeArray) {
  let i;
  for (i = 0; i < placeArray.length; i++) {
    let name = placeArray[i].name;
    let coordinates = placeArray[i].geometry.location;
    let placeMarker = new google.maps.Marker({
      position: coordinates,
      map: map,
      title: name,
      icon: 'icons/pin.svg',
    });

    let infowindow = new google.maps.InfoWindow({
      content: name,
    });

    placeMarker.addListener('click', function () {
      infowindow.open(map, placeMarker);
    });

    markers.push(placeMarker);
  }
}

/** Clears all markers on map except for home marker. */
function clearPlaces() {
  for (marker of markers) {
    marker.setMap(null);
  }
}

/**
 * If browser supports geolocation and user provides permissions, obtains user's
 * latitude and longitude. Otherwise, asks user to input address and converts input
 * to latitude and longitude.
 *
 * @return {Object} Contains latitude and longitude corresponding to user's location
 */
function getUserLocation() {
  return new Promise(function (resolve, reject) {
    function success(position) {
      return resolve({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    }

    function error() {
      return resolve(getLocationFromUserInput());
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(success, error);
    } else {
      return resolve(getLocationFromUserInput());
    }
  });
}

/**
 * If browser does not support geolocation or user does not provide permissions,
 * asks user to input address and utilizes Geocoding API to convert address to
 * latitude and longitude. User will be prompted until they provide a valid address.
 *
 * @return {Object} Contains latitude and longitude corresponding to input address
 */
function getLocationFromUserInput() {
  return new Promise(function(resolve, reject) {
    const address = prompt('Please enter a valid address as your start location.');
    if (address == null || address == '') {
      return resolve(getLocationFromUserInput());
    }

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({address: address}, function(results, status) {
      if (status == 'OK') {
        const lat = results[0].geometry.location.lat;
        const lng = results[0].geometry.location.lng;
        return resolve({ lat: lat(), lng: lng() });
      } else {
        return resolve(getLocationFromUserInput());
      }
    });
  });
}

/**
 * Finds places centered around user's position and passes to filter function
 * to return places that are close to travel time requested by user. Uses four
 * bounding boxes that lie north, south, east, and west of user's location.
 *
 * @param {Object} timeObj Travel time requested by user in hours and minutes
 * @return {Promise} An array promise of places that lie within time requested
 */
async function getPlacesFromTime(timeObj) {
  const userLat = home.lat;
  const userLng = home.lng;

  // These spread the search area for the four bounding boxes
  const latSpread = 4;
  const lngSpread = 4;

  let place_candidates = [];

  place_candidates = await addPlacesFromDirection(userLat, userLng + lngSpread, place_candidates); // East
  place_candidates = await addPlacesFromDirection(userLat + latSpread, userLng, place_candidates); // North
  place_candidates = await addPlacesFromDirection(userLat, userLng - lngSpread, place_candidates); // West
  place_candidates = await addPlacesFromDirection(userLat - latSpread, userLng, place_candidates); // South

  return filterByDistance(timeObj, place_candidates);
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
function addPlacesFromDirection(lat, lng, place_candidates) {
  return new Promise(function (resolve) {
    const halfWidth = 0.5;
    const halfHeight = 0.5;

    const sw = new google.maps.LatLng(lat - halfWidth, lng - halfHeight);
    const ne = new google.maps.LatLng(lat + halfWidth, lng + halfHeight);

    const boundBox = new google.maps.LatLngBounds(sw, ne);

    const request = {
      query: 'Tourist Attractions',
      bounds: boundBox,
    };

    function callback(results, status) {
      if (status == google.maps.places.PlacesServiceStatus.OK) {
        for (result of results) {
          if (result.business_status == 'OPERATIONAL') {
            place_candidates.push(result);
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
 * Filter through tourist attractions to find which are in the given time frame of the user.
 *
 * @param {number} time How much time the user wants to travel for
 * @param {array} listPlaces Array of place objects
 * @return {array} An array of places objects that are in the given time frame
 */
function filterByDistance(timeObj, listPlaces) {
  return new Promise(function (resolve) {
    const userLocation = new google.maps.LatLng(home.lat, home.lng);
    let userDestinations = [];
    let acceptablePlaces = [];

    const time = timeObj.hours * 3600 + timeObj.minutes * 60;

    // iterate through listPlaces and to get all the destinations
    let i;
    for (i = 0; i < 25; i++) {
      const lat = listPlaces[i].geometry.location.lat();
      const lng = listPlaces[i].geometry.location.lng();
      const destination = new google.maps.LatLng(lat, lng);
      userDestinations.push(destination);
    }

    let service = new google.maps.DistanceMatrixService();
    service.getDistanceMatrix(
      {
        origins: [userLocation],
        destinations: userDestinations,
        travelMode: 'DRIVING',
        unitSystem: google.maps.UnitSystem.IMPERIAL,
      },
      callback
    );

    function callback(response, status) {
      if (status === 'OK') {
        const origins = response.originAddresses;
        let i;
        for (i = 0; i < origins.length; i++) {
          const results = response.rows[i].elements;
          let j;
          for (j = 0; j < results.length; j++) {
            const element = results[j];
            if (element.status === 'OK') {
              // Check if the time is within the +- 30 min = 1800 sec range
              if (element.duration.value < time + 1800 && element.duration.value > time - 1800) {
                acceptablePlaces.push({
                  name: listPlaces[j].name,
                  geometry: listPlaces[j].geometry,
                  timeInSeconds: element.duration.value,
                  timeAsString: element.duration.text
                });
              }
            }
          }
        }
      }
      resolve(acceptablePlaces);
    }
  });
}