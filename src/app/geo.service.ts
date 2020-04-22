import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { mapBoxAccessToken } from 'src/environments/environment';

import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class GeoService {

  constructor(private http: HttpClient) { }

  searchAddressWithWordStart(query: string) {
    const url = 'https://api.mapbox.com/geocoding/v5/mapbox.places/';
    return this.http.get(url + query + '.json?types=address&access_token='
    + mapBoxAccessToken
    + '&limit=7'
    + '&country=BE,FR,GP,GF,GY,LU,MF,MC,PF,RE,YT,WF'
    + '&language=fr'
    );
  }
}
