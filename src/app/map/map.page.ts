import { mapBoxAccessToken } from './../../environments/environment';
import { Subject, Observable } from 'rxjs';

import { GeoService } from './../geo.service';
import { SharedService } from './../shared.service';
import { Component, OnInit } from '@angular/core';

import { Geolocation } from '@ionic-native/geolocation/ngx';

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


interface DefaultValues {
  _MAP_CONTAINER: string;
  _BEARING: number;
  _PITCH: number;
  _ZOOM: number;
  _MIN_ZOOM_ALLOWED: number;
  _MAX_ZOOM_ALLOWED: number;
  _FLY_TO_DURATION: number;
  _CIRCLE_RESOLUTION: number;
}

interface DynamicLocation {
  lat: number;
  lng: number;
}

interface GeographicData {
  userCenterPoints: FeatureCollection<Point>;
  userDefinedCircleRadius: number;
  generatedCircles: FeatureCollection<Polygon>;
}

interface MapData {
  default: DefaultValues;
  location: DynamicLocation;
  geographicData: GeographicData;
  style: string;
  autoSetMapCenter: boolean;
  isLoaded: boolean;
}

interface AutoCompleteData {
  centerPointsFound: FeatureCollection<Point>;
  shouldDisplayAddresses: boolean;
  userSelectedFeature: Feature<Point>;
  userSelectedFeatureName: string;
}

@Component({
  selector: 'app-map',
  templateUrl: './map.page.html',
  styleUrls: ['./map.page.scss'],
})
export class MapPage implements OnInit {

  //#region OLD Declared properties

  // static readonly _MAP_CONTAINER: string = 'map';

  // // North orientation
  // static readonly _DEFAULT_BEARING: number = 0;
  // static readonly _DEFAULT_PITCH: number = 40;

  // static readonly _DEFAULT_ZOOM: number = 15;
  // static readonly _MIN_ZOOM_ALLOWED: number = 1;
  // static readonly _MAX_ZOOM_ALLOWED: number = 22;
  // static readonly _FLY_TO_CURRENT_POSITION_DURATION = 2000;

  // // Map declarations
  // private mapStyle: string;
  // public map: Map;
  // public isMapNotLoaded = true;
  // public isMapLoaded = new Subject<boolean>();

  // // Source data for map layers
  // public userZonesData: FeatureCollection<Point>;
  // public userZonesDataAsCircles: FeatureCollection<Polygon> = {
  //   type: 'FeatureCollection',
  //   features: []
  // };
  // public userLocationData: FeatureCollection<Point> = {
  //   type: 'FeatureCollection',
  //   features: []
  // };

  // // Map Data Sources
  // public userSource: GeoJSONSourceOptions;
  // public zonesSource: GeoJSONSourceOptions;

  // // Map Data Layers
  // public userLayer: Layer;
  // public zonesLayer: Layer;

  // // Map Actions
  // public following: boolean;

  // // User location
  // private currentLng: number;
  // private currentLat: number;
  // public currentSpeed: number;

  // // Autocomplete properties init
  // public selectedFeature: Feature = null;
  // public selectedFeaturePlaceName = '';
  // public featureCollectionSearchResults: FeatureCollection<Point>;
  // public shouldDisplayAddresses = false;
  // public definedCircleRadius: number = null;

  //#endregion

  /** Map properties */
  public map: Map;
  public userSource: GeoJSONSourceOptions;
  public zonesSource: GeoJSONSourceOptions;
  public userLayer: Layer;
  public zonesLayer: Layer;

  /** Map data properties */
  private mapDataObservable = new Subject<MapData>();
  public mapDataObject: MapData = null;

  /** Location properties */
  private userCurrentLocation: DynamicLocation = null;
  private userPreviousLocation: DynamicLocation = null;
  private userLocation: FeatureCollection<Point>;

  /** Zones data properties */
  private geographicalData: GeographicData = null;
  private previousCircleRadius: number = null;

  /** Style data property */
  private previousStyle: string = null;

