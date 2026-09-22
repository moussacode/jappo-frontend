import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InviterEntrepreneur } from './inviter-entrepreneur';

describe('InviterEntrepreneur', () => {
  let component: InviterEntrepreneur;
  let fixture: ComponentFixture<InviterEntrepreneur>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InviterEntrepreneur],
    }).compileComponents();

    fixture = TestBed.createComponent(InviterEntrepreneur);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
