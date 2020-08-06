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

// Thirty minutes in seconds
const TIME_THRESHOLD = 1800;

// Document ids for user input and interaction
const SUBMIT_ID = 'submit';
const HOURS_ID = 'hrs';
const MINUTES_ID = 'mnts';
const SCROLL_ID = 'scroller';
const DASH_ID = 'dash';
const LOGOUT_ID = 'logout';
const FEEDBACK_ID = 'feedback-target';
const TOP_ID = 'top-text';

// Thresholds for time input
const HOURS_MAX_SEARCH = 20;
const MINUTE_MAX_SEARCH = 59;

// Regex for validating time input
const INT_REGEX_MATCHER = /^\d+$/;

// Subset of types strings from Places API
const DEPARMENT_STORE_TYPE_STR = 'department_store';
const MALL_STORE_TYPE_STR = 'shopping_mall';
const MUSEUM_TYPE_STR = 'museum';
const PARK_TYPE_STR = 'park';
const TOURIST_ATTRACTION_TYPE_STR = 'tourist_attraction';
const STORE_TYPE_STR = 'store';
const ZOO_TYPE_STR = 'zoo';

// Instructions displayed at top of webpage
const TOP_INFO_STR = 'Planning a road trip? Enter a home location' +
                     ' and travel time to find interesting attractions!'

// Paths to default and selected pins for place types
const ICON_PATHS = {
 defaultIcons: {
    default: 'icons/pins/default.svg',
    favorite: 'icons/pins/favorite.svg',
    museum: 'icons/pins/museum.svg',
    park: 'icons/pins/park.svg',
    shopping: 'icons/pins/shopping.svg',
    tourism: 'icons/pins/tourism.svg',
    zoo: 'icons/pins/zoo.svg'
  },
  selectedIcons: {
    default: 'icons/selected/default.svg',
    favorite: 'icons/selected/favorite.svg',
    museum: 'icons/selected/museum.svg',
    park: 'icons/selected/park.svg',
    shopping: 'icons/selected/shopping.svg',
    tourism: 'icons/selected/tourism.svg',
    zoo: 'icons/selected/zoo.svg'
  }
};

// Path to pin for home location
const HOME_PIN_PATH = 'icons/home.svg';

// Text files that contain modal content
const INFO_HTML_PATH = 'info.txt';
const NO_PLACES_HTML_PATH = 'noPlaces.txt';

// The map display object
let map;
// Current user
let user = false;
// Current home location
let home = null;

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
let savedPlacesSet = new Set();
let displayedPlacesSet = new Set();
let tripsSet = new Set();
let displaySaved = false;

// Name of trip that is currently displayed
let savedTrip = null;

let tripIdCounter = 0;


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

/** Adds click event to pill selector for destination type */
$('.multi-select-pill').click(function () {
  let pillText = $(this).text();
  if(pillText === placeType) {
    placeType = 'Tourist Attractions';
    $(this).toggleClass('selected');
  } else {
    if (pillText == 'Tourism') {
      placeType = 'Tourist Attractions';
    }  else {
      placeType = pillText;
    }
    $(event.target).parent().children('.multi-select-pill').removeClass('selected');
    $(this).toggleClass('selected');
  }
});

/** 
 * Initializes map window, service objects, and adds validation to input fields.
 * Runs on load.
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

  // Add autocomplete capability for address input
  const addressInput = document.getElementById('addressInput');
  let autocomplete = new google.maps.places.Autocomplete(addressInput);
    
  // Initialize API service objects
  distanceMatrixService = new google.maps.DistanceMatrixService();
  geocoder = new google.maps.Geocoder();
  placesService = new google.maps.places.PlacesService(map);
}

/** Changes top bar when user logs in or logs out */
firebase.auth().onAuthStateChanged(function(user) {
  $('#' + DASH_ID).empty();
  if (user) {
    addUserDash();
  } else {
    savedPlacesSet.forEach(place_id => {
      if(!displayedPlacesSet.has(place_id)) {
        removePlace(place_id);
      } else {
        unpressPlaceIcon(place_id);
      }
    });
    savedPlacesSet.clear();

    displaySaved = false;
    $('#' + SCROLL_ID).children().show();
    for (let marker of markers) {
      marker.setMap(map);
    }

    $('#trips').empty();
    $('#tripOptions').hide();
    $('#searchOptions').show();

    tripIdCounter = 0;

    addLoginButtons();
  }
});

