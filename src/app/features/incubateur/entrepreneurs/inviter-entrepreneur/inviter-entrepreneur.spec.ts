import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InviterEntrepreneurModalComponent } from './inviter-entrepreneur';

describe('InviterEntrepreneur', () => {
  let component: InviterEntrepreneurModalComponent;
  let fixture: ComponentFixture<InviterEntrepreneurModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InviterEntrepreneurModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InviterEntrepreneurModalComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
