import 'package:angular/angular.dart';
import 'package:google_maps/google_maps.dart';
/// The map control component that embeds the Google Maps widget and related
/// controls. Additionally it contains the distance calculation.
@Component(
    selector: 'gmap',
    templateUrl: 'map.html',
    styleUrls: ['map.css'])
class MapComponent implements AfterViewInit {
  GMap _map;
  /// The DOM element reference for the Google Maps initialization.
  @ViewChild('mapArea')
  ElementRef mapAreaRef;

  @override
  void ngAfterViewInit() {
    _map = new GMap(
        mapAreaRef.nativeElement,
        new MapOptions()
          ..zoom = 2
          ..center = new LatLng(47.4979, 19.0402) // Budapest, Hungary
        );
  }
}