  /** Autocomplete module properties */
  public autocompleteResults: AutoCompleteData = null;

  constructor(
    private service: SharedService,
    private geoService: GeoService,
    private geolocation: Geolocation
    ) {

      // 0 - init style properties threw service
      this.service.initStyleProperties();

      // 1 - init data
      this.initMapData();
    }

  ngOnInit() {
    // 2 - subscribe map data
    this.getMapData().subscribe((mapData) => {
      if (
        mapData.style !== null
        &&
        mapData.geographicData.userDefinedCircleRadius !== null
        &&
        mapData.geographicData.generatedCircles !== null
        &&
        mapData.geographicData.userCenterPoints !== null
        &&
        mapData.location.lng !== null
        &&
        mapData.location.lat !== null
        ) {

        //
        // 8 - init map with data
        if ( !this.map ) {
          this.initSources();
          this.initLayers();
          this.initMap();
          this.addUserAnimatedIcon();
          this.addLayersAndSourcesToMap();
          this.trackMapLoading();
          this.trackMapTouch();
        } else {
          const userLayer = this.map.getSource('user');
          if (mapData.isLoaded && !userLayer) {
            this.layersAndSourcesOversight();
          }

          // case 1 - The user is moving
          if ( mapData.location !== this.userPreviousLocation && mapData.isLoaded) {
            this.updateMapPosition(mapData.location);
            this.updateUserPosition(mapData.location);
          }

          // case 2 - the user has changed the app style
          if ( mapData.style !== this.previousStyle) {
            this.updateMapStyle(mapData.style);
            // style is updated - prevent trigger this condition again
            this.previousStyle = mapData.style;
          }

          // case 3 - the circle radius is changed
          if (mapData.geographicData.userDefinedCircleRadius !== this.previousCircleRadius) {

            this.processCenterPoints().then((processComplete) => {
              if (processComplete) {
                this.refreshMapLayerSource('zones', this.mapDataObject.geographicData.generatedCircles);
              } else {
                console.log('An error happened while updating points.');
              }
            });

            // new circle radius is updated - prevent trigger this condition again
            this.previousCircleRadius = mapData.geographicData.userDefinedCircleRadius;
          }

          // case 4 - there is a new center point
          if (
            mapData.geographicData.userCenterPoints.features.length
             !==
            mapData.geographicData.generatedCircles.features.length
             &&
            mapData.isLoaded) {
            this.processCenterPoints().then((processComplete) => {
              if (processComplete) {
                this.refreshMapLayerSource('zones', this.mapDataObject.geographicData.generatedCircles);
              } else {
                console.log('This zone was already drawn.');
              }
            });
          }
        }
      } else {
        console.log('Data requirements are not loaded yet. Waiting before start building the map.');
      }
    });
  }

