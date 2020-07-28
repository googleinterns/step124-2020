/**
 * A collection of functions for Where To app. This file includes most JS,
 * including DOM interaction and API calls.
 */
'use strict';

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

const FEEDBACK_ID = 'feedback-target';
const HOURS_MAX_SEARCH = 20;
const MINUTE_MAX_SEARCH = 59;

const DASH_ID = 'dash';
const LOGOUT_ID = 'logout';

const PIN_PATH = 'icons/pin.svg';
const SELECTED_PIN_PATH = 'icons/selectedPin.svg';
const HOME_PIN_PATH = 'icons/home.svg';

const INT_REGEX_MATCHER = /^\d+$/;

// Text files that contain modal content
const INFO_HTML_PATH = 'info.txt';
const NO_PLACES_HTML_PATH = 'noPlaces.txt';

// The map display object
let map;
// Current user
let user = false;
// Current home location
let home = null;
// Whether the saved places should be displayed or not
let displaySavedPlaces = false;

// The current pin and card that are selected by the user
let focusedCard;
let focusedPin;

// The home marker
let homeMarker = null;
// All other displayed markers
let markers = [];

// Flag indicating if geolocation is running
let geoLoading = false;

// API service objects
let distanceMatrixService;
let geocoder;
let placesService;

// Keeps track of most recent search request
let globalNonce;


// Keep a set of all saved and displayed places
var savedPlacesSet = new Set();
var displayedPlacesSet = new Set();

// Query for Place Search
let placeType = 'Tourist Attractions';


// Add gmap js library to head of page
const script = document.createElement('script');
script.src =
  'https://maps.googleapis.com/maps/api/js?key=' +
  secrets['googleMapsKey'] +
  '&libraries=places';
script.defer = true;
script.async = true;

document.head.appendChild(script);

$('.multi-select-pill').click(function () {
  let pillText = $(this).text();
  if(pillText === placeType) {
    placeType = 'Tourist Attractions';
    $(this).toggleClass('selected');
  } else {
    placeType = pillText;
    $(event.target).parent().children('.multi-select-pill').removeClass('selected');
    $(this).toggleClass('selected');
  }
});

/** 
 * Initializes map window, runs on load.
 */
function initialize() {
  const submit = document.getElementById(SUBMIT_ID);
  submit.addEventListener('click', submitDataListener);
  attachSearchValidation();

  const mapOptions = {
    center: {lat: 36.150813, lng: -40.352239}, // Middle of the North Atlantic Ocean
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    zoom: 4,
    mapTypeControl: false,
    styles: MAP_STYLES,
  };
  map = new google.maps.Map(document.getElementById('map'), mapOptions);
  map.addListener('click', toggleFocusOff);
  // Add autocomplete capabality for address input
  const addressInput = document.getElementById('addressInput');
  let autocomplete = new google.maps.places.Autocomplete(addressInput);
    
  // Initialize API service objects
  distanceMatrixService = new google.maps.DistanceMatrixService();
  geocoder = new google.maps.Geocoder();
  placesService = new google.maps.places.PlacesService(map);  
}


/**
 * Attaches listeners to the focusout event for search inputs.
 */
function attachSearchValidation() {
  addListenerToSearchInput(document.getElementById(HOURS_ID), 'hours', HOURS_MAX_SEARCH);
  addListenerToSearchInput(document.getElementById(MINUTES_ID), 'minutes', MINUTE_MAX_SEARCH);
}

/**
 * Adds an on focusout event to a dom element, which adds a formatted HTML tip to the DOM.
 *
 * @param element the dom element to add listener to
 * @param type a string of the type of time input this element takes ('minute' or 'hour')
 * @param max the maximum value of this input element
 */
