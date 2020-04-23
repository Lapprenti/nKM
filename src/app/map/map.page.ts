import { GeoService } from './../geo.service';
import { Storage } from '@ionic/storage';
import { SharedService } from './../shared.service';
import { mapBoxAccessToken, mapLightStyle, mapDarkStyle } from './../../environments/environment';
import { Component, OnInit } from '@angular/core';

/** Map utilities imports */
import {
  Feature,
  FeatureCollection,
  Point,
  Polygon
} from 'geojson';
import {
  Map,
  Layer,
  GeoJSONSourceOptions,
  GeoJSONSource
} from 'mapbox-gl';

@Component({
  selector: 'app-map',
  templateUrl: './map.page.html',
  styleUrls: ['./map.page.scss'],
})
export class MapPage implements OnInit {

  static readonly _MAP_CONTAINER: string = 'map';

  // North orientation
  static readonly _DEFAULT_BEARING: number = 0;
  static readonly _DEFAULT_PITCH: number = 40;

  static readonly _DEFAULT_ZOOM: number = 15;
  static readonly _MIN_ZOOM_ALLOWED: number = 1;
  static readonly _MAX_ZOOM_ALLOWED: number = 22;
  static readonly _FLY_TO_CURRENT_POSITION_DURATION = 2000;

  // Map declarations
  private mapStyle: string;
  public map: Map;

  // Source data for map layers
  public userZonesData: FeatureCollection<Point>;
  public userZonesDataAsCircles: FeatureCollection<Polygon> = {
    type: 'FeatureCollection',
    features: []
  };
  public userLocationData: FeatureCollection<Point> = {
    type: 'FeatureCollection',
    features: []
  };

  // Map Data Sources
  public userSource: GeoJSONSourceOptions;
  public zonesSource: GeoJSONSourceOptions;

  // Map Data Layers
  public userLayer: Layer;
  public zonesLayer: Layer;

  // Map Actions
  public following: boolean;

  // User location
  private currentLng = 5.046429;
  private currentLat = 47.341877;

  // Autocomplete properties init
  public selectedFeature: Feature = null;
  public selectedFeaturePlaceName = '';
  public featureCollectionSearchResults: FeatureCollection<Point>;
  public shouldDisplayAddresses = false;

  constructor(
    private storage: Storage,
    private service: SharedService,
    private geoService: GeoService
    ) {
    // this.storage.clear();
    this.storage.get('style').then((theme) => {
      if (theme) {
        if (theme === 'dark') {
          this.service.updateMapStyle(mapDarkStyle);
          this.service.updateTheme('dark');
        } else {
          this.service.updateMapStyle(mapLightStyle);
          this.service.updateTheme('light');
        }
      }
    });

    // Get the user saved data or create one empty
    this.storage.get('userZonesData').then((fc: FeatureCollection<Point>): any => {
      if (fc) {
        this.userZonesData = fc;
        console.log('was userZonesData');
        console.log(this.userZonesData);
        this.initZonesDataSource(fc);
      } else {
        this.userZonesData = {
          type: 'FeatureCollection',
          features: []
        };
        console.log('userZoneData new');
        console.log(this.userZonesData);
        this.initZonesDataSource();
      }
    });
  }

  ngOnInit() {

    this.service.getMapStyle().subscribe( (mapStyle) => {
      if (this.map) {
        this.map.setStyle(mapStyle);
      } else {
        this.mapStyle = mapStyle;
        this.initSources();
        this.initLayers();
        this.initMap();
      }
    });
  }

  /**
   * Initializes the map
   */
  public initMap(): void {
    this.map = new Map({
      container: MapPage._MAP_CONTAINER,
      style: this.mapStyle,
      zoom: MapPage._DEFAULT_ZOOM,
      maxZoom: MapPage._MAX_ZOOM_ALLOWED,
      center: [5.041960, 47.322197],
      pitch: MapPage._DEFAULT_PITCH,
      bearing: MapPage._DEFAULT_BEARING,
      accessToken: mapBoxAccessToken
    });

    this.map.on('load', () => {
      this.map.resize();
      console.log('this.userZonesDataAsCircles');
      console.log(this.userZonesDataAsCircles);
      this.map.addSource('zones', { type: 'geojson', ...this.zonesSource });
      this.addLayerToMap(this.zonesLayer);
    });


  }

  /**
   * Resets the camera position on the user coordinates with a flying animation
   */
  public fixCamera(): void {
    this.map.flyTo({
      center: [this.currentLng, this.currentLat],
      zoom: MapPage._DEFAULT_ZOOM,
      bearing: MapPage._DEFAULT_BEARING,
      pitch: MapPage._DEFAULT_PITCH,
      duration: MapPage._FLY_TO_CURRENT_POSITION_DURATION,
      speed: 1,
      curve: 1,
      easing: (t) => t,
      essential: true,
    });
    setTimeout(() => this.following = true, MapPage._FLY_TO_CURRENT_POSITION_DURATION);
  }


  //#region Autocomplete searched address
  getLocationWithName(test: any) {
    console.log(test);
  }

  search(event: any) {
    const searchTerm = event.target.value.toLowerCase();
    if (searchTerm && searchTerm.length > 0) {
      this.geoService
        .searchAddressWithWordStart(searchTerm)
        .subscribe((featureCollection: FeatureCollection<Point>) => {
          console.log(featureCollection);
          this.featureCollectionSearchResults = featureCollection;
          console.log(this.featureCollectionSearchResults);
          if (this.featureCollectionSearchResults.features) {
            if (this.featureCollectionSearchResults.features.length > 0) {
              this.shouldDisplayAddresses = true;
            }
          }
        });
      } else {
        this.shouldDisplayAddresses = false;
      }
  }