  ionViewDidEnter() {
    if (this.map) {
      this.map.resize();
    } else {
      // 3 - subscribe geolocation and update map data associated property
      this.geolocation.getCurrentPosition().then((initialGeoLocation) => {

        //#region initial geolocation process
        const initialLocation: DynamicLocation = {
          lng: initialGeoLocation.coords.longitude,
          lat: initialGeoLocation.coords.latitude
        };

        if ( this.userPreviousLocation === null) {
          this.userPreviousLocation = initialLocation;
        }
        this.userCurrentLocation = initialLocation;
        this.mapDataObject.location = this.userCurrentLocation;
        this.updateMapData(this.mapDataObject);
        //#endregion

        //#region user watch location process
        this.geolocation.watchPosition().subscribe( (dynamicGeolocation) => {
          this.userPreviousLocation = this.userCurrentLocation;

          const newUserCoordinates: DynamicLocation = {
            lng: dynamicGeolocation.coords.longitude,
            lat: dynamicGeolocation.coords.latitude
          };

          this.userCurrentLocation = newUserCoordinates;
          this.mapDataObject.location = this.userCurrentLocation;
          this.updateMapData(this.mapDataObject);
        });
        //#endregion
      }, (geoLocationRejected) => {
        console.log('The location access was rejected by the user : setting location to center of Dijon. ');

        const initialLocation: DynamicLocation = {
          lng: 5.034123,
          lat: 47.323889
        };

        this.userCurrentLocation = initialLocation;
        this.mapDataObject.location = this.userCurrentLocation;

        this.updateMapData(this.mapDataObject);
      }
      );

      // 4 - subscribe style and update map data associated property
      this.service.getMapStyle().subscribe((mapBoxStyle) => {
        this.previousStyle = this.mapDataObject.style;
        if (this.previousStyle === null) {
          this.previousStyle = mapBoxStyle;
        }
        this.mapDataObject.style = mapBoxStyle;
        this.updateMapData(this.mapDataObject);
      });

      // 5 - subscribe user saved radius and update map data associated property
      this.service.getZoneCircleRadius().subscribe((userSavedCircleRadius) => {
        this.previousCircleRadius = this.geographicalData.userDefinedCircleRadius;
        if (this.previousCircleRadius === null) {
          this.previousCircleRadius = userSavedCircleRadius;
        }
        this.geographicalData.userDefinedCircleRadius = userSavedCircleRadius;
        this.mapDataObject.geographicData.userDefinedCircleRadius = this.geographicalData.userDefinedCircleRadius;

        this.updateMapData(this.mapDataObject);
      });

      // 6 - subscribe user center points and update map data associated property
      this.service.getZonesData().subscribe((fcUserSavedPoints) => {
        this.geographicalData.userCenterPoints = fcUserSavedPoints;
        this.mapDataObject.geographicData.userCenterPoints = this.geographicalData.userCenterPoints;
        this.updateMapData(this.mapDataObject);
      });
    }
  }

  //#region Map creation and actions

  /**
   * Init values of geoJsonSource properties
   */
  public initSources() {
    // 1 - User source linked to data
    // 1.1 - create a feature collection linked to the user position
    //        as a source of the mapbox's map data
    const userLocationFeature: Feature<Point> = {
      geometry: {
        coordinates: [this.mapDataObject.location.lng, this.mapDataObject.location.lat],
        type: 'Point',
      },
      properties: [],
      type: 'Feature'
    };

    this.userLocation = {
      features: [userLocationFeature],
      type: 'FeatureCollection'
    };

    this.userSource = {
      data: this.userLocation,
      cluster: false
    };

    // 2 - Zones layer linked to data
    this.zonesSource = {
      data: this.mapDataObject.geographicData.generatedCircles,
      cluster: false
    };
  }

  /**
   * Init values of layers with geoJsonSource properties
   */
  public initLayers() {
    // 1 - User layer linked to data
    this.userLayer = {
      id: 'user',
      type: 'symbol',
      source: 'user',
      layout: {
        'icon-image': 'pulsing-dot',
        //'icon-size': 0.05
      }
    };

    // 2 - Zones layer linked to data
    this.zonesLayer = {
      id: 'zones',
      type: 'fill',
      source: 'zones',
      paint: {
        'fill-color': 'blue',
        'fill-opacity': 0.1
      }
    };
  }
  /**
   * Initializes the map
   */
  public initMap(): void {
    this.map = new Map({
      container: this.mapDataObject.default._MAP_CONTAINER,
      style: this.mapDataObject.style,
      zoom: this.mapDataObject.default._ZOOM,
      maxZoom: this.mapDataObject.default._MAX_ZOOM_ALLOWED,
      minZoom: this.mapDataObject.default._MIN_ZOOM_ALLOWED,
      center: [this.mapDataObject.location.lng, this.mapDataObject.location.lat],
      pitch: this.mapDataObject.default._PITCH,
      bearing: this.mapDataObject.default._BEARING,
      accessToken: mapBoxAccessToken
    });
  }