/**
 * Returns the icon paths (default and selected) for a place based on its types array.
 * 
 * @param placeTypes an array of types for a place
 * @return an array with two elements, the first being the default icon path, and 
 *         the second being the selected icon path
 */
function getIconPaths(placeTypes) {
  if(placeTypes.includes(ZOO_TYPE_STR)) {
    return [ICON_PATHS.defaultIcons.zoo, ICON_PATHS.selectedIcons.zoo];
  } else if(placeTypes.includes(MUSEUM_TYPE_STR)) {
    return [ICON_PATHS.defaultIcons.museum, ICON_PATHS.selectedIcons.museum];
  } else if(placeTypes.includes(PARK_TYPE_STR)) {
    return [ICON_PATHS.defaultIcons.park, ICON_PATHS.selectedIcons.park];
  } else if(placeTypes.includes(MALL_STORE_TYPE_STR) || 
              placeTypes.includes(DEPARMENT_STORE_TYPE_STR) || 
              placeTypes.includes(STORE_TYPE_STR)) {
    return [ICON_PATHS.defaultIcons.shopping, ICON_PATHS.selectedIcons.shopping];
  } else { // all other types, use the tourism icon
    return [ICON_PATHS.defaultIcons.tourism, ICON_PATHS.selectedIcons.tourism];
  }
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
  document.getElementById(TOP_ID).innerHTML = TOP_INFO_STR;
  const dashElement = $(getLoginHtml());
  $('#' + DASH_ID).append(dashElement);
}

/**
 * Adds user dash elements to the DOM
 */
async function addUserDash() {
  const dashHtml = await getUserDashHtml(); 
  const dashElement = $(dashHtml);
  $(dashElement[2]).change(function () {
    if (this.childNodes[1].checked) {
      displaySaved = true;

      // populate saved places
      displaySavedPlaces();
      $('#' + SCROLL_ID).children().each(function() {
        if(!savedPlacesSet.has($(this).attr('placeId'))) {
          $(this).hide();
        }
      });

      for (let marker of markers) {
        if(!savedPlacesSet.has(marker.id)) {
          marker.setMap(null);
        }
      }

      $('#searchOptions').hide();

      querySavedTrips();
      document.getElementById('tripName').value = '';
      $('#tripOptions').show();
    } else {
      displaySaved = false;

      $('#' + SCROLL_ID).children().show();
      // If the card is a saved place but not in the search results, then hide
      $('#' + SCROLL_ID).children().each(function() {
        if(savedPlacesSet.has($(this).attr('placeId')) && !(displayedPlacesSet.has($(this).attr('placeId'))) ) {
          removePlace($(this).attr('placeId'));
        }
      });

      for (let marker of markers) {
        marker.setMap(map);
      }

      $('#tripOptions').hide();
      $('#searchOptions').show();
    }
  });
  // Logout user if they click the logout button
  $(dashElement[4]).click(function () {
    firebase.auth().signOut().catch(function(error) {
      console.log('Error occurred while signing user out ' + error);
    });
  });
  $('#' + DASH_ID).append(dashElement);
}

/**
 * Toggle the focused pin/card off
 */
function toggleFocusOff() {
  if (focusedCard) {
    focusedCard.classList.remove('active-card');
  }

  if (focusedPin) {
    let iconPath = focusedPin.getIcon();
    let iconName = iconPath.split('/')[2].split('.')[0];

    focusedPin.setIcon(ICON_PATHS.defaultIcons[iconName]);
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
      populatePlaces(sortedPlaces, false);
    }).catch(message => console.log(message));
  }
}

/**
 * Populates display with places returned by a query. First, adds pins to the map. Then, adds
 * cards to the location card scroller in the DOM.
 *
 * @param {array} placeArray Array of Google Maps Place Objects
 * @param {boolean} saved Flag indicating if places are from user saving
 */
