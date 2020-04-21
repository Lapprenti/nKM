import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { LaunchModalPageRoutingModule } from './launch-modal-routing.module';

import { LaunchModalPage } from './launch-modal.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    LaunchModalPageRoutingModule
  ],
  declarations: [LaunchModalPage]
})
export class LaunchModalPageModule {}
