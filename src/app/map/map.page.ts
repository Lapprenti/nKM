import { Storage } from '@ionic/storage';
import { SharedService } from './../shared.service';
import { mapBoxAccessToken, mapLightStyle, mapDarkStyle } from './../../environments/environment';
import { Component, OnInit } from '@angular/core';

import {
  Map
} from 'mapbox-gl';

@Component({
  selector: 'app-map',
  templateUrl: './map.page.html',
  styleUrls: ['./map.page.scss'],
})
export class MapPage implements OnInit {

  static readonly _MAP_CONTAINER: string = 'map';
  static readonly _DEFAULT_ZOOM: number = 16;
  static readonly _MIN_ZOOM_ALLOWED: number = 1;
  static readonly _MAX_ZOOM_ALLOWED: number = 22;

  // default light style
  private mapStyle = '';
  public map: Map;

  constructor(private storage: Storage, private service: SharedService) {
    console.log('ctor')
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
  }

  ngOnInit() {
    console.log('nginit')
    // this.initMap();
    this.service.getMapStyle().subscribe( (mapStyle) => {
      console.log(mapStyle)
      if (this.map) {
        console.log('map deja existante changement du fond de carte');
        this.map.setStyle(mapStyle);
      } else {
        console.log('initialisation de la map');
        this.mapStyle = mapStyle;
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
      zoom: MapPage._MIN_ZOOM_ALLOWED,
      maxZoom: MapPage._MAX_ZOOM_ALLOWED,
      center: [47.322194, 5.041960],
      accessToken: mapBoxAccessToken
    });

    this.map.on('load', () => {
      this.map.resize();
    });
  }

  public listenMapOnLoad() {
    // this.map.on('load', () => {
    //   console.log('je recharge');
    //   this.map.resize();
    // });
  }

}
