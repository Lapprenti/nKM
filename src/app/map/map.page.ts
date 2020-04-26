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

interface DynamicLocation {
  lat : number;
  lng : number;
}

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
  public isMapNotLoaded = true;
  public isMapLoaded = new Subject<boolean>();

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
  private currentLng: number;
  private currentLat: number;
  public currentSpeed: number;
  public dynamicLocation = new Subject<DynamicLocation>();

  // Autocomplete properties init
  public selectedFeature: Feature = null;
  public selectedFeaturePlaceName = '';
  public featureCollectionSearchResults: FeatureCollection<Point>;
  public shouldDisplayAddresses = false;
  public definedCircleRadius: number = null;

  constructor(
    private service: SharedService,
    private geoService: GeoService,
    private geolocation: Geolocation
    ) {

    this.getGeolocation().subscribe((dL:DynamicLocation) => {
      console.log(dL)
      // Add the user location feature
      if(this.userLocationData.features.length === 0){
        const userFeature: Feature<Point> = {
          id: 'user',
          type: 'Feature',
          properties: [],
          geometry: {
            type: 'Point',
            coordinates: [dL.lng, dL.lat]
          }
        }
        this.addFeatureToDataset(userFeature, this.userLocationData);
      }

      

      if (this.map) {

        console.log('Une map existe')
        this.updateMapPosition(dL.lng, dL.lat);
        this.updateUserPosition(dL.lng, dL.lat);

      } else {

        console.log('nouvelle map')
        this.currentLng = dL.lng;
        this.currentLat = dL.lat;

        

        this.initMap()
      }
    })

    // this.storage.clear();
    this.service.initStyleProperties();

    this.GetIsMapLoaded().subscribe((isLoaded) => {
      this.isMapNotLoaded = false;

      /**
       * wait the map container to be sized as wanted and then resize
       * this trigger to early : "this.map.resize();"
       * but this is working ↓ (it wait still more than one line)
       */
      setTimeout(() => {
        this.map.resize();
      }, 0);
    });
  }

  ngOnInit() {

    // get the circle radius registered in local storage from service
    this.service.getZoneCircleRadius().subscribe((circleRadius: number) => {
      this.definedCircleRadius = circleRadius / 1000;
      if (this.map) {
        const zoneLayer = this.map.getLayer('zones');
        if (zoneLayer) {
          this.updateSourceZonesAsCircleDataSet(this.userZonesData);
        }
      }
    });

    // get the style and define if it has to create or update map
    this.service.getMapStyle().subscribe( (mapStyle) => {

      if (this.map) {
        this.map.setStyle(mapStyle);
        const zoneLayer = this.map.getLayer('zones');
        if (zoneLayer) {
          this.updateSourceZonesAsCircleDataSet(this.userZonesData);
        } else {
          this.map.addSource('user', { type: 'geojson', ...this.userSource });
          this.map.addSource('zones', { type: 'geojson', ...this.zonesSource });

          this.addLayerToMap(this.userLayer);
          this.addLayerToMap(this.zonesLayer);
        }
      } else {
        
        this.mapStyle = mapStyle;
        this.initSources();
        this.initLayers();
      }
    });

    //  get the user location collection for zones
    this.service.getZonesData().subscribe( (zones: FeatureCollection<Point>) => {
      // if there is not layer on map init, else update
      if (this.map) {
        const zoneLayer = this.map.getLayer('zones');
        this.userZonesData = zones;
        if (zoneLayer) {
          this.updateSourceZonesAsCircleDataSet(this.userZonesData);
        } else {
          this.initZonesDataSource(this.userZonesData);
        }
      } else {
        this.initZonesDataSource(this.userZonesData);
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
      center: [this.currentLng, this.currentLat],
      pitch: MapPage._DEFAULT_PITCH,
      bearing: MapPage._DEFAULT_BEARING,
      accessToken: mapBoxAccessToken
    });

    this.map.on('load', () => {
      this.addUserAnimatedIcon()
    });

    // triggered when the map style change (re add the missing layer if not exists)
    this.map.on('styledata', (status) => {
      try {
        const zoneLayer = this.map.getLayer('zones');
        if (!zoneLayer) {
          this.map.addSource('zones', { type: 'geojson', ...this.zonesSource });
          this.addLayerToMap(this.zonesLayer);
        }
        console.log(this.userSource)
        const userLayer = this.map.getLayer('user');
        if (!userLayer) {
          this.map.addSource('user', { type: 'geojson', ...this.userSource });
          this.addLayerToMap(this.userLayer);
        }
      } catch (error) {
        console.log(error);
      }
    });

    this.map.on('idle', () => {
      console.log('idle event');
      if (this.map.areTilesLoaded() && this.map.isStyleLoaded() && this.isMapNotLoaded) {
        // update the property
        this.isMapNotLoaded = false;
        this.isMapLoaded.next(true);
      }
      this.map.triggerRepaint();
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

  //#region user location management

  /**
   * Initializes the current coordinates and sets the coordinates update
   */
  public getGeolocation(): Observable<DynamicLocation> {
    this.geolocation.getCurrentPosition({ enableHighAccuracy: true })
        .then(
          (currentGeoLocation) => {
            this.currentLat = currentGeoLocation.coords.latitude;
            this.currentLng = currentGeoLocation.coords.longitude;
            this.currentSpeed = currentGeoLocation.coords.speed;

            // Update the value of dynamic location
            const dL: DynamicLocation = {
              'lat' : currentGeoLocation.coords.latitude,
              'lng' : currentGeoLocation.coords.longitude
            }
            this.dynamicLocation.next(dL)

            this.geolocation.watchPosition().subscribe(
              (dynamicGeoposition) => {
                console.log('dynamicGeoposition');
                console.log(dynamicGeoposition);

                const dL: DynamicLocation = {
                  'lat' : currentGeoLocation.coords.latitude,
                  'lng' : currentGeoLocation.coords.longitude
                }
                this.dynamicLocation.next(dL)

                this.currentSpeed = dynamicGeoposition.coords.speed;

                // this.updateMapPosition(this.currentLng, this.currentLat);
                // this.updateUserPosition(this.currentLng, this.currentLat);
              }, ( error ) => { console.log(error); }
            );
          });
    return this.dynamicLocation.asObservable();
  }

  /**
   * Fires events when the map is touched
   */
  public listenToMapTouch(): void {
    this.map.on('touchstart', () => {
      this.following = false;
    });
  }

  /**
   * Updates the map position to new coordinates
   * @param lng The new map center longitude
   * @param lat The new map center latitude
   */
  public updateMapPosition(lng: number, lat: number): void {
    if ( this.following ) {
      this.map.setCenter([lng, lat]);
    }
  }

  /**
   * Updates the user position to new coordinates
   * @param lng The new user position longitude
   * @param lat The new user position latitude
   */
  public updateUserPosition(lng: number, lat: number): void {
    if ( this.userLocationData.features[0] ) {
      this.userLocationData.features[0].geometry.coordinates = [lng, lat];
      this.updateSourceDataset('user', this.userLocationData);
    }
  }

  //#endregion


  //#region Autocomplete searched address

  search(event: any) {
    const searchTerm = event.target.value.toLowerCase();
    if (searchTerm && searchTerm.length > 0) {
      this.geoService
        .searchAddressWithWordStart(searchTerm)
        .subscribe((featureCollection: FeatureCollection<Point>) => {
          this.featureCollectionSearchResults = featureCollection;
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
    this.shouldDisplayAddresses = false;
    this.selectedFeature = feature;

    /**
     * Feature returned by the mapbox api places does to fit with Feature<Point> specificities
     * Have to force acces via string literal causing lint warning
     * "object access via string literals is disallowed"
     */
    this.selectedFeaturePlaceName = feature['place_name_fr'];

    const featureId = feature.id;
    const featureType = feature.type;
    const featureGeometry = feature.geometry;

    // Handle if the feature is already in the dataset
    for (const circleCenterFeature of this.userZonesData.features) {
      if (circleCenterFeature.properties[0] === this.selectedFeaturePlaceName) {

        // Fly to the existing feature
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

        return;
      }
    }

    // Generate one feature to save in db (the center of the circle)
    const featureToSave: Feature<Point> = {
      id: featureId,
      type: featureType,
      properties: [
        this.selectedFeaturePlaceName
      ],
      geometry: featureGeometry
    };

    // Generate one feature to draw on the map with radius taken from user setting associated
    const featureToDraw = this.generateCircle(
      [featureGeometry.coordinates[0], featureGeometry.coordinates[1]],
      1,
      512,
      featureId,
      this.selectedFeaturePlaceName
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

    this.service.updateZonesData(this.userZonesData);
  }
  //#endregion

  //#region map Data init

  addUserAnimatedIcon(){

    console.log('adding user animated icon')
    const width = 75

    var pulsingDot = {
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
        var duration = 1000;
        var t = (performance.now() % duration) / duration;
        
        var radius = (width / 2) * 0.3;
        var outerRadius = (width / 2) * 0.7 * t + radius;
        var context = this.context;
        
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
      context.fillStyle = 'rgba(255, 200, 200,' + (1 - t) + ')';
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
      context.fillStyle = 'rgba(255, 100, 100, 1)';
      context.strokeStyle = 'white';
      context.lineWidth = 2 + 4 * (1 - t);
      context.fill();
      context.stroke();
       
      // update this image's data with data from the canvas
      this.data = context.getImageData(
        0,
        0,
        width,
        width
      ).data;
       
      // continuously repaint the map, resulting in the smooth animation of the dot
      // this.map.triggerRepaint();
      // this.map.triggerRepaint();
       
      // return `true` to let the map know that the image was updated
      return true;
    }}

    this.map.addImage('pulsing-dot', pulsingDot, { pixelRatio: 2 });

  }
  

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
            this.definedCircleRadius,
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
        'icon-image': 'pulsing-dot',
        //'icon-size': 0.05
      }
    };

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

  //#endregion

  //#region Map Logic

  GetIsMapLoaded(): Observable<boolean> {
    return this.isMapLoaded.asObservable();
  }

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

  //#region Generate circles

  /**
   * Recreate all circle from scratch with center points and update source dataset
   * @param centerPoints the center points to use for update
   */
  updateSourceZonesAsCircleDataSet(centerPoints: FeatureCollection<Point>) {
    this.userZonesDataAsCircles.features = [];
    centerPoints.features.forEach((f: Feature<Point>) => {

      // Generate a circle with the Point location as center
      const currentCircleFeature: Feature<Polygon> =
        this.generateCircle(
          [f.geometry.coordinates[0], f.geometry.coordinates[1]],
          this.definedCircleRadius,
          512,
          f.id
        );

      // Add the generated polygon to data
      this.userZonesDataAsCircles.features.push(currentCircleFeature);
    });

    this.updateSourceDataset('zones', this.userZonesDataAsCircles);
  }

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
  // #endregion
}
