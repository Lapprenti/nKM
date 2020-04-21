import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { RefusPage } from './refus.page';

describe('RefusPage', () => {
  let component: RefusPage;
  let fixture: ComponentFixture<RefusPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RefusPage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(RefusPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
