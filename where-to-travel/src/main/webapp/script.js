//This is map stylings for the GMap api
const mapStyles = [
  {
    "featureType": "landscape",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "labels.icon",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "transit",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  }
];
//End map stylings

const submitId = "submit";
const hoursId = "hrs";
const minutesId = "mnts";

let map;
let home = null;

/**
  initializes map window, ran on load
 */
function initialize() {
  // TODO: Replace this line with getting location from Priya
  // home = Priya.getUserLocation();
  let home = {lat: -33.86, lng: 151.2027};
  let mapOptions = {
    center: new google.maps.LatLng(-33.868, 151.2),
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    zoom: 16,
    mapTypeControl: false,
    styles: mapStyles
  };	 
  map = new google.maps.Map(document.getElementById("map"), mapOptions);

  let homeMarker = new google.maps.Marker({
    position: home,
    map: map,
    title: 'Home'
  });
}

let submit = Document.getElementById(submit);
submit.addEventListener('click', submitDataListener);

function submitDataListener(event) {
  let hours = Document.getElementById(hoursId).value;
  let minutes = Document.getElementById(minutesId).value;
  let timeObj = { "hours": hours, "minutes": minutes};
  // TODO: Here, call Priya's function to get list of places from time object
  // places = Priya.getPlacesFromTime(timeObj);
  // populatePlaces(places);
}

function populatePlaces(placeArray) {
  let i;
  for(i = 0; i < placeArray.length; i++) {
    let name = placeArray[i].name;
    let coordinates = placeArray[i].geometry.location;
    let placeMarker = new google.maps.Marker({
      position: coordinates,
      map: map,
      title: name
    });

    let infowindow = new google.maps.InfoWindow({
      content: name
    });

    placeMarker.addListener('click', function() {
      infowindow.open(map, placeMarker);
    });
  }
}
 