function populatePlaces(placeArray, saved) {
  // if place array is empty, show the no places info
  if(!placeArray) {
    showModal(NO_PLACES_HTML_PATH);
  }

  for(let place of placeArray) {
    // If the saved places are being displayed and your search returns one of the saved places, 
    // there is nothing to do so coninue.
    if (savedPlacesSet.has(place.place_id) && document.getElementById(place.place_id)) {
      const savedCardId = place.place_id + '-card';
      $('#' + savedCardId).show();
      continue;
    // If you request to display the saved places while you currently have search results being displayed,
    // check to see if any of the saved places are already displayed, if so press the star and continue.
    } else if (displayedPlacesSet.has(place.place_id)) {
      pressPlaceIcon(place.place_id);
      continue; 
    } else {
      let paths = getIconPaths(place.types);
      let defaultPin = paths[0];
      let selectedPin = paths[1];
      // marker creation
      let placeMarker = new google.maps.Marker({
        position: place.geometry.location,
        map: map,
        title: place.name,
        icon: defaultPin,
        id: place.place_id
      });

      const htmlContent = getLocationCardHtml(place);

      let cardElement = $(htmlContent).click(function(event) {
        if(event.target.nodeName != 'SPAN') {
          toggleFocusOff();
          selectLocationMarker($(this).attr('placeId'), selectedPin);
          $(this).addClass('active-card');
          focusedCard = this;
        }
      });
      
      $('#' + SCROLL_ID).append(cardElement);

      if (saved) {
        pressPlaceIcon(place.place_id);
      }

      // Add events to focus card and pin
      placeMarker.addListener('click', function () {
        toggleFocusOff();
        focusedPin = placeMarker;
        selectLocationCard(placeMarker.id);
        placeMarker.setIcon(selectedPin);
        focusedCard.scrollIntoView({behavior: 'smooth', block: 'center'});
      });

      placeMarker.addListener('mouseover', function () {
        placeMarker.setIcon(selectedPin);
      });

      placeMarker.addListener('mouseout', function () {
        if (placeMarker != focusedPin) {
          placeMarker.setIcon(defaultPin);
        }
      });

      if (!saved) {
        displayedPlacesSet.add(place.place_id);
      }
      
      markers.push(placeMarker);
    }
  }

  document.getElementById(SCROLL_ID).hidden = false;

  $('.icon').unbind('click');
  // Handle favoriting a place
  $('.icon').click(function() {
    const placeId = $(this).parent().next().next().next().attr('savedPlaceId');
    let card = document.getElementById(placeId + '-card');

    $(this).toggleClass('press');
    if (firebase.auth().currentUser && $(this).hasClass('press')) {
      const time = $(this).parent().next().next().text();
       // Add users saved places to the real time database in Firebase when star is pressed
      const database = firebase.database();
      const uID = firebase.auth().currentUser.uid;
      const baseRefString = 'users/' + uID + '/places/' + placeId;
      let ref = database.ref(baseRefString);
      let data = {
        name: card.getAttribute('placeName'),
        timeAsString: time,
        timeInSeconds: card.getAttribute('data-timeInSeconds'),
        types: card.getAttribute('data-types'),
        place_id: placeId,
      }
      ref.set(data);

      // Store the lat/lng of each place in the database under geometry/location 
      // to be the same as the place object created form the search.
      let lat = parseFloat(card.dataset.lat);
      let lng = parseFloat(card.dataset.lng);
      ref = database.ref(baseRefString + '/geometry/location/');
      data = {
        lat: lat,
        lng: lng
      }
      ref.set(data);
      savedPlacesSet.add(placeId);
    } else if (firebase.auth().currentUser && (!$(this).hasClass('press'))) {
      // Delete user saved places when the star is not pressed/unpressed
      let ref = firebase.database().ref('users/' + firebase.auth().currentUser.uid + '/places/' + placeId);
      ref.remove();
      savedPlacesSet.delete(placeId);

      if (!displayedPlacesSet.has(placeId)) {
        removePlace(placeId);
      } else if (displaySaved) {
        hidePlace(placeId);
      } 
    }
  });
}

/**
 * Presses star icon on infocard corresponding to placeId 
 * @param {String} placeId Textual identifier for place
 */
function pressPlaceIcon(placeId) {
  const savedIcon = document.getElementById(placeId + '-icon');
  if (!savedIcon.classList.contains('press')) {
    savedIcon.classList.add('press');
  }
}

/**
 * Unpresses star icon on infocard corresponding to placeId 
 * @param {String} placeId Textual identifier for place
 */
function unpressPlaceIcon(placeId) {
  const savedIcon = document.getElementById(placeId + '-icon');
  if (savedIcon.classList.contains('press')) {
    savedIcon.classList.remove('press');
  }
}

