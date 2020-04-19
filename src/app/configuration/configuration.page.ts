import { SharedService } from './../shared.service';
import { AppPage } from './../../../e2e/src/app.po';
import { MapPage } from './../map/map.page';
import { environment } from './../../environments/environment.prod';
import { Component, OnInit } from '@angular/core';
import { mapDarkStyle, mapLightStyle } from 'src/environments/environment';



@Component({
  selector: 'app-configuration',
  templateUrl: './configuration.page.html',
  styleUrls: ['./configuration.page.scss'],
})
export class ConfigurationPage implements OnInit {

  constructor(private service: SharedService) {
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
      this.service.updateTheme(mapDarkStyle);
      document.body.setAttribute('data-theme', 'dark');
    } else {
      this.service.updateTheme(mapLightStyle);
      document.body.setAttribute('data-theme', 'light');
    }
  }

}
