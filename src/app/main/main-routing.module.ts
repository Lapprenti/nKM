import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { MainPage } from './main.page';

const routes: Routes = [
  {
    path: '',
    component: MainPage,
    children: [
      {
        path: 'map',
        children: [
          {
            path: '',
            loadChildren: () =>
              import('../map/map.module').then( m => m.MapPageModule)
          }
        ]
      },
      {
        path: 'configuration',
        children: [
          {
            path: '',
            loadChildren: () =>
            import('../configuration/configuration.module').then( cfg => cfg.ConfigurationPageModule)
          }
        ]
      },
      {
        path: '',
        redirectTo: '/main/map',
        pathMatch: 'full'
      }
    ],
  },
  {
    path: '',
    redirectTo: '/main/map',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MainPageRoutingModule {}