function addListenerToSearchInput(element, type, max) {
  element.addEventListener('focusout', function (event) {
    $('#' + type + '-feedback').remove();
    // if value is empty, set to 0, otherwise, parse the value
    const stringInput = event.target.value;

    const intValue = (stringInput === '') ? 0 : parseInt(stringInput);
    if (!INT_REGEX_MATCHER.test(stringInput) || intValue < 0 || intValue > max) {
      $('#' + FEEDBACK_ID).append('<p id="' + type + '-feedback" class="feedback">Please input a valid ' + type + ' whole number between 0 and ' + max + '</p>');
    } else {
      $('#' + type + '-feedback').remove();
    }
  });
}

/**
 * Opens the modal, then populates it with the html at the specified filepath.
 * @param htmlFilePath the path to the html to populate the modal with as text
 */
function showModal(htmlFilePath) {
  fetch(htmlFilePath)
    .then(response => response.text())
    .then(content => openModal(content));
}

// When auth changes, display the proper dashboard
firebase.auth().onAuthStateChanged(function(user) {
  $('#' + DASH_ID).empty();
  if (user) {
    addUserDash();
    // When a user logs out, clear the saved plases set
    savedPlacesSet.clear();
  } else {
    addLoginButtons();
  }
});

/**
 * Obtains user's location from either browser or an inputted address and sets home location. If error
 * occurs, message is displayed to user in modal.
 *
 * @param {boolean} useAddress Flag indicating whether to get location from browser or address
 */
function getHomeLocation(useAddress) { 
  const addressInput = document.getElementById('addressInput');

  let locationFunction;
  if (useAddress) {
    locationFunction = () => getLocationFromAddress(addressInput.value);
  } else {
    locationFunction = () => getLocationFromBrowser();
  }

  locationFunction().then(homeObject => {
    closeLocationModal();
    home = homeObject;

    // If location is from browser, reverse geocode and populate address input
    if(!useAddress) {
      geocoder.geocode({location: home}, function(results, status) {
        if (status === "OK") {
          if (results[0]) {
            addressInput.value = results[0].formatted_address;
          }
        }
      });
    }
    
    setHomeMarker();
  }).catch(message => {
    closeLocationModal();
    const messageContent = '<p>' + message + '</p>';
    openModal(messageContent);
  });
}

/** Opens modal telling user that location is being found if geolocation is running */
function openLocationModal() {
  if (geoLoading) {
    $('#location-modal').modal('show');
  }
}

/** 
 *  Closes modal telling user that location is being found and sets flag
 *  indicating geolocation is done running.
 */
function closeLocationModal() {
  $('#location-modal').modal('hide');
  geoLoading = false;
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
      geoLoading = true;

      // Prevents caching of results in case user moves location
      const options = {maximumAge: 0};
      navigator.geolocation.getCurrentPosition(success, deniedAccessUserLocation, options); 

      // Wait and only open modal if geolocation is still running after a while
      setTimeout(openLocationModal, 500);    
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

  $('#content-modal').modal('show');
}

/**
 * Adds login elements to the DOM
 */
function addLoginButtons() {
  const dashElement = $(getLoginHtml());
  $('#' + DASH_ID).append(dashElement);
}

/**
 * Adds user dash elements to the DOM
 */
function addUserDash() {
  const dashElement = $(getUserDashHtml(user));
  // reverse the boolean control on click
  $(dashElement[2]).change(function () {
    if (this.childNodes[1].checked) {
      $('#' + SCROLL_ID).children().each(function() {
        if(!savedPlacesSet.has($(this).attr('placeId'))) {
          $(this).hide();
        }
      });
    } else {
      $('#' + SCROLL_ID).children().show();
    }
  });

  // Logout user if they click the logout button
  $(dashElement[3]).click(function () {
    firebase.auth().signOut().catch(function(error) {
      console.log('Error occurred while sigining user out ' + error);
    });
  });
  $('#' + DASH_ID).append(dashElement);
}

/**
 * Toggle the focused pin/card off
 */
