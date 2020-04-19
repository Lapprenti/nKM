import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SharedService {

  constructor() { }

  // private theme: string;
  private theme = new Subject<string>();

  getTheme(): Observable<string> {
    console.log();
    return this.theme.asObservable();
  }

  updateTheme(t: string) {
    this.theme.next(t);
  }
}
