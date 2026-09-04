import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NouvelleCohorte } from './nouvelle-cohorte';

describe('NouvelleCohorte', () => {
  let component: NouvelleCohorte;
  let fixture: ComponentFixture<NouvelleCohorte>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NouvelleCohorte],
    }).compileComponents();

    fixture = TestBed.createComponent(NouvelleCohorte);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
