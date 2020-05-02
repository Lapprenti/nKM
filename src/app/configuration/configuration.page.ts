import { SharedService } from './../shared.service';
import { Component, OnInit } from '@angular/core';
import { mapDarkStyle, mapLightStyle } from 'src/environments/environment';

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

  constructor(private service: SharedService) {
    service.initStyleProperties();
    service.getTheme().subscribe((theme) => {
      if (theme === 'dark') {
        this.isDarkTheme = true;
      } else {
        this.isDarkTheme = false;
      }
    });

    /**
     * Subscribe to circle radius property in database
     */
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
    toggleDarkTheme(systemDark.matches);

    // Listen for changes to the prefers-color-scheme media query
    systemDark.addListener((mediaQuery) => toggleDarkTheme(mediaQuery.matches));

    // Add or remove the "dark" class based on if the media query matches
    function toggleDarkTheme(shouldAdd) {
      document.body.classList.toggle('dark', shouldAdd);
    }

    // // A tester sur iPhone avec environnment dark et light
    // systemDark.addEventListener(('change'), (systemInitiatedDark) => {
    //   if (systemInitiatedDark.matches) {
    //     document.body.classList.toggle('dark', true);
    //     // document.body.setAttribute('data-theme', 'dark');
    //   } else {
    //     document.body.classList.toggle('dark', false);
    //     // document.body.setAttribute('data-theme', 'light');
    //   }
    // });

    if (event.detail.checked) {

      // update the value threw common service (siblings components)
      this.service.updateMapStyle(mapDarkStyle);
      this.service.updateTheme('dark');

      // enable the delete all data button
      this.resetButtonDeleteStyle();
      this.btnDeleteShouldBeDisabled = false;

    } else {

      // update the value threw common service (siblings components)
      this.service.updateMapStyle(mapLightStyle);
      this.service.updateTheme('light');
    }
  }

  resetButtonSaveStyle() {
    this.btnSaveColor = 'primary';
    this.btnSaveIcon = 'save-outline';
  }

  resetButtonDeleteStyle() {
    this.btnDeleteDataColor = 'danger';
    this.btnDeleteDataContent = 'Supprimer les données';
  }

  setRadiusValues(event: any) {

    // need to cast for the condition as the number is on string values
    this.circleRadius = Number(event.detail.value);

    // the circle radius and the the last saved value are equal, the save button is disabled
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
    this.btnDeleteShouldBeDisabled = true;
    this.btnDeleteDataColor = 'light';
    this.btnDeleteDataContent = 'Données supprimées';
    this.isDarkTheme = false;

    // remove all map data and so
    this.circleRadius = 1000;
    this.service.resetCircleRadius();
    this.service.deleteZonesData();
  }

}
