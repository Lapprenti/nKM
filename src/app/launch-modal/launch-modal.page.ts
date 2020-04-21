import { Storage } from '@ionic/storage';
import { Component, OnInit } from '@angular/core';
import { NavParams, ModalController, Platform } from '@ionic/angular';

@Component({
  selector: 'app-launch-modal',
  templateUrl: './launch-modal.page.html',
  styleUrls: ['./launch-modal.page.scss'],
})
export class LaunchModalPage implements OnInit {

  constructor(
    public navParams: NavParams,
    public modalCtrl: ModalController,
    private storage: Storage,
    private platform: Platform
  ) { }

  ngOnInit() {
  }

  public closeModal() {
    this.modalCtrl.dismiss({
      dismissed: true
    });
  }

  deny() {
    this.storage.set('cgu_accept', false);
    this.platform.backButton.subscribeWithPriority(999999, () => {
      try {
        navigator['app'].exitApp();
      } catch (error) {
        console.log('Could not exit the app');
      }
    });
    this.closeModal();
  }

  accept() {
    this.storage.set('cgu_accept', true);
    this.closeModal();
  }

}
