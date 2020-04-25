import { SharedService } from './../shared.service';
import { Component, OnInit } from '@angular/core';
import { mapDarkStyle, mapLightStyle } from 'src/environments/environment';

import { Storage } from '@ionic/storage';

@Component({
  selector: 'app-configuration',
  templateUrl: './configuration.page.html',
  styleUrls: ['./configuration.page.scss'],
})
export class ConfigurationPage implements OnInit {

  public isDarkTheme = false;
  public circleRadius: number = null;
  public circleRadiusLastSavedValue: number = null;
  public btnSaveColor = 'primary';
  public btnSaveIcon = 'save-outline';
  public btnSaveDisabled = false;

  public btnDeleteShouldBeDisabled = false;
  public btnDeleteDataColor = 'danger';
  public btnDeleteDataContent = 'Supprimer les données';
  public btnDeleteClicked = false;

  constructor(private service: SharedService, private storage: Storage) {
    storage.get('style').then((theme) => {
      if (theme) {
        if (theme === 'dark') {
          this.isDarkTheme = true;
        } else {
          this.isDarkTheme = false;
        }
      }
    });

    this.service.getZoneCircleRadius().subscribe((circleRadius) => {

      // if it is the first load of the page, the circle value should be null
      // else we can say that it was a save
      if (this.circleRadius === null) {

        this.circleRadiusLastSavedValue = circleRadius;
        this.circleRadius = circleRadius;
        this.btnSaveDisabled = true;
      } else {

        this.circleRadiusLastSavedValue = this.circleRadius;
        this.circleRadius = circleRadius;

        if (circleRadius === this.circleRadiusLastSavedValue) {
          this.btnSaveDisabled = true;
          if (!this.btnDeleteShouldBeDisabled) {
            this.btnSaveColor = 'success';
            this.btnSaveIcon = 'checkmark-done-sharp';
          }
          if (this.btnDeleteShouldBeDisabled) {
            if (this.circleRadius !== 1000) {
              this.btnSaveColor = 'success';
              this.btnSaveIcon = 'checkmark-done-sharp';
              this.btnDeleteShouldBeDisabled = false;
              this.btnDeleteDataColor = 'danger';
              this.btnDeleteDataContent = 'Supprimer les données';
            } else {
              this.resetButtonSaveStyle();
              this.btnSaveDisabled = true;
            }
          }
        }
      }
    });
  }

  ngOnInit() {

  }

  changeTheme(event) {

    /**
     * Change global app theme mechanism
     */
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

    systemDark.addEventListener('change', (systemInitiatedDark) => {
      if (systemInitiatedDark.matches) {
        document.body.setAttribute('data-theme', 'dark');
      } else {
        document.body.setAttribute('data-theme', 'light');
      }
    });

    if (event.detail.checked) {

      // update the value threw common service (siblings components)
      this.service.updateMapStyle(mapDarkStyle);

      // update the theme on the local storage
      this.storage.set('style', 'dark');

      // set the global theme for the app (all except map)
      document.body.setAttribute('data-theme', 'dark');

    } else {

      // update the value threw common service (siblings components)
      this.service.updateMapStyle(mapLightStyle);

      // update the theme on the local storage
      this.storage.set('style', 'light');

      // set the global theme for the app (all except map)
      document.body.setAttribute('data-theme', 'light');
    }
  }

  resetButtonSaveStyle() {
    this.btnSaveColor = 'primary';
    this.btnSaveIcon = 'save-outline';
  }

  setRadiusValues(event: any) {
    this.circleRadius = event.detail.value;
    if (this.circleRadiusLastSavedValue === this.circleRadius) {
      this.btnSaveDisabled = true;
    } else {
      this.btnSaveDisabled = false;
    }
  }

  setRadiusCircles() {
    this.service.updateZoneCircleRadius(this.circleRadius);
  }

  removeAllData() {

    // remove all map data and so
    this.btnDeleteShouldBeDisabled = true;
    this.circleRadius = 1000;
    this.service.resetCircleRadius();
    this.service.deleteZonesData();

    this.btnDeleteDataColor = 'light';
    this.btnDeleteDataContent = 'Données supprimées';
  }

}
