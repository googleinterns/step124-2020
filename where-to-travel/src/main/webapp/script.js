// This is map stylings for the GMap api
const MAP_STYLES = [
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

// Thresholds for termination of search algorithm

const PLACES_THRESHOLD = 30;
const ATTEMPTS_THRESHOLD = 10;
const DIRECTION_THRESHOLD = 5;

// Thirty Minutes in seconds
const TIME_THRESHOLD = 1800;

// Document ids for user input elements
const SUBMIT_ID = 'submit';
const HOURS_ID = 'hrs';
const MINUTES_ID = 'mnts';
const SCROLL_ID = 'scroller';
const DASH_ID = 'dashboard';
const PIN_PATH = 'icons/pin.svg';
const SELECTED_PIN_PATH = 'icons/selectedPin.svg';
const HOME_PIN_PATH = 'icons/home.svg';

let map;
let user = false;
let home = null;

let focusedCard;
let focusedPin;

let homeMarker = null;
let markers = [];

let placesService;
let distanceMatrixService;

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
  if (!user) {
    addLoginButtons();
  } else {
    addUserDash();
  }
  const submit = document.getElementById(SUBMIT_ID);
  submit.addEventListener('click', submitDataListener);

  const mapOptions = {
    center: {lat: 36.150813, lng: -40.352239}, // Middle of the North Atlantic Ocean
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    zoom: 4,
    mapTypeControl: false,
    styles: MAP_STYLES,
  };
  map = new google.maps.Map(document.getElementById('map'), mapOptions);

  placesService = new google.maps.places.PlacesService(map);
  distanceMatrixService = new google.maps.DistanceMatrixService();
   
  showInfoModal();
}

/**
 * Populates and opens modal with html content from info.txt that provides
 * description of website to user
 */
function showInfoModal() {
  fetch('info.txt')
    .then(response => response.text())
    .then(content => openModal(content));
}

/**
 * Obtains user's location from either browser or an inputted address and sets home location. If error
 * occurs, message is displayed to user in modal.
 *
 * @param {boolean} useAddress Flag indicating whether to get location from browser or address
 */
function getHomeLocation(useAddress) {
  let locationFunction = () => getLocationFromBrowser();

  if (useAddress) {
    const addressInput = document.getElementById('addressInput').value;
    locationFunction = () => getLocationFromAddress(addressInput);
  }

  locationFunction().then(homeObject => {
    home = homeObject;
    setHomeMarker();
  }).catch(message => {
    const messageContent = '<p>' + message + '</p>';
    openModal(messageContent);
  });
}

/**
 * If browser supports geolocation and user provides location permissions, obtains user's
 * latitude and longitude.
 *
 * @return {Promise} Fulfilled promise is object containing lat/lng and rejected promise
 *                   is string message describing why obtaining the location failed.
 */
function getLocationFromBrowser() {
  return new Promise(function(resolve, reject) {
    function success(position) {
      resolve({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    }

    function deniedAccessUserLocation() {
      reject('Browser does not have permission to access location. ' +
             'Please enable location permissions or enter an address to ' +
             'set a home location.');
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(success, deniedAccessUserLocation);
    } else {
      reject('Browser does not support geolocation. Please enter an ' +
             'address to set a home location.');
    }
  });
}

/**
 * Passes address to Geocoding API to convert to lat/lng.
 *
 * @return {Promise} Fulfilled promise is object containing lat/lng and rejected promise
 *                   is string message describing why obtaining the location failed.
 */
function getLocationFromAddress(address) {
  return new Promise(function(resolve, reject) {
    if (address == null || address == '') {
      reject('Entered address is empty. Please enter a non-empty address and try again.');
    }

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({address: address}, function(results, status) {
      if (status == 'OK') {
        const lat = results[0].geometry.location.lat;
        const lng = results[0].geometry.location.lng;
        resolve({ lat: lat(), lng: lng() });
      } else {
        reject('Entered address is not valid. Please enter a valid address and try again.');
      }
    });
  });
}

/** Places marker at home location. */
function setHomeMarker() {
  if (homeMarker != null) {
    homeMarker.setMap(null);
  }

  if (home != null) {
    homeMarker = new google.maps.Marker({
      position: home,
      icon: 'icons/home.svg',
      map: map,
      title: 'Home',
    });

    map.setCenter(home);
    map.setZoom(7);
  }
}

/**
 * Opens modal containing passed in HTML content in body
 * @param {string} content HTML string of content for modal body
*/
function openModal(content) {
  const modalBody = document.getElementById('modal-body');
  modalBody.innerHTML = content;

  $('#content-modal').modal({
    show: true
  });
  map.addListener('click', toggleFocusOff);
}

function addLoginButtons() {
  const dashElement = $(getLoginHtml());
  $('#' + DASH_ID).append(dashElement);
}

function addUserDash() {
  const dashElement = $(getUserDashHtml(user));
  $('#' + DASH_ID).append(dashElement);
}

/** Toggle the focused pin/card off */
function toggleFocusOff() {
  if(focusedCard != null) {
    focusedCard.classList.remove('active-card');
  }

  if (focusedPin != null) {
    focusedPin.setIcon(PIN_PATH);
  }
  focusedCard = null;
  focusedPin = null;
}

/**
 * Responds to click on submit button by getting input time from user,
 * finding places within requested time, and placing corresponding pins
 * on the map. If no home location is set, message is displayed to user.
 *
 * @param {Event} event Click event from which to respond
 */
function submitDataListener(event) {
  if (home == null) {
    const content = '<p> No home location found. Please set a home location and try again.</p>';
    openModal(content);
  }
  else {
    $('#dw-s2').data('bmd.drawer').hide();
    clearPlaces();
    const hours = document.getElementById(HOURS_ID).value;
    const minutes = document.getElementById(MINUTES_ID).value;

    // Convert hours and minutes into seconds
    const time = hours * 3600 + minutes * 60;

    // Pop up modal that shows loading status
    $('#loading-modal').modal({show: true});

    getPlacesFromTime(time).then(places => {
      // Hide modal that shows loading status
      $('#loading-modal').modal('hide');
      const sortedPlaces = getSortedPlaces(places);
      populatePlaces(sortedPlaces);
    });
  }
}

/**
 * Populates display with places returned by a query. First, adds pins to the map. Then, adds
 * cards to the location card scroller in the DOM.
 *
 * @param {array} placeArray Array of Google Maps Place Objects
 */
function populatePlaces(placeArray) {
  for(place of placeArray) {
    let placeMarker = new google.maps.Marker({
      position: place.geometry.location,
      map: map,
      title: name,
      icon: PIN_PATH,
    });

    const htmlContent = getLocationCardHtml(place);

    // For the material bootstrap library, the preferred method of dom interaction is jquery,
    // especially for adding elements.
    let cardElement = $(htmlContent).click(function(event) {
      if(event.target.nodeName != 'SPAN') {
        toggleFocusOff();
        selectLocationMarker(name);
        $(this).addClass('active-card');
       focusedCard = this;
      }
    });
    $('#' + SCROLL_ID).append(cardElement);

    placeMarker.addListener('click', function () {
      toggleFocusOff();
      focusedPin = placeMarker;
      selectLocationCard(placeMarker.getTitle());
      placeMarker.setIcon(SELECTED_PIN_PATH);
      focusedCard.scrollIntoView({behavior: 'smooth', block: 'center'});
    });

    placeMarker.addListener('mouseover', function () {
      placeMarker.setIcon(SELECTED_PIN_PATH);
    });

    placeMarker.addListener('mouseout', function () {
      if (placeMarker != focusedPin) {
        placeMarker.setIcon(PIN_PATH);
      }
    });

    markers.push(placeMarker);
  }

  document.getElementById(SCROLL_ID).hidden = false;

  $('.icon').click(function() {
    $(this).toggleClass('press');
    if (firebase.auth().currentUser ) {
      const name = $(this).parent().parent().parent().attr('placeName');
      const link = $(this).parent().next().attr('href');
      const time = $(this).parent().next().next().text();
       // Add user information to the real time database in Firebase
      const database = firebase.database();
      var uID = firebase.auth().currentUser.uid;
      var ref = database.ref('users/' + uID + '/' + 'places' + '/' + name);
      var data = {
        name: name,
        link: link,
        time: time,
      }
      ref.set(data);
    }
  });
}

/**
 * Helper function that returns the an HTML string representing a place card
 * that can be added to the DOM.
 * @param {Object} place Contains name, lat/lng coordinates, place_id, and travel time to place
 * @return {String} HTML content to place inside infocard corresponding to place
 */
function getLocationCardHtml(place) {
  const name = place.name;

  const coordinates = place.geometry.location;
  const directionsLink = 'https://www.google.com/maps/dir/' +
    home.lat + ',' + home.lng + '/' +
    coordinates.lat() + ',' + coordinates.lng();

  const timeStr = place.timeAsString;
    
  const iconId = 'icon' + name;
  return innerHtml = '' +
    `<div class="card location-card" placeName="${name}" style="margin-right: 0;">
      <div class="card-body">
        <h5 class="card-title">${name}
        <span class="icon" id="${iconId}">
          &#9733
        <span>
        </h5>
        <a target="_blank" href="${directionsLink}" class="btn btn-primary active">Directions</a>
        <a target="_blank" onclick="populateMorePlaceInfo(${place_id})" class="btn btn-primary active">More Information</a>
        <h6>${timeStr}</h6>
      </div>
    </div>`;
}

function getLoginHtml() {
  return `<a class="btn btn-outline-primary" style="text-align: center" href="login.html">Login</a>
          <span id="nav-text">or</span>
          <a class="btn btn-outline-primary" href="signup.html">Sign up</a>`;
}

function getUserDashHtml(user) {
  return '<a class="btn btn-outline-primary" style="text-align: center" href="login.html">Logout</a>';
}

/**
 * Given a title, selects the corresponding marker by focussing it
 * @param {string} title the name of the place whose marker to focus
*/
function selectLocationMarker(title) {
  for (marker of markers) {
    if (marker.getTitle() == title) {
      focusedPin = marker;
      marker.setIcon(SELECTED_PIN_PATH);
    }
  }
}

/**
 * Given a title, selects the corresponding card by focussing it
 * @param {string} title the name of the place whose card to focus
 */
function selectLocationCard(title) {
  scrollWindow = document.getElementById(SCROLL_ID);
  for (locationCard of scrollWindow.childNodes) {
    if (locationCard.hasChildNodes() && locationCard.getAttribute("placeName") == title) {
      locationCard.classList.add("active-card");
      focusedCard = locationCard;
    }
  }
}

/** 
 * Removes duplicate places in an array of place objects 
 *
 * @param {array} places Array of place objects
 * @return {array} Array of place objects with no duplicates
 */
function getUniquePlaces(places) {
  const uniquePlaces = Array.from(new Set(places.map(p => p.name)))
    .map(name => {
      return places.find(p => p.name === name);
    });

  return uniquePlaces;
}

/** 
 * Sorts an array of place objects in increasing order of travel time
 *
 * @param {array} places Array of place objects
 * @return {array} Array of place objects sorted by travel time
 */
function getSortedPlaces(places) {
    // Comparison function for sorting places by travel time 
    const compareByTime = (a, b) => (a.timeInSeconds > b.timeInSeconds) ? 1 : -1;
    places.sort(compareByTime);
    return places;
}

/** Clears all markers on map except for home marker. */
function clearPlaces() {
  const parent = document.getElementById(SCROLL_ID);
  while (parent.firstChild) {
    parent.firstChild.remove();
  }
  parent.hidden = true;
  for (marker of markers) {
    marker.setMap(null);
  }
  markers = [];
}

/**
 * Finds and returns places centered around user's position that are within
 * requested travel time. Returns after placeThreshold places are found or
 * after attemptsThreshold searches to ensure termination.
 *
 * @param {Object} time Travel time requested by user in seconds
 * @return {Array} Array of objects containing information about places within the requested time
 */
 async function getPlacesFromTime(time) {
  // First try one bounding box around user's location
  let place_candidates = await getPlacesFromDirection(home.lat, home.lng);
  let filterResults = await filterByTime(time, place_candidates);

  let places = filterResults.places;

  // Initial distance from the user's location for the bounding boxes
  const initSpread = Math.max(1, Math.ceil(time/7200));
  let attempts = 0;

  /* Each direction is represented by a pair with the first element added
   to the user's lat and the second element added to the user's lng */

  let directions = [
    [initSpread,0], //North
    [0,initSpread], // East
    [0,-initSpread], // West
    [-initSpread,0], // South
    [initSpread, -initSpread], // Northwest
    [initSpread, initSpread], // Northeast
    [-initSpread, initSpread], // Southeast
    [-initSpread, -initSpread] // Southwest
  ];


  while (attempts < ATTEMPTS_THRESHOLD && places.length < PLACES_THRESHOLD) {
    let new_directions = [];

    for (direction of directions) {
      let latSpread = direction[0];
      let lngSpread = direction[1];
      let place_candidates = await getPlacesFromDirection(home.lat + latSpread, home.lng + lngSpread);

      let filterResults = await filterByTime(time, place_candidates);
      places = places.concat(filterResults.places);

      // If bounding box does not contain enough results, update position of box for next iteration
      if (filterResults.places.length < DIRECTION_THRESHOLD) {
        /* If average time in bounding box is greater than requested time, move bounding box closer
         to user otherwise move bounding box farther away from user. */
        if (filterResults.avg_time > time) {
          if (latSpread != 0) {
            latSpread = latSpread < 0 ? latSpread + 1 : latSpread - 1;
          }

          if (lngSpread != 0) {
            lngSpread = lngSpread < 0 ? lngSpread + 1 : lngSpread - 1;
          }
        } else {
          if (latSpread != 0) {
            latSpread = latSpread < 0 ? latSpread - 1 : latSpread + 1;
          }

          if (lngSpread != 0) {
            lngSpread = lngSpread < 0 ? lngSpread - 1 : lngSpread + 1;
          }
        }

        if (latSpread != 0 || lngSpread != 0) {
          new_directions.push([latSpread, lngSpread]);
        }
      }
    }

    directions = new_directions;
    attempts += 1;
  }

  return getUniquePlaces(places);
}

/**
 * Finds tourist attractions constrained to bounding box centered at provided latitude
 * and longitude. Adds all places with operational business status to array of returned places.
 *
 * @param {number} lat Bounding box center latitude
 * @param {number} lng Bounding box center longitude
 * @param {array} place_candidates Array of place objects
 * @return {Promise} An array promise of added place candidates
 */
function getPlacesFromDirection(lat, lng) {
  return new Promise(function(resolve) {
    let place_candidates = [];

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
      else {
        console.log(status);
      }

      resolve(place_candidates);
    }

    placesService.textSearch(request, callback);
  });
}

/**
 * Filters through tourist attractions to find which are in the given time frame of the user. Filters 25 places
 * at a time due to destination limit on Distance Matrix API.
 *
 * @param {number} time How much time the user wants to travel for in seconds
 * @param {array} listPlaces Array of place objects
 * @return {Object} Contains average time of all places and an array of places objects that are within time
 */
async function filterByTime(time, listPlaces) {
    let filterInfo = {total_time: 0, total_places: 0, places: []};

    for (let i = 0; i < listPlaces.length; i += 25) {
      filterInfo = await addAcceptablePlaces(time, listPlaces.slice(i, i + 25), filterInfo);
    }

    let avg_time = 0;
    if (filterInfo.total_places != 0) {
      avg_time = filterInfo.total_time/filterInfo.total_places;
    }

    return {avg_time: avg_time, places: filterInfo.places};
}

/**
 * Filters through tourist attractions to find which are in the given time frame of the user and populates
 * object with information about acceptable places.
 *
 * @param {number} time How much time the user wants to travel for in seconds
 * @param {array} places Array of place objects
 * @param {Object} acceptablePlacesInfo Object containing average time of all places and list of places within requested time
 * @return {Object} Contains total time of all places and an array of places objects that are within buffer of requested time
 */
function addAcceptablePlaces(time, places, acceptablePlacesInfo) {
  return new Promise(function(resolve) {
    let destinations = [];

    // Iterate through places to get all latitudes and longitudes of destinations
    for (place of places) {
      let lat = place.geometry.location.lat();
      let lng = place.geometry.location.lng();
      let destination = new google.maps.LatLng(lat, lng);
      destinations.push(destination);
    }

    distanceMatrixService.getDistanceMatrix({
      origins: [home],
      destinations: destinations,
      travelMode: 'DRIVING',
      unitSystem: google.maps.UnitSystem.IMPERIAL,
    }, callback);

    function callback(response, status) {
      if (status == 'OK') {
        // There is only one origin
        let results = response.rows[0].elements;

        for (let j = 0; j < results.length; j++) {
          let destination_info = results[j];

          if (destination_info.status == 'OK') {
            let destination_time = destination_info.duration.value;

            acceptablePlacesInfo.total_time += destination_time;
            acceptablePlacesInfo.total_places += 1;

            // Check if the destination time is within +- 30 minutes of requested travel time
            if (destination_time <= time + TIME_THRESHOLD && destination_time >= time - TIME_THRESHOLD) {
              acceptablePlacesInfo.places.push({
                name: places[j].name,
                geometry: places[j].geometry,
                place_id: places[j].place_id,
                timeInSeconds: destination_time,
                timeAsString: destination_info.duration.text
              });
            }
          }
        }
      }
      resolve(acceptablePlacesInfo);
    }
  });
}


function populateMorePlaceInfo(place_id) {
  let request = {
    placeId: place_id,
    fields: [
      'formatted_address',
      'formatted_phone_number',
      'opening_hours',
      'rating',
      'weekday_text',
      'url',
      'website' 
    ]
  };

  placesService.getDetails(request, callback);

  function callback(place, status) {
    if (status == google.maps.places.PlacesServiceStatus.OK) {
      (place);
    }
  }
}
