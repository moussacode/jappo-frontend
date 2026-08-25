import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BusinessPlan } from './business-plan';

describe('BusinessPlan', () => {
  let component: BusinessPlan;
  let fixture: ComponentFixture<BusinessPlan>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BusinessPlan],
    }).compileComponents();

    fixture = TestBed.createComponent(BusinessPlan);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
