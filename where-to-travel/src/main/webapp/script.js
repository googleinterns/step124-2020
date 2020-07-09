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

const examplePlaces = [
  {
    name: 'place',
    address: '123 xyz street',
    geometry: {
      location: {
        lat: 41.1745937,
        lng: -96.0450083
      }
    },
    timeAsString: '47'
  }
];

// Thresholds for termination of search algorithm
const placesThreshold = 30;
const attemptsThreshold = 10;
const directionThreshold = 5;

// Document ids for user input elements
const submitId = 'submit';
const hoursId = 'hrs';
const minutesId = 'mnts';
const scrollId = 'scroller';

let map;
let user;
let home = null;

let focussedCard;
let focussedPin;

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
  map.addListener('click', function () {
    if (focussedCard != null) {
      focussedCard.classList.remove('active');
    }

    if (focussedPin != null) {
      focussedPin.setIcon('icons/pin.svg');
    }
    focussedCard = null;
    focussedPin = null;
  });
  populatePlaces(examplePlaces);
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
  const hours = document.getElementById(hoursId).value;
  const minutes = document.getElementById(minutesId).value;
  // Convert hours and minutes into seconds
  const time = hours * 3600 + minutes * 60;
  getPlacesFromTime(time).then(places => {
    populatePlaces(places);
  });
}

/**
 * Populates map with pins. Given a list of places, puts markers at each
 * lat/long location with name of place and link to directions in Google Maps.
 *
 * @param {array} placeArray Array of Google Maps Place Objects
 */
function populatePlaces(placeArray) {
  for(let i = 0; i < placeArray.length; i++) {

    let name = placeArray[i].name;
    let address = placeArray[i].address;
    let coordinates = placeArray[i].geometry.location;

    // TODO: Use this link to provide directions to user
    let directionsLink = 'https://www.google.com/maps/dir/' +
      home.lat + ',' + home.lng + '/' +
      coordinates.lat + ',' + coordinates.lng;

    let timeStr = placeArray[i].timeAsString;

    let placeMarker = new google.maps.Marker({
      position: coordinates,
      map: map,
      title: name,
      icon: 'icons/pin.svg',
    });

    const htmlContent = getLocationCardHtml(name, address, timeStr);

    // For the material bootstrap library, the preferred method of dom interaction is jquery,
    // especially for adding elements.
    let cardElement = $(htmlContent).click(function(event) {
      if(event.target.nodeName != 'SPAN') {
        selectLocationMarker(name);
        $(this).addClass('active');
        focussedCard = this;
      }
    });
    $('#' + scrollId).append(cardElement);

    placeMarker.addListener('click', function () {
      focussedPin = placeMarker;
      selectLocationCard(placeMarker.getTitle());
      placeMarker.setIcon('icons/selectedPin.svg');
    });

    placeMarker.addListener('mouseover', function () {
      placeMarker.setIcon('icons/selectedPin.svg');
    });

    placeMarker.addListener('mouseout', function () {
      if (placeMarker != focussedPin) {
        placeMarker.setIcon('icons/pin.svg');
      }
    });

    markers.push(placeMarker);
  }
  $( ".icon" ).click(function() {
      $( ".icon" ).toggleClass("press");
  });
}

function getLocationCardHtml(title, address, timeStr) {
  return innerHtml = '' +
    `<div class="card location-card" placeName="${title}">
      <div class="card-body">
        <h5 class="card-title">${title}
        <span class="icon">
          &#9733
        <span>
        </h5>
        <p>${address}</p>
        <p>${timeStr}</p>
        <i></i>
      </div>
    </div>`;
}

function selectLocationMarker(title) {
  for (marker of markers) {
    if (marker.getTitle() == title) {
      focussedPin = marker;
      marker.setIcon('icons/selectedPin.svg');
    }
  }
}

function selectLocationCard(title) {
  scrollWindow = document.getElementById(scrollId);
  for (locationCard of scrollWindow.childNodes) {
    if (locationCard.hasChildNodes() && locationCard.getAttribute("placeName") == title) {
      locationCard.classList.add("active");
      focussedCard = locationCard;
    }
  }
}

/** Clears all place cards that are currently displayed. */
function clearPlaces() {
  const parent = document.getElementById(scrollId);
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
    if (filterResults.places.length >= placesThreshold) {
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


  while (attempts < attemptsThreshold && places.length < placesThreshold) {
    let new_directions = [];

    for (direction of directions) {
      let latSpread = direction[0];
      let lngSpread = direction[1];
      let place_candidates = await getPlacesFromDirection(home.lat + latSpread, home.lng + lngSpread);

      let filterResults = await filterByTime(time, place_candidates);
      places = places.concat(filterResults.places);

      // If bounding box does not contain enough results, update position of box for next iteration
      if (filterResults.places.length < directionThreshold) {
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
