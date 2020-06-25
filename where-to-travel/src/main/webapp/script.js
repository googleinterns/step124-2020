let mapStyles = [
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

function initialize() {
let home = {lat: 39.749, lng: -104.994};
        let place = {lat: 39.8, lng: -104.994};
    var mapOptions = {
            center: new google.maps.LatLng(40.435833800555567, -78.44189453125),
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            zoom: 11,
            mapTypeControl: false,
            styles: myStyles
          };	 
  var map = new google.maps.Map(document.getElementById("map"), mapOptions);

  var contentString = 
    '<div id="content">'+
      '<div id="siteNotice">'+
      '</div>'+
      '<h1 id="firstHeading" class="firstHeading">Place</h1>'+
      '<div id="bodyContent">'+
        '<p>Lorem Ipsum</p>'+
        '<p>more styled text with html <a href=#>link</a></p>'+
      '</div>'+
    '</div>';

  var infowindow = new google.maps.InfoWindow({
    content: contentString
  });

  var placeMarker = new google.maps.Marker({
    position: place,
    map: map,
    title: 'A place'
  });

  var homeMarker = new google.maps.Marker({
    position: home,
    map: map,
    title: 'A place'
  });

  placeMarker.addListener('click', function() {
    infowindow.open(map, placeMarker);
  });
}
 
