import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChoisirStructure } from './choisir-structure';

describe('ChoisirStructure', () => {
  let component: ChoisirStructure;
  let fixture: ComponentFixture<ChoisirStructure>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChoisirStructure],
    }).compileComponents();

    fixture = TestBed.createComponent(ChoisirStructure);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
