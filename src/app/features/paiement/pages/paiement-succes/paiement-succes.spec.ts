import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaiementSucces } from './paiement-succes';

describe('PaiementSucces', () => {
  let component: PaiementSucces;
  let fixture: ComponentFixture<PaiementSucces>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaiementSucces],
    }).compileComponents();

    fixture = TestBed.createComponent(PaiementSucces);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