function toggleFocusOff() {
  console.log("helooooo");
  if (focusedCard != null) {
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
    const content = '<p>No home location found. Please set a home location and try again.</p>';
    openModal(content);
  } else if ($('#' + FEEDBACK_ID).children().length >= 1) {
    const content = '<p>Please enter valid search parameters</p>';
    openModal(content);
  } else {
    clearPlaces();
    displayedPlacesSet.clear();
    const hours = document.getElementById(HOURS_ID).value;
    const minutes = document.getElementById(MINUTES_ID).value;

    // Convert hours and minutes into seconds
    const time = hours * 3600 + minutes * 60;

    // Pop up modal that shows loading status
    $('#loading-modal').modal('show');

    getPlacesFromTime(time).then(places => {
      // Hide modal that shows loading status
      $('#loading-modal').modal('hide');
      const sortedPlaces = getSortedPlaces(places);
      populatePlaces(sortedPlaces);
    }).catch(message => console.log(message));
  }
}

/**
 * Populates display with places returned by a query. First, adds pins to the map. Then, adds
 * cards to the location card scroller in the DOM.
 *
 * @param {array} placeArray Array of Google Maps Place Objects
 */
function populatePlaces(placeArray) {
  // if place array is empty, show the no places info
  if(!placeArray) {
    showModal(NO_PLACES_HTML_PATH);
  }

  for(let place of placeArray) {
    // If the saved places are being displayed and your search returns one of the saved places, 
    // there is nothing to do so coninue.
    if (savedPlacesSet.has(place.place_id) && document.getElementById(place.place_id)) {
      continue;
    // If you request to display the saved places while you currently have search results being displayed,
    // check to see if any of the saved places are already displayed, if so press the star and continue.
    } else if (displayedPlacesSet.has(place.place_id)) {
      let savedIcon = document.getElementById('icon' + place.name);
      savedIcon.addClass('press');
      continue; 
    }
    else {
      // marker creation
      let placeMarker = new google.maps.Marker({
        position: place.geometry.location,
        map: map,
        title: place.name,
        icon: PIN_PATH,
      });

      const htmlContent = getLocationCardHtml(place);

      // For the material bootstrap library, the preferred method of dom interaction is jquery,
      // especially for adding elements.
      let cardElement = $(htmlContent).click(function(event) {
        if(event.target.nodeName != 'SPAN') {
          toggleFocusOff();
          selectLocationMarker($(this).attr('placeName'));
          $(this).addClass('active-card');
          focusedCard = this;
        }
      });
      $('#' + SCROLL_ID).append(cardElement);

     // Check to see if it is a saved place, if so make the star pressed 
      if(savedPlacesSet.has(place.place_id)) {
        cardElement.find('.icon').addClass('press');
      }

    $('#' + SCROLL_ID).append(cardElement);

    // Add events to focus card and pin
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
  }

  document.getElementById(SCROLL_ID).hidden = false;
  // Handle favoriting a place
  $('.icon').click(function() {
    const name = $(this).parent().parent().parent().attr('placeName');
    const placeId = $(this).parent().next().next().next().attr('savedPlaceId');
    let card = document.getElementById(name);
    $(this).toggleClass('press');
    if (firebase.auth().currentUser && $(this).hasClass('press')) {
      const time = $(this).parent().next().next().text();
       // Add users saved places to the real time database in Firebase when star is pressed
      const database = firebase.database();
      var uID = firebase.auth().currentUser.uid;
      var ref = database.ref('users/' + uID + '/places/' + name);
      var data = {
        name: name,
        timeAsString: time,
        timeInSeconds: card.getAttribute('data-timeInSeconds'),
        place_id: placeId,
      }
      ref.set(data);
      let lat = card.dataset.lat;
      let lng = card.dataset.lng;
      var ref = firebase.database().ref('users/' + firebase.auth().currentUser.uid + '/places/' + name + '/geometry/location/');
      var data = {
        lat: lat,
        lng: lng
      }
      ref.set(data);
      savedPlacesSet.add(placeId);
    } else if (firebase.auth().currentUser && (!$(this).hasClass('press'))) {
      // Delete user saved places when the star is not pressed/unpressed
      var ref = firebase.database().ref('users/' + firebase.auth().currentUser.uid + '/places/' + name);
      ref.remove();
      savedPlacesSet.delete(placeId);
    }
  });
}
 
/**
 * Call the database and displays all saved places.
 */
function savedPlaces() {
  const placesSnapshot = firebase.database().ref('users/'+ firebase.auth().currentUser.uid + '/places').once('value', function(placesSnapshot){
    var placeArray = [];
    placesSnapshot.forEach((placesSnapshot) => {
      let place = placesSnapshot.val();
      placeArray.push(place);
      savedPlacesSet.add(place.place_id);
    });
    populatePlaces(placeArray);
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
  const timeStr = place.timeAsString;
  const timeInSeconds = place.timeInSeconds;
  const place_id = place.place_id;
  const lat = place.geometry.location.lat();
  const lng = place.geometry.location.lng();
    
  const iconId = 'icon' + name;
  const innerHtml = '' +
    `<div id="${name}"
       data-timeInSeconds="${timeInSeconds}" 
       data-lat="${lat}"
       data-lng="${lng}"
       class="card location-card" 
       placeId="${place_id}" 
       placeName="${name}" 
       style="margin-right: 0;">
      <div class="card-body">
        <h5 class="card-title">${name}
          <span class="icon" id="${iconId}">
            &#9733
          </span>
        </h5>
        <div id=${place_id}>
          <a onclick="populateMorePlaceInfo('${place_id}')" class="btn btn-primary active">More Information</a>
        </div>
        <h6>${timeStr}</h6>
        <div savedPlaceId="${place_id}" style="visibility: hidden">
        </div>
    </div>`;
    return innerHtml;
}


/**
 * A helper function that returns the HTML for login.
 * 
 * @returns the HTML for login as a string
 */
function getLoginHtml() {
  return `<img onclick="showModal('${INFO_HTML_PATH}')" class="btn btn-icon" src="icons/help.svg">
          <a class="btn btn-outline-primary btn-color" onclick="showLogin()">Login</a>
          <span id="nav-text">or</span>
          <a class="btn btn-outline-primary btn-color" onclick="showSignUp()">Sign up</a>`;
}

/**
 * A helper function that returns the HTML for the user dashboard given a user.
 * 
 * @param {User} user
 * @returns the HTML for user dashboard as a string 
 */
function getUserDashHtml(user) {
  return `<img onclick="showModal(${INFO_HTML_PATH})" class="btn btn-icon" src="icons/help.svg">
          Display Saved:
          <label class="switch btn">
            <input type="checkbox">
            <span class="slider round"></span>
          </label>
          <a class="btn btn-outline-primary btn-color" style="color: #049688;" id="logout">Logout</a>`;
}

/**
 * Given a title, selects the corresponding marker by focussing it
 * @param {string} title the name of the place whose marker to focus
*/
function selectLocationMarker(title) {
  for (let marker of markers) {
    if (marker.getTitle() == title) {
      focusedPin = marker;
      marker.setIcon(SELECTED_PIN_PATH);
      break;
    }
  }
}

/**
 * Given a title, selects the corresponding card by focussing it
 * @param {string} title the name of the place whose card to focus
 */
function selectLocationCard(title) {
  const scrollWindow = document.getElementById(SCROLL_ID);
  for (let locationCard of scrollWindow.childNodes) {
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
  displayedPlacesSet.clear();
  const parent = document.getElementById(SCROLL_ID);
  while (parent.firstChild) {
    parent.firstChild.remove();
  }
  parent.hidden = true;
  for (let marker of markers) {
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
function getPlacesFromTime(time) {
  return new Promise(async function(resolve, reject){    
    const localNonce = globalNonce = new Object(); 
    // First try one bounding box around user's location
    let place_candidates = await getPlacesFromDirection(home.lat, home.lng);
    let filterResults = await filterByTime(time, place_candidates);

    // If most recent request has changed, don't continue with search
    if (localNonce != globalNonce) {
      reject('Cancelled');
    }

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

      for (let direction of directions) {
        let latSpread = direction[0];
        let lngSpread = direction[1];

        let place_candidates = await getPlacesFromDirection(home.lat + latSpread, home.lng + lngSpread);
        let filterResults = await filterByTime(time, place_candidates);
        
        // If most recent request has changed, don't continue with search
        if (localNonce != globalNonce) {
          reject('Cancelled');
        }

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

    const uniquePlaces = getUniquePlaces(places);
    resolve(uniquePlaces);
  });
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
      query: placeType,
      bounds: boundBox,
    };

    function callback(results, status) {
      if (status == google.maps.places.PlacesServiceStatus.OK) {
        for (let result of results) {
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
    for (let place of places) {
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

/** 
 * Queries Places API with place details request using place_id to get additional
 * information about place and populates this information inside place's infocard. 
 *
 * @param {String} place_id Textual identifier of place for PlaceDetails request
 */
function populateMorePlaceInfo(place_id) {
  let request = {
    placeId: place_id,
    fields: [
      'formatted_address',
      'formatted_phone_number',
      'geometry',
      'opening_hours', 
      'rating', 
      'website' 
    ]
  };

  placesService.getDetails(request, callback);

  function callback(place, status) {
    if (status == google.maps.places.PlacesServiceStatus.OK) {
      
      // Left side of card contains (if available) rating, address,phone_number
      const leftHTML = getLeftCardHTML(place);
      // Right side of card contains listing of places' opening hours
      const rightHTML = getRightCardHTML(place);
      // Bottom of card contains button with link to directions, website (if available), and hide info.
      const bottomHTML = getBottomCardHTML(place, place_id);

      let newHTML = '' +
        `<div class="container">
           <div class="row">
             <div class="col">
               ${leftHTML}
             </div>
             <div class="col">
              ${rightHTML}
             </div>
           </div>
         </div>
         ${bottomHTML}`;
      
      // Place content in infocard corresponding to place
      document.getElementById(place_id).innerHTML = newHTML;
    }
  }
}

/**
 * Places information about place including formatted address, and if available, rating and formatted
 * phone number in HTML string that makes up content of left side of infocard corresponding to place.
 * 
 * @param {Object} place Contains (if available) rating, formatted address, and formatted phone number 
 * @return {String} HTML content that formats passed in information for left side of infocard
 */
function getLeftCardHTML(place) {
  let leftHTML = ``;

  // If there is a rating, convert to percentage out of five and fill in stars according to percentage
  if (place.rating) {
    const percent = Math.round((place.rating/5) * 100);
    leftHTML += `<div class="stars"><span style="width:${percent}%" class="stars-rating"></span></div><br/>`;
  }

  leftHTML += `<p><b>Address:</b> &nbsp ${place.formatted_address}</p>`;

  if (place.formatted_phone_number) {
    leftHTML += `<p><b>Phone:</b> &nbsp ${place.formatted_phone_number}</p>`;
  }

  return leftHTML;
}

/**
 * Places information about opening hours, if available, in HTML string that makes up content of 
 * right side of infocard corresponding to place.
 * 
 * @param {Object} place Contains (if available) opening hours of place
 * @return {String} HTML content that formats passed in information for right side of infocard
 */
function getRightCardHTML(place) {
  const rightHTML = place.opening_hours ? getOpeningHours(place.opening_hours) : '';
  return rightHTML;
}

/**
 * Places links for directions and website (if available) in HTML buttons and add HTML button  
 * to hide information in infocard for bottom of infocard corresponding to place.
 * 
 * @param {Object} place Contains (if available) link to website for place
 * @param {String} place_id Textual identifier for place 
 * @return {String} HTML content that formats passed in information for bottom of infocard
 */
function getBottomCardHTML(place, place_id) {
    // Link to Google Maps directions from home location to place 
    const directionsLink = 'https://www.google.com/maps/dir/' +
      home.lat + ',' + home.lng + '/' +
      place.geometry.location.lat() + ',' + place.geometry.location.lng();

    // Always add button for directions
    let bottomHTML = 
      `<a target="_blank" class="btn btn-primary active" href=${directionsLink}>
         Directions
       </a>
       &nbsp`;

    // If there is a listed website, add a button for it
    if (place.website) {
      bottomHTML += 
        `<a target="_blank" class="btn btn-primary active" href=${place.website}>
           Website
         </a>
         &nbsp`;
    }

    // Always add button for hiding information
    bottomHTML += 
      `<a class="btn btn-primary active" onclick="removeMorePlaceInfo('${place_id}')">
          Hide Information
       </a>`;

    return bottomHTML;
}

/**
 * Gets current day's hours and checks if place is currently open and puts resulting information in one line. 
 * Underneath this line, starting from the next day, adds the opening hours for each day of the week line after 
 * line. Returns resulting HTML string for right side of infocard. 
 * 
 * @param {Object} opening_hours Contains function to check if place is open and string array of operating hours
 * @return {String} HTML content that formats hours for right side of infocard
 */
function getOpeningHours(opening_hours) {
  const d = new Date();
  // getDay() starts the week on Sunday and Places API starts week on Monday. 
  const dayIndex = (d.getDay() + 6) % 7;
  const weekday_text = opening_hours.weekday_text;

  // Replaces day of week to two letter abbreviation 
  const todaysHours = shortenedWeekdayText(weekday_text, dayIndex); 
  
  let html = ``;

  // If place is currently open, show open in green, otherwise show closed in red.
  if (opening_hours.isOpen()) {
    html = `<p><b>Hours:</b> &nbsp <span style = "color:#6CC551;">Open</span> &nbsp ${todaysHours} </p>`;  
  } else {
    html = `<p><b>Hours:</b> &nbsp <span style = "color:#D70D00;">Closed</span> &nbsp ${todaysHours} </p>`; 
  }

  // Add the rest of the opening hours for each day of the week starting from next day
  for (let i = dayIndex + 1; i % 7 != dayIndex; i++) {
    let index = i >= 7 ? i % 7 : i; 
    if ((index + 1) % 7 != dayIndex) {
      html += `<p class="no-break">${shortenedWeekdayText(weekday_text, index)}</p>`;
    } else {
      html += `<p>${shortenedWeekdayText(weekday_text, index)}</p>`;
    }
  }

  return html;
}

/**
 * Replaces full name of weekday in string with two letter abbreviation and returns new string.
 * 
 * @param {array} weekday_text Array of strings with weekday and times that places are open
 * @param {number} dayIndex Integer corresponding to day of week where 0->Monday
 * @return {String} String that contains replacement with two letter abbreviation
 */
function shortenedWeekdayText(weekday_text, dayIndex) {
    const shortDays = ['Mo:','Tu:','We:','Th:','Fr:','Sa:','Su:'];

    const textComps = weekday_text[dayIndex].split(' ');
    // First word in string is always weekday
    textComps[0] = shortDays[dayIndex];

    return textComps.join(' ');
}

/**
 * Creates and returns html string containing button to show more information about a place
 * 
 * @param {String} place_id Textual identifier for place
 * @return {String} HTML string containing button to show more information about place
 */
function removeMorePlaceInfo(place_id) {
    document.getElementById(place_id).innerHTML =
      `<a onclick="populateMorePlaceInfo('${place_id}')" class="btn btn-primary active">
         More Information
       </a>`;
}