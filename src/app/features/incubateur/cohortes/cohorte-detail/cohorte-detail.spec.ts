import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CohorteDetail } from './cohorte-detail';

describe('CohorteDetail', () => {
  let component: CohorteDetail;
  let fixture: ComponentFixture<CohorteDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CohorteDetail],
    }).compileComponents();

    fixture = TestBed.createComponent(CohorteDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
