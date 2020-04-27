import { Injectable } from '@angular/core';
import { Observable, Subject, of } from 'rxjs';

import { Storage } from '@ionic/storage';
import { FeatureCollection, Point } from 'geojson';
import { mapDarkStyle, mapLightStyle } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SharedService {

  // init properties as subjects
  private mapStyle = new Subject<string>();
  private theme = new Subject<string>();
  private zonesData = new Subject<FeatureCollection<Point>>();
  private zoneCircleRadius = new Subject<number>();

  constructor(private storage: Storage) {}

  //#region User preferences

  initStyleProperties() {
    this.storage.get('style').then((theme) => {
      if (theme) {
        if (theme === 'dark') {
          this.updateMapStyle(mapDarkStyle);
          this.updateTheme('dark');
        } else {
          this.updateMapStyle(mapLightStyle);
          this.updateTheme('light');
        }
      } else {

        // if first launch insert light theme
        this.storage.set('style', 'light');
        this.updateMapStyle(mapLightStyle);
        this.updateTheme('light');
      }
    });
  }

  getTheme(): Observable<string> {
    return this.theme.asObservable();
  }

  updateTheme(t: string) {

    // set the global theme for the app
    document.body.setAttribute('data-theme', t);

    // update the theme on the local storage
    this.storage.set('style', t);

    // update the property
    this.theme.next(t);
  }

  getMapStyle(): Observable<string> {
    return this.mapStyle.asObservable();
  }

  updateMapStyle(t: string) {
    this.mapStyle.next(t);
  }

  getZoneCircleRadius(): Observable<number> {
    this.storage.get('circleRadius').then((circleRadius) => {
      console.log('circle radius');
      console.log(circleRadius);
      if (circleRadius) {
        this.updateZoneCircleRadius(circleRadius);
      } else {

        // first launch default circle radius
        this.storage.set('circleRadius', 1000);
      }
    }).catch((error) => console.log('An error happened getting the saved circle radius → ' + error));
    return this.zoneCircleRadius.asObservable();
  }

  updateZoneCircleRadius(n: number) {
    this.storage.set('circleRadius', n);
    this.zoneCircleRadius.next(n);
  }

  resetCircleRadius() {
    this.storage.set('circleRadius', 1000);
    this.zoneCircleRadius.next(1000);
  }

  //#endregion

  //#region Map data management

  /**
   * Get data from the local storage
   */
  getZonesData(): Observable<FeatureCollection<Point>> {
    this.storage.get('userZonesData').then((zones: FeatureCollection<Point>) => {
      if (zones) {
        this.zonesData.next(zones);
      } else {
        // init an empty feature collection
        this.zonesData.next({
          type: 'FeatureCollection',
          features: []
        });
      }
    }).catch((error) => console.log('An error happened getting all center of circles → ' + error));
    return this.zonesData.asObservable();
  }

  /**
   * Change value of property and save in storage
   * @param zones the feature collection to save
   */
  updateZonesData(zones: FeatureCollection<Point>) {
    this.zonesData.next(zones);
    this.storage.set('userZonesData', zones).then(() => {
      console.log('Locations data were updated.');
    });
  }

  deleteZonesData() {

    // update source data as an empty feature collection
    const emptyFeatureCollection: FeatureCollection<Point> = {
      type: 'FeatureCollection',
      features: []
    };
    this.updateZonesData(emptyFeatureCollection);
  }

  //#endregion
}
