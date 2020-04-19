import { Subject } from 'rxjs';
import { SharedService } from './../shared.service';
import { mapBoxAccessToken, mapStyle, mapDarkStyle, mapLightStyle } from './../../environments/environment';
import { Component, OnInit } from '@angular/core';

import { environment } from '../../environments/environment';

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
  private mapStyle = mapLightStyle;
  public map: Map;

  constructor(private service: SharedService) {

    // observe the service property if change set new style
    service.getTheme().subscribe( (t) => {
      this.map.setStyle(t);
    });
  }

  ngOnInit() {
    this.initMap();
  }

  ngAfterContentInit(): void {
    this.listenMapOnLoad();
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

    this.map.resize();
  }

  public listenMapOnLoad() {
    this.map.on('load', () => {
      console.log('je recharge');
      this.map.resize();
    });
  }

}
