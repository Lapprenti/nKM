import { GeoService } from './../geo.service';
import { Storage } from '@ionic/storage';
import { SharedService } from './../shared.service';
import { mapBoxAccessToken, mapLightStyle, mapDarkStyle } from './../../environments/environment';
import { Component, OnInit } from '@angular/core';

/** Map utilities imports */
import {
  Feature,
  FeatureCollection,
  Point
} from 'geojson';
import {
  Map,
  Layer,
  GeoJSONSourceOptions
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

  public userZonesData: FeatureCollection<Feature<Point>>;
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
    this.storage.get('userZonesData').then((fc): FeatureCollection<Feature<Point>> => {
      if (fc) {
        this.userZonesData = fc;
        console.log('was userZonesData');
        console.log(this.userZonesData);
      } else {
        this.userZonesData = {
          type: 'FeatureCollection',
          features: []
        };
        console.log('userZoneData new');
        console.log(this.userZonesData);
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

      setTimeout(() => {
        // this.map.addSource('user', { type: 'geojson', ...this.userSource });

        this.map.addSource('zones', { type: 'geojson', ...this.zonesSource });
        this.addLayerToMap(this.zonesLayer);
      }, 2000);
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
        .searchAddressWithWordStart(searchTerm).subscribe((featureCollection): FeatureCollection<Feature> => {
          this.featureCollectionSearchResults = featureCollection;
          console.log(featureCollection)
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

  onSelectProposedAddress(feature: Feature) {
    console.log(feature);
    this.shouldDisplayAddresses = false;
    this.selectedFeature = feature;
    this.selectedFeaturePlaceName = feature.place_name;

    const featureId = feature.id;
    const featureType = feature.type;
    const featureFrenchName: string = feature.place_name_fr;
    const featureGeometry = feature.geometry;

    const featureToSave: Feature<Point> = {
      id: featureId,
      type: featureType,
      properties: [
      ],
      geometry: featureGeometry
    };

    // add feature to map
    this.addFeatureToDataset(featureToSave, this.userZonesData);
    this.updateSourceDataset('zones', this.userZonesData);
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

    this.storage.set('userZonesData', this.userZonesData).then(status => {
      console.log('status')
      console.log(status)
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

    this.zonesSource = {
      data: this.userZonesData,
      cluster: false
    };
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
      type: 'circle',
      source: 'zones',
      paint: {
        'circle-radius': 10,
        'circle-color': '#B42222'
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
  public updateSourceDataset(id: string, data: FeatureCollection<Point>): void {
    (this.map.getSource(id) as mapboxgl.GeoJSONSource).setData(data);
  }

  /**
   * Adds a feature to a map data source dataset
   * @param feature The feature to add to the dataset
   * @param dataset The dataset to add the feature in
   */
  public addFeatureToDataset(feature: Feature<Point>, dataset: FeatureCollection<Point>): void {
    dataset.features.push(feature);
    // if ( dataset.features.findIndex(element => element.id === feature.id) === -1 ) {
    //   dataset.features.push(feature);
    // }
  }

  public addLayerToMap(layer: Layer): void {
    this.map.addLayer(layer);
  }
  //#endregion

}