/**
 * Removes html content for infocard corresponding to place_id 
 * @param {String} placeId Textual identifier for place
 */
function removePlace(placeId) {
  $('#' + SCROLL_ID).children().each(function() {
    if(($(this).attr('placeId')) === placeId) {
      $(this).remove();
    }
  });

  let new_markers = []
  for (let marker of markers) {
    if (marker.id === placeId) {
      marker.setMap(null);
    } else {
      new_markers.push(marker);
    }
  }

  markers = new_markers;
}

/**
 * Hides html content for infocard corresponding to place_id 
 * @param {String} placeId Textual identifier for place
 */
function hidePlace(placeId) {
  $('#' + SCROLL_ID).children().each(function() {
    if(($(this).attr('placeId')) === placeId) {
      $(this).hide();
    }
  });

  for (let marker of markers) {
    if (marker.id === placeId) {
      marker.setMap(null);
    }
  }
}
 
/**
 * Call the database and displays all saved places.
 */
function displaySavedPlaces() {
  const placesSnapshot = firebase.database().ref('users/'+ firebase.auth().currentUser.uid + '/places').once('value', function(placesSnapshot){
    let placeArray = [];
    placesSnapshot.forEach((placesSnapshot) => {
      let place = placesSnapshot.val();
      placeArray.push(place);
      savedPlacesSet.add(place.place_id);
    });

    populatePlaces(placeArray, true);
  });
}

/**
 * Helper function that returns the an HTML string representing a place card
 * that can be added to the DOM.
 * @param {Object} place Contains name, lat/lng coordinates, place_id, and travel time to place
 * @return {string} HTML content to place inside infocard corresponding to place
 */
function getLocationCardHtml(place) {
  const name = place.name;
  const timeStr = place.timeAsString;
  const timeInSeconds = place.timeInSeconds;
  const place_id = place.place_id;
  const types = place.types;

  let lat;
  if (typeof(place.geometry.location.lat) === 'number') {
    lat = place.geometry.location.lat;
  } else {
    lat = place.geometry.location.lat();
  }

  let lng;
  if (typeof(place.geometry.location.lng) === 'number') {
    lng = place.geometry.location.lng;
  } else {
    lng = place.geometry.location.lng();
  } 

  const iconId = place_id + '-icon';
  const innerHtml = '' +
    `<div id="${place_id}-card"
       data-timeInSeconds="${timeInSeconds}" 
       data-lat="${lat}"
       data-lng="${lng}"
       data-types="[${types}]"
       draggable="true"
       ondragstart=dragTrip(event)
       class="card location-card" 
       placeId="${place_id}" 
       placeName="${name}" 
       style="margin-right: 0;">
      <div class="card-body">
        <h5 class="card-title">${name}
          <span class="icon" id="${iconId}">
            &#9733;
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
          <a class="btn btn-outline-primary btn-color" onclick="showLogin()" style="color: #049688">Login</a>
          <span id="nav-text">or</span>
          <a class="btn btn-outline-primary btn-color" onclick="showSignUp()" style="color: #049688">Sign up</a>`;
}

/**
 * A helper function that returns the HTML for the user dashboard given a user and
 * adds name to text on top bar.
 * 
 * @returns the HTML for user dashboard as a string 
 */
function getUserDashHtml() {
  return new Promise(function(resolve) { 
     firebase.database().ref('users/'+ firebase.auth().currentUser.uid)
      .once('value', function(userSnapshot){
        const name = userSnapshot.val().name;
        document.getElementById(TOP_ID).innerHTML = `Hi, ${name}! ${TOP_INFO_STR}`; 
  
        resolve(`<img onclick="showModal(${INFO_HTML_PATH})" class="btn btn-icon" src="icons/help.svg">
                 Display Saved:
                 <label class="switch btn">
                   <input type="checkbox">
                   <span class="slider round"></span>
                 </label>
                 <a class="btn btn-outline-primary btn-color" style="color: #049688;" id="logout">Logout</a>`);
      });
  });
}

/**
 * Given a title, selects the corresponding marker by focussing it
 * @param {string} place_id Textual identifier for place to focus
 * @param {string} pin_path Path to selected pin for marker
*/
function selectLocationMarker(place_id, pin_path) {
  for (let marker of markers) {
    if (marker.id === place_id) {
      focusedPin = marker;
      marker.setIcon(pin_path);
      break;
    }
  }
}

