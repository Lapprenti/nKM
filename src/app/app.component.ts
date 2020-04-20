import { SharedService } from './shared.service';
import { Storage } from '@ionic/storage';
import { Component } from '@angular/core';

import { Platform } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { mapDarkStyle, mapLightStyle } from 'src/environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent {
  constructor(
    private platform: Platform,
    private splashScreen: SplashScreen,
    private statusBar: StatusBar,
    private storage: Storage,
    private service: SharedService
  ) {
    this.initializeApp();

    /**
     * Get the style property in local storage
     * If it does not exists create the key and link light by default (first launch)
     */
    this.storage.get('style').then((theme) => {
      console.log(theme);
      if (theme) {
        document.body.setAttribute('data-theme', theme);
      } else {

        // if first launch insert light theme
        this.storage.set('style', 'light');
      }
    });
  }

  initializeApp() {
    this.platform.ready().then(() => {
      this.statusBar.styleDefault();
      this.splashScreen.hide();

    });
  }
}