  /**
   * Resets the camera position on the user coordinates with a flying animation
   */
  public followUserCurrentPosition(): void {
    this.flyToPosition(this.mapDataObject.location);
    setTimeout(() => this.mapDataObject.autoSetMapCenter = true, this.mapDataObject.default._FLY_TO_DURATION);
  }

  /**
   * Update the map style
   * @param styleToSet the wanted new style for the map
   */
  public updateMapStyle(styleToSet: string) {
    this.map.setStyle(styleToSet);
    this.mapDataObject.isLoaded = false;
  }

  /**
   * Set the map center
   * @param newLocation to set the new center of the map
   */
  public updateMapPosition(newLocation: DynamicLocation): void {
    if ( this.mapDataObject.autoSetMapCenter ) {
      this.map.setCenter([newLocation.lng, newLocation.lat]);
    }
  }

  /**
   * Updates the user position to new coordinates
   */
  public updateUserPosition(location: DynamicLocation): void {
    if ( this.userLocation.features.length === 1 ) {
      const userLocation: Feature<Point> = {
        geometry: {
          coordinates: [location.lng, location.lat],
          type: 'Point',
        },
        properties: [],
        type: 'Feature'
      };
      this.userLocation.features[0].geometry.coordinates = [userLocation.geometry.coordinates[0], userLocation.geometry.coordinates[1]];
      this.refreshMapLayerSource('user', this.userLocation);
    }
  }

  /**
   * Animate a transition to a specific point on the map
   * @param newLocation position to fly to
   */
  public flyToPosition(newLocation: DynamicLocation) {
    this.map.flyTo({
      center: [newLocation.lng, newLocation.lat],
      zoom: this.mapDataObject.default._ZOOM,
      bearing: this.mapDataObject.default._BEARING,
      duration: this.mapDataObject.default._FLY_TO_DURATION,
      speed: 1,
      curve: 1,
      easing: (t) => t,
      essential: true,
    });
  }

  /**
   * Update the source data
   * @param id the id of the layer which is on the map
   * @param featureCollection the updated source of the layer
   */
  public refreshMapLayerSource(id: string, featureCollection: FeatureCollection<any>) {
    (this.map.getSource(id) as mapboxgl.GeoJSONSource).setData(featureCollection);
  }

  /**
   * Adds a data source to the map
   * @param id The data source id
   * @param source The data source object
   */
  public addLayersAndSourcesToMap(): void {
    this.map.on('load', () => {
      this.map.addSource('user', { type: 'geojson', ...this.userSource });
      this.map.addSource('zones', { type: 'geojson', ...this.zonesSource });
      this.addLayerToMap(this.userLayer);
      this.addLayerToMap(this.zonesLayer);
    });
  }

  /**
   * Can watch the map loading
   */
  public trackMapLoading() {
      this.map.on('idle', () => {
      if (this.map.areTilesLoaded() && this.map.isStyleLoaded() && !this.mapDataObject.isLoaded) {
        // update the property to true and update the map data object
        this.mapDataObject.isLoaded = true;
        this.updateMapData(this.mapDataObject);
      }
      this.map.triggerRepaint();
    });
  }

  /**
   * Set the auto center map to false
   */
  public trackMapTouch(): void {
    this.map.on('touchstart', () => {
      this.mapDataObject.autoSetMapCenter = false;
      this.updateMapData(this.mapDataObject);
    });
  }

