import { Injectable } from '@angular/core';
import { Observable, Subject, of } from 'rxjs';

import { Storage } from '@ionic/storage';

@Injectable({
  providedIn: 'root'
})
export class SharedService {

  // init properties as subjects
  private mapStyle = new Subject<string>();
  private theme = new Subject<string>();

  constructor(private storage: Storage) {
  }

  getTheme(): Observable<string> {
    return this.theme.asObservable();
  }

  updateTheme(t: string) {
    this.theme.next(t);
  }

  getMapStyle(): Observable<string> {
    return this.mapStyle.asObservable();
  }

  updateMapStyle(t: string) {
    this.mapStyle.next(t);
  }
}
