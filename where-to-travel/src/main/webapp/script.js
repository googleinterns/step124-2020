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

// Thresholds for termination of search algorithm
const PLACES_THRESHOLD = 30;
const ATTEMPTS_THRESHOLD = 10;
const DIRECTION_THRESHOLD = 5;

// Document ids for user input elements
const SUBMIT_ID = 'submit';
const HOURS_ID = 'hrs';
const MINIUTES_ID = 'mnts';
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

let markers = [];

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
  home = await getUserLocation();
  const mapOptions = {
    center: home,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    zoom: 16,
    mapTypeControl: false,
    styles: MAP_STYLES,
  };
  map = new google.maps.Map(document.getElementById('map'), mapOptions);

  let homeMarker = new google.maps.Marker({
    position: home,
    icon: HOME_PIN_PATH,
    map: map,
    title: 'Home',
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
    focusedCard.classList.remove('active');


    if (focusedPin != null) {
      focusedPin.setIcon(SELECTED_PIN_PATH);
    }
   focusedCard = null;
   focusedPin = null;
}

/**
 * Responds to click on submit button by getting input time from user,
 * finding places within requested time, and placing corresponding pins
 * on the map .
 *
 * @param {Event} event Click event from which to respond
 */
function submitDataListener(event) {
  clearPlaces();
  const hours = document.getElementById(HOURS_ID).value;
  const minutes = document.getElementById(MINUTES_ID).value;
  // Convert hours and minutes into seconds
  const time = hours * 3600 + minutes * 60;
  getPlacesFromTime(time).then(places => {
    populatePlaces(places);
  });
}

/**
 * Populates display with places returned by a query. First, adds pins to the map. Then, adds
 * cards to the location card scroller in the DOM.
 *
 * @param {array} placeArray Array of Google Maps Place Objects
 */
function populatePlaces(placeArray) {
  for(let i = 0; i < placeArray.length; i++) {
    let name = placeArray[i].name;
    let coordinates = placeArray[i].geometry.location;

    let directionsLink = 'https://www.google.com/maps/dir/' +
      home.lat + ',' + home.lng + '/' +
      coordinates.lat() + ',' + coordinates.lng();

    console.log(directionsLink);
    let timeStr = placeArray[i].timeAsString;

    let placeMarker = new google.maps.Marker({
      position: coordinates,
      map: map,
      title: name,
      icon: PIN_PATH,
    });

    const htmlContent = getLocationCardHtml(name, directionsLink, timeStr);

    // For the material bootstrap library, the preferred method of dom interaction is jquery,
    // especially for adding elements.
    let cardElement = $(htmlContent).click(function(event) {
      if(event.target.nodeName != 'SPAN') {
        toggleFocusOff();
        selectLocationMarker(name);
        $(this).addClass('active');
       focusedCard = this;

    });
    $('#' + SCROLL_ID).append(cardElement);

    placeMarker.addListener('click', function () {
      toggleFocusOff();
      focusedPin = placeMarker;
      selectLocationCard(placeMarker.getTitle());
      placeMarker.setIcon(SELECTED_PIN_PATH);
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
  $('.icon').click(function() {
    $(this).toggleClass('press');
  });
}

/**
 * Helper function that returns the an HTML string representing a place card
 * that can be added to the DOM.
 * @param {string} title the place title
 * @param {string} directionsLink the link to the GMaps directions for this place
 * @param {string} timeStr the amount of time it takes to travel to this place, as a string
 */
function getLocationCardHtml(title, directionsLink, timeStr) {
  const iconId = 'icon' + title;
  return innerHtml = '' +
    `<div class="card location-card" placeName="${title}">
      <div class="card-body">
        <h5 class="card-title">${title}
        <span class="icon" id="${iconId}">
          &#9733
        <span>
        </h5>
        <a target="_blank" href="${directionsLink}" class="badge badge-primary">Directions</a>
        <p>${timeStr}</p>
        <i></i>
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
      locationCard.classList.add("active");
     focusedCard = locationCard;

  }
}

/** Clears all place cards that are currently displayed. Also clears markers */
function clearPlaces() {
  const parent = document.getElementById(SCROLL_ID);
  while (parent.firstChild) {
      parent.firstChild.remove();
  }

  for (marker of markers) {
    marker.setMap(null);
  }
  markers = [];
}

/**
 * If browser supports geolocation and user provides permissions, obtains user's
 * latitude and longitude. Otherwise, asks user to input address and converts input
 * to latitude and longitude.
 *
 * @return {Object} Contains latitude and longitude corresponding to user's location
 */
function getUserLocation() {
  return new Promise(function(resolve) {
    function success(position) {
      return resolve({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    }

    function deniedAccessUserLocation() {
      return resolve(getLocationFromUserInput());
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(success, deniedAccessUserLocation);
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
 * Finds and returns places centered around user's position that are within
 * requested travel time. Returns after placeThreshold places are found or
 * after attemptsThreshold searches to ensure termination.
 *
 * @param {Object} time Travel time requested by user in seconds
 * @return {Array} Array of objects containing information about places within the requested time
 */
 async function getPlacesFromTime(time) {
  // For small travel times (1 hour or less), try one bounding box around user's location first
  if (time <= 3600) {
    let place_candidates = await getPlacesFromDirection(home.lat, home.lng);
    let filterResults = await filterByTime(time, place_candidates);
    if (filterResults.places.length >= PLACES_THRESHOLD) {
      return filterResults.places;
    }
  }

  // Initial distance from the user's location for the bounding boxes
  const initSpread = Math.max(1, Math.ceil(time/7200));

  let places = [];
  let attempts = 0;

  // Each direction is represented by a pair with the first element added
  // to the user's lat and the second element added to the user's lng
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

  return places;
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
    place_candidates = [];

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

    service = new google.maps.places.PlacesService(map);
    service.textSearch(request, callback);
  });
}

async function filterByTime(time, listPlaces) {
    let filterInfo = {avg_time: 0, places: []};

    let i;
    for (i = 0; i < listPlaces.length; i += 25) {
      filterInfo = await addAcceptablePlaces(time, listPlaces.slice(i, i + 25), filterInfo);
    }

    return filterInfo;
}

/**
 * Filter through tourist attractions to find which are in the given time frame of the user and populates
 * object with information about acceptable places.
 *
 * @param {number} time How much time the user wants to travel for in seconds
 * @param {array} places Array of place objects
 * @param {Object} acceptablePlacesInfo Object containing average time of all places and list of places within requested time
 * @return {Object} Contains total time of all places and an array of places objects that within 20% of given time
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

    let service = new google.maps.DistanceMatrixService();
    service.getDistanceMatrix({
      origins: [home],
      destinations: destinations,
      travelMode: 'DRIVING',
      unitSystem: google.maps.UnitSystem.IMPERIAL,
    }, callback);

    function callback(response, status) {
      let total_time = 0;
      let total_places = 0;

      if (status == 'OK') {
        // There is only one origin
        let results = response.rows[0].elements;
        const ThirtyMinsInSecs = 1800;

        for (let j = 0; j < results.length; j++) {
          let destination_info = results[j];

          if (destination_info.status == 'OK') {
            let destination_time = destination_info.duration.value;

            total_time += destination_time;
            total_places += 1;

            // Check if the destination time is within +- 30 minutes of requested travel time
            if (destination_time <= time + ThirtyMinsInSecs && destination_time >= time - ThirtyMinsInSecs) {
              acceptablePlacesInfo.places.push({
                name: places[j].name,
                geometry: places[j].geometry,
                timeInSeconds: destination_time,
                timeAsString: destination_info.duration.text
              });
            }
          }
        }
      }

      if (total_places == 0) {
        acceptablePlacesInfo.avg_time = 0;
      } else {
        acceptablePlacesInfo.avg_time = total_time/total_places;
      }

      resolve(acceptablePlacesInfo);
    }
  });
}
