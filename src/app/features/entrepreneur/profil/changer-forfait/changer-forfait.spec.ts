import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChangerForfait } from './changer-forfait';

describe('ChangerForfait', () => {
  let component: ChangerForfait;
  let fixture: ComponentFixture<ChangerForfait>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChangerForfait],
    }).compileComponents();

    fixture = TestBed.createComponent(ChangerForfait);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
