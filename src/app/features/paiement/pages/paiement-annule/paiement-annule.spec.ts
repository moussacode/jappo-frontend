import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaiementAnnule } from './paiement-annule';

describe('PaiementAnnule', () => {
  let component: PaiementAnnule;
  let fixture: ComponentFixture<PaiementAnnule>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaiementAnnule],
    }).compileComponents();

    fixture = TestBed.createComponent(PaiementAnnule);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