  /**
   * Track sources and layer, add them when missing
   */
  public layersAndSourcesOversight() {
    try {
      const userSource = this.map.getSource('user');
      const zonesSource = this.map.getSource('zones');
      if (!userSource && !zonesSource) {
        this.addUserAnimatedIcon();
        this.map.addSource('user', { type: 'geojson', ...this.userSource });
        this.map.addSource('zones', { type: 'geojson', ...this.zonesSource });
        this.addLayerToMap(this.userLayer);
        this.addLayerToMap(this.zonesLayer);
      }
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * Adds a layer to the map
   * @param layer the layer to add on the map
   */
  public addLayerToMap(layer: Layer): void {
    this.map.addLayer(layer);
  }
  //#endregion

  //#region Zone logical process

  /**
   * Take last center point and gene
   */
  public processCenterPoints(): Promise<boolean> {

    this.mapDataObject.geographicData.generatedCircles.features = [];
    const centerPoints = this.mapDataObject.geographicData.userCenterPoints.features;

    const process = new Promise<boolean>((resolve, reject) => {

      try {
        centerPoints.forEach((centerPoint) => {
          // Generate one feature to draw on the map with radius taken from user setting associated
          const featureToDraw = this.generateCircle(
            [centerPoint.geometry.coordinates[0], centerPoint.geometry.coordinates[1]],
            this.mapDataObject.geographicData.userDefinedCircleRadius / 1000,
            this.mapDataObject.default._CIRCLE_RESOLUTION,
            centerPoint.id,
            this.autocompleteResults.userSelectedFeatureName
          );
          this.mapDataObject.geographicData.generatedCircles.features.push(featureToDraw);
        });
        resolve(true);
      } catch (error) {
        reject(false);
      }

    });

    return process;

  }
  //#endregion

  //#region Autocomplete searched address

  /**
   * Send the input value to the mapbox places API
   * @param event the event associated to the html element
   */
  search(event: any) {
    const searchTerm = event.target.value.toLowerCase();
    if (searchTerm && searchTerm.length > 0) {
      this.geoService
        .searchAddressWithWordStart(searchTerm)
        .subscribe((featureCollection: FeatureCollection<Point>) => {
          this.autocompleteResults.centerPointsFound = featureCollection;
          if (this.autocompleteResults.centerPointsFound.features) {
            if (this.autocompleteResults.centerPointsFound.features.length > 0) {
              this.autocompleteResults.shouldDisplayAddresses = true;
            }
          }
        });
      } else {
        this.autocompleteResults.shouldDisplayAddresses = false;
      }
  }

  /**
   * Add the address selected by the user to the map
   * @param feature the address chosen in the list
   */
  onSelectProposedAddress(feature: Feature<Point>) {
    this.autocompleteResults.shouldDisplayAddresses = false;
    this.autocompleteResults.userSelectedFeature = feature;

    /**
     * Feature returned by the mapbox api places does to fit with Feature<Point> specificities
     * Have to force access via string literal causing lint warning
     * "object access via string literals is disallowed"
     */
    this.autocompleteResults.userSelectedFeatureName = feature['place_name_fr'];

    const featureId = feature.id;
    const featureType = feature.type;
    const featureGeometry = feature.geometry;

    const featureLocation: DynamicLocation = {
      lng: feature.geometry.coordinates[0],
      lat: feature.geometry.coordinates[1]
    };

    // Handle if the feature is already in the dataset
    for (const circleCenterFeature of this.mapDataObject.geographicData.userCenterPoints.features) {
      if (circleCenterFeature.properties[0] === this.autocompleteResults.userSelectedFeatureName) {

        // Fly to the existing feature
        this.flyToPosition(featureLocation);

        return;
      }
    }

    // Generate one feature to save in db (the center of the circle)
    const featureToSave: Feature<Point> = {
      id: featureId,
      type: featureType,
      properties: [
        this.autocompleteResults.userSelectedFeatureName
      ],
      geometry: featureGeometry
    };

    // fly to freshly added feature
    this.flyToPosition(featureLocation);

    this.mapDataObject.geographicData.userCenterPoints.features.push(featureToSave);
    // this.updateMapData(this.mapDataObject);
    this.service.updateZonesData(this.mapDataObject.geographicData.userCenterPoints);
  }

  //#endregion

  //#region 0 - Map data interface management
  public initMapData(): void {

    // init default values
    const mapDefaultValues: DefaultValues = {
      _MAP_CONTAINER: 'map',
      _BEARING: 0,
      _PITCH: 40,
      _ZOOM: 14,
      _MIN_ZOOM_ALLOWED: 5,
      _MAX_ZOOM_ALLOWED: 18,
      _FLY_TO_DURATION: 3500,
      _CIRCLE_RESOLUTION: 512
    };

    //#region Geographical Data init
    const fcEmptyCenterPoints: FeatureCollection<Point> = {
      type: 'FeatureCollection',
      features: []
    };

    const fcEmptyCircles: FeatureCollection<Polygon> = {
      type: 'FeatureCollection',
      features: []
    };

    this.geographicalData = {
      userCenterPoints: fcEmptyCenterPoints,
      userDefinedCircleRadius: null,
      generatedCircles: fcEmptyCircles
    };
    //#endregion

    //#region autocomplete object
    this.autocompleteResults = {
      centerPointsFound: fcEmptyCenterPoints,
      shouldDisplayAddresses: false,
      userSelectedFeature: null,
      userSelectedFeatureName: null
    };
    //#endregion

    // User location object init
    this.userCurrentLocation = {
      lng: null,
      lat: null
    };

    // Construct the mapData object
    const mapInitiatedData: MapData = {
      default: mapDefaultValues,
      geographicData: this.geographicalData,
      location: this.userCurrentLocation,
      style: null,
      autoSetMapCenter: true,
      isLoaded: false
    };

    // Assign value generated to the map data object
    this.mapDataObject = mapInitiatedData;
  }

  //#region 0.1 get and update initial map data properties
  public getMapData(): Observable<MapData> {
    return this.mapDataObservable.asObservable();
  }
  public updateMapData(mapDataToUpdate: MapData): void {
    this.mapDataObservable.next(mapDataToUpdate);
  }
  //#endregion

  //#endregion

  //#region Map utilities
  /**
   * Functions that create a geoJSON circle
   * @param center array of coordinates
   * @param radiusInKm circle radius in kilometer
   * @param points the number of points (if 6 = hexagon)
   * @param id identifier of the polygon
   */
  generateCircle(center, radiusInKm, points, id = null, name = null) {
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
      properties: [id, name]
    };

    return circle;
  }
  //#endregion

  //#region other

  /**
   * Function that resize the map when loaded
   */
  verifyMapLoaded() {
    if (this.mapDataObject.isLoaded) {
      this.map.resize();
      return false;
    } else {
      return true;
    }
  }


  /**
   * Add the user image as asset in the map
   */
  addUserAnimatedIcon() {
    const width = 75;

    let pulsingDot = {
      width: width,
      height: width,
      data: new Uint8Array(width * width * 4),

      // get rendering context for the map canvas when layer is added to the map
      onAdd: function() {
        var canvas = document.createElement('canvas');
        canvas.width = this.width;
        canvas.height = this.height;
        this.context = canvas.getContext('2d');
      },

      // called once before every frame where the icon will be used
      render: function() {
        const duration = 1000;
        const t = (performance.now() % duration) / duration;

        const radius = (width / 2) * 0.3;
        const outerRadius = (width / 2) * 0.7 * t + radius;
        const context = this.context;

        // draw outer circle
        context.clearRect(0, 0, this.width, this.height);
        context.beginPath();
        context.arc(
          this.width / 2,
          this.height / 2,
          outerRadius,
          0,
          Math.PI * 2
        );
        context.fillStyle = 'rgba(56, 128, 255,' + (1 - t) + ')';
        context.fill();

        // draw inner circle
        context.beginPath();
        context.arc(
          this.width / 2,
          this.height / 2,
          radius,
          0,
          Math.PI * 2
        );
        context.fillStyle = 'rgba(56, 128, 255, 1)';
        context.strokeStyle = 'white';
        context.lineWidth = 2 + 4 * (1 - t);
        context.fill();
        context.stroke();

        // update this image's data with data from the canvas
        this.data =
        context.getImageData(
          0,
          0,
          width,
          width
        ).data;

        // return `true` to let the map know that the image was updated
        return true;
      }
    };

    this.map.addImage('pulsing-dot', pulsingDot, { pixelRatio: 2 });

  }

  //#endregion
}