/**
 * Given a title, selects the corresponding card by focusing it
 * @param {string} place_id Textual identifier of place to focus card
 */
function selectLocationCard(place_id) {
  const locationCard = document.getElementById(place_id + '-card');
  if (locationCard.hasChildNodes()) {
    locationCard.classList.add("active-card");
    focusedCard = locationCard;
  }
}

/** 
 * Removes duplicate places in an array of place objects 
 *
 * @param {array} places Array of place objects
 * @return {array} Array of place objects with no duplicates
 */
function getUniquePlaces(places) {
  const uniquePlaces = Array.from(new Set(places.map(p => p.place_id)))
    .map(place_id => {
      return places.find(p => p.place_id === place_id);
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

/** Clears all markers on map except for home marker. Clears all infocards. */
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

/** Clears all markers, infocards, search input, and resets map */
function clearSearch() {
  clearPlaces();
    
  // Remove home marker
  if (homeMarker) {
    homeMarker.setMap(null);
    homeMarker = null;
  }
  home = null;

  // Reset map
  map.setCenter({lat: 36.150813, lng: -40.352239});
  map.setZoom(4);
    
  // Remove search input
  document.getElementById('addressInput').value = '';
  document.getElementById(HOURS_ID).value = '';
  document.getElementById(MINUTES_ID).value = '';
  $('.multi-select-pill').removeClass('selected');
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
                types: places[j].types,
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
 * @param {string} place_id Textual identifier of place for PlaceDetails request
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
      'utc_offset_minutes',
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
 * @return {string} HTML content that formats passed in information for left side of infocard
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
 * @return {string} HTML content that formats passed in information for right side of infocard
 */
function getRightCardHTML(place) {
  const rightHTML = place.opening_hours ? getOpeningHours(place.opening_hours) : '';
  return rightHTML;
}

/**
 * Places links for directions and website (if available) in HTML buttons and adds HTML button  
 * to hide information in infocard for bottom of infocard corresponding to place.
 * 
 * @param {Object} place Contains (if available) link to website for place
 * @param {string} place_id Textual identifier for place 
 * @return {string} HTML content that formats passed in information for bottom of infocard
 */
function getBottomCardHTML(place, place_id) {
    let bottomHTML = '';

    if (home && !displaySaved) {
      // Link to Google Maps directions from home location to place 
      const directionsLink = 'https://www.google.com/maps/dir/' +
        home.lat + ',' + home.lng + '/' +
        place.geometry.location.lat() + ',' + place.geometry.location.lng();

      bottomHTML += 
        `<a target="_blank" class="btn btn-primary active" href=${directionsLink}>
          Directions
        </a>
        &nbsp`;
    }

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
 * @return {string} HTML content that formats hours for right side of infocard
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
    html = `<p><b>Hours:</b> &nbsp <span style = "color:#1A9107;">Open</span> &nbsp ${todaysHours} </p>`;  
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
 * @return {string} String that contains replacement with two letter abbreviation
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
 * @param {string} place_id Textual identifier for place
 * @return {string} HTML string containing button to show more information about place
 */
function removeMorePlaceInfo(place_id) {
    document.getElementById(place_id).innerHTML =
      `<a onclick="populateMorePlaceInfo('${place_id}')" class="btn btn-primary active">
         More Information
       </a>`;
}

/**
 * Adds new trip from user input to firebase and as a button in the trip options
 * on the sidebar of the page
 */
function addTrip() {
  const tripName = document.getElementById('tripName').value;

  if (tripName != null && tripName != '') {
    addTripToDash(tripName, []);
    addTripToFirebase(tripName);
  }
}

/**
 * Adds new trip by name to firebase and as a button in the trip options
 * on the sidebar of the page.
 * 
 * @param {string} tripName Name of trip 
 * @param {array} placeIds Ids of places saved to trip
 */
function addTripToDash(tripName, placeIds) {
  const tripId = createTripId();

  // TODO: Add ondrop event for adding card to trip
  const tripHtml =  
    `<div class="card-header text-center" id="${tripId}" tripName="${tripName}" data-ids="[${placeIds}]"
         onclick="clickTrip('${tripName}')" draggable="true" ondragstart="dragTrip(event)" ondrop="addPlace(event)" ondragover="allowDrop(event)">
       <h1 class="mb-0">
         <h4>
           ${tripName}
         </h4>
       </h1>
     </div>`;

    $("#trips").prepend(tripHtml);
}

function createTripId() {
  const tripId = 'trip-' + tripIdCounter;
  tripIdCounter += 1;
  return tripId;
}


/** Allows for drop event on element */
function allowDrop(event) {
  event.preventDefault();
}

/** Sets id of dragged card in event data */
function dragTrip(event) {
  event.dataTransfer.setData("text", event.target.id);
}

/** Gets tripId of dragged card from event and deletes in Firebase and DOM */
function deleteTrip(event) {
  event.preventDefault();
  const tripId = event.dataTransfer.getData("text");

  // TODO: deleteTripByName(tripName) - from Firebase

  $('#' + tripId).remove();
}

function addPlace(event) {
  event.preventDefault();
  const cardId = event.dataTransfer.getData("text");
  const placeId = cardId.split('-')[0];
  console.log(placeId);
  
  const tripName = event.target.getAttribute('tripName');
  console.log(tripName);
  addPlaceToTrip(tripName, placeId);
}

/** 
 * Selects card corresponding to tripName if not selected and displays those places. Otherwise
 * unselects and defaults to displaying all saved places. Every other card is unselected.
 *
 * @param {string} tripName Name of trip that should be selected
 */
function clickTrip(tripName) {
  $("div[id^=trip-]").each(function (index) {
    if ($(this).attr('tripName') == tripName) {
      if ($(this).hasClass('active-trip')) {
        $(this).removeClass('active-trip');
        $(this).prop('draggable', true);
        displaySavedPlaces();
      } else {
        const placeIds = $(this).attr('data-ids');
        $(this).addClass('active-trip');
        $(this).prop('draggable', false);
        displayTrip(placeIds);
      }
    } else {
      $(this).removeClass('active-trip')
      $(this).prop('draggable', true);
    }
  });
}

/** Function that is called when the saved places toggle is turned on */
function querySavedTrips() {
  const tripsSnapshot = firebase.database().ref('users/'+ firebase.auth().currentUser.uid + '/trips/').once('value', function(tripsSnapshot){
    tripsSnapshot.forEach((tripsSnapshot) => {
      let tripInfo = tripsSnapshot.val();
      console.log(tripInfo);
      // TODO: Change structure of tripInfo appropriately
      const tripName = 'place holder';
      const placeIds = [];
      addTripToDash(tripName, placeIds);
    });
  });
}


// Add a new trip to the data base
function addTripToFirebase(tripName) {
 
  //Check that the user does not already have a trip with the same name
  if(tripName == null || tripName == ' ') {
    openModal('<p> You have entered an empty trip name </p>');
  }

  else if(tripsSet.has(tripName)) {
    openModal('<p> You already have a trip by this name </p>');
  }

  else {
    let ref = firebase.database().ref('users/' + firebase.auth().currentUser.uid + '/trips/');
    ref.set(tripName); 
    tripsSet.add(tripName);
  }
}

function addPlaceToTrip(tripName, placeId) {
  let ref = firebase.database().ref('users/' + firebase.auth().currentUser.uid + '/trips/' + tripName + '/placeIds/');
    ref.set(placeId); 
  
  // Add id to ids on corresponding card
  $("div[id^=trip-]").each(function (index) {
    if ($(this).attr('tripName') == tripName) {
      const placeIds = $(this).attr('data-ids');
      placeIds.push(placeId);
      $(this).attr('data-ids', placeIds); 
    }
  });
}

/** Displays all saved places with matching place ids */
function displayTrip(placeIds) {
  //Get the object with all the place ids
  let tripPlacesSet = new set();
  for(id in placeIds) {
    tripPlacesSet.add(id);
  }

  // Hide all saved places and only show ones in set
  $('#' + SCROLL_ID).children().each(function() {
    if(!tripPlacesSet.has($(this).attr('placeId'))) {
       $(this).hide();
    } else {
       $(this).show();
    }
  });

  for (let marker of markers) {
    if(!tripPlacesSet.has(marker.id)) {
      marker.setMap(null);
    } else {
      marker.setMap(map);
    }
  }
}
