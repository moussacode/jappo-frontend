import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpgradePremium } from './upgrade-premium';

describe('UpgradePremium', () => {
  let component: UpgradePremium;
  let fixture: ComponentFixture<UpgradePremium>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpgradePremium],
    }).compileComponents();

    fixture = TestBed.createComponent(UpgradePremium);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
