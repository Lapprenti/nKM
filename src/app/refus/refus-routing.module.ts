import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { RefusPage } from './refus.page';

const routes: Routes = [
  {
    path: '',
    component: RefusPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RefusPageRoutingModule {}
