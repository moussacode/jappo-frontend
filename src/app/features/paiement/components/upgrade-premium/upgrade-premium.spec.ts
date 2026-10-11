import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpgradePremiumButton } from './upgrade-premium';

describe('UpgradePremium', () => {
  let component: UpgradePremiumButton;
  let fixture: ComponentFixture<UpgradePremiumButton>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpgradePremiumButton],
    }).compileComponents();

    fixture = TestBed.createComponent(UpgradePremiumButton);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
