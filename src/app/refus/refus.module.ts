import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { RefusPageRoutingModule } from './refus-routing.module';

import { RefusPage } from './refus.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RefusPageRoutingModule
  ],
  declarations: [RefusPage]
})
export class RefusPageModule {}
