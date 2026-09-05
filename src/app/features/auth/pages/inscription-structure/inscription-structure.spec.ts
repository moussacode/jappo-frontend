import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InscriptionStructure } from './inscription-structure';

describe('InscriptionStructure', () => {
  let component: InscriptionStructure;
  let fixture: ComponentFixture<InscriptionStructure>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InscriptionStructure],
    }).compileComponents();

    fixture = TestBed.createComponent(InscriptionStructure);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
