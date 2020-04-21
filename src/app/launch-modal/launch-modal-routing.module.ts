import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { LaunchModalPage } from './launch-modal.page';

const routes: Routes = [
  {
    path: '',
    component: LaunchModalPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LaunchModalPageRoutingModule {}
