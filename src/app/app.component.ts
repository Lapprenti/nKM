import { LaunchModalPage } from './launch-modal/launch-modal.page';
import { ModalController } from '@ionic/angular';

import { SharedService } from './shared.service';
import { Storage } from '@ionic/storage';
import { Component } from '@angular/core';

import { Platform } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';

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
    private service: SharedService,
    public modalController: ModalController
  ) {
    this.initializeApp();

    /**
     * Get the legal acceptation in local storage
     * Show the acceptation modal while the user did not accepted
     */
    this.storage.get('cgu_accept').then((accepted) => {

      // The legal part is not already agreed or not exists
      if (!accepted) {
        this.showModal();
      }

    });

    /**
     * Get the style property in local storage threw service
     * If it does not exists create the key and link light by default (first launch)
     */
    this.service.initStyleProperties();
  }

  initializeApp() {
    this.platform.ready().then(() => {
      this.statusBar.styleDefault();
      this.splashScreen.hide();
    });
  }

  async showModal() {
    const modal = await this.modalController.create({
      component: LaunchModalPage,
      componentProps: { },
      showBackdrop: true,
      backdropDismiss: false
    });
    return await modal.present();
  }
}
