import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Bmc } from './bmc';

describe('Bmc', () => {
  let component: Bmc;
  let fixture: ComponentFixture<Bmc>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Bmc],
    }).compileComponents();

    fixture = TestBed.createComponent(Bmc);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
