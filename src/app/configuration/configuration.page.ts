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

}