  onSelectProposedAddress(feature: Feature<Point>) {
    console.log(feature);
    this.shouldDisplayAddresses = false;
    this.selectedFeature = feature;
    this.selectedFeaturePlaceName = feature.properties.place_name;

    const featureId = feature.id;
    const featureType = feature.type;
    // const featureFrenchName: string = feature.properties.place_name_fr;
    const featureGeometry = feature.geometry;

    const featureToSave: Feature<Point> = {
      id: featureId,
      type: featureType,
      properties: [
      ],
      geometry: featureGeometry
    };

    const featureToDraw = this.generateCircle(
      [featureGeometry.coordinates[0], featureGeometry.coordinates[1]],
      1,
      512,
      featureId
    );

    // data sets updates
    this.addFeatureToDataset(featureToSave, this.userZonesData);
    this.addFeatureToDataset(featureToDraw, this.userZonesDataAsCircles);
    this.updateSourceDataset('zones', this.userZonesDataAsCircles);

    // fly to freshly added feature
    this.map.flyTo({
      center: [feature.geometry.coordinates[0], feature.geometry.coordinates[1]],
      zoom: MapPage._DEFAULT_ZOOM,
      bearing: MapPage._DEFAULT_BEARING,
      duration: MapPage._FLY_TO_CURRENT_POSITION_DURATION,
      speed: 1,
      curve: 1,
      easing: (t) => t,
      essential: true,
    });

    // update the registered data
    this.storage.set('userZonesData', this.userZonesData).then(status => {
      console.log('status');
      console.log(status);
    });
  }
  //#endregion

  //#region map Data


  /**
   * Initializes the map data sources
   */
  public initSources(): void {
    this.userSource = {
      data: this.userLocationData,
      cluster: false
    };
  }
  public initZonesDataSource(centerPoints: FeatureCollection<Point> = null): void {

    if (centerPoints) {
      centerPoints.features.forEach((f: Feature<Point>) => {

        // Generate a circle with the Point location as center
        const currentCircleFeature: Feature<Polygon> =
          this.generateCircle(
            [f.geometry.coordinates[0], f.geometry.coordinates[1]],
            1,
            512,
            f.id
          );

        // Add the generated polygon to data
        this.userZonesDataAsCircles.features.push(currentCircleFeature);
      });
    }

    this.zonesSource = {
      data: this.userZonesDataAsCircles,
      cluster: false
    };

    console.log('this.zonesSource');
    console.log(this.zonesSource);
  }

  /**
   * Initializes the map data layers
   */
  public initLayers(): void {
    this.userLayer = {
      id: 'user',
      type: 'symbol',
      source: 'user',
      layout: {
        'icon-image': 'user',
        'icon-size': 0.05
      }
    };

    this.zonesLayer = {
      id: 'zones',
      type: 'fill',
      source: 'zones',
      paint: {
        'fill-color': 'blue',
        'fill-opacity': 0.6
      }
    };
  }

  //#endregion

  //#region Map Logic

  /**
   * Updates a map data source dataset
   * @param id The data source id
   * @param data The data source new dataset
   */
  public updateSourceDataset(id: string, data: FeatureCollection): void {
    (this.map.getSource(id) as mapboxgl.GeoJSONSource).setData(data);
  }

  /**
   * Adds a feature to a map data source dataset
   * @param feature The feature to add to the dataset
   * @param dataset The dataset to add the feature in
   */
  public addFeatureToDataset(feature: Feature, dataset: FeatureCollection): void {
    dataset.features.push(feature);
    // if ( dataset.features.findIndex(element => element.id === feature.id) === -1 ) {
    //   dataset.features.push(feature);
    // }
  }

  /**
   * Adds a data source to the map
   * @param id The data source id
   * @param source The data source object
   */
  public addSourceToMap(id: string, source: GeoJSONSource): void {
    this.map.addSource(id, source);
  }

  public addLayerToMap(layer: Layer): void {
    this.map.addLayer(layer);
  }
  //#endregion

  //#region Generate circle from point
  /**
   * Functions that create a geoJSON circle
   * @param center array of coordinates
   * @param radiusInKm circle radius in kilometer
   * @param points the number of points (if 6 = hexagon)
   * @param id identifier of the polygon
   */
  generateCircle(center, radiusInKm, points, id = null) {
    if (!points) { points = 1000; }

    const coords = {
        latitude: center[1],
        longitude: center[0]
    };

    const km = radiusInKm;

    const ret = [];
    const distanceX = km / (111.320 * Math.cos(coords.latitude * Math.PI / 180));
    const distanceY = km / 110.574;

    let theta, x, y;
    for ( let i = 0; i < points ; i++) {
        theta = ( i / points ) * ( 2 * Math.PI);
        x = distanceX * Math.cos(theta);
        y = distanceY * Math.sin(theta);

        ret.push([coords.longitude + x, coords.latitude + y]);
    }
    ret.push(ret[0]);

    const circle: Feature<Polygon> =  {
      type: 'Feature',
      geometry: {
          type: 'Polygon',
          coordinates: [ret]
      },
      properties: [id]
    };

    return circle;
  }
  ////#endregion
}
