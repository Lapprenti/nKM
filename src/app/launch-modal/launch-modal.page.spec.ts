import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { LaunchModalPage } from './launch-modal.page';

describe('LaunchModalPage', () => {
  let component: LaunchModalPage;
  let fixture: ComponentFixture<LaunchModalPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ LaunchModalPage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(LaunchModalPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
