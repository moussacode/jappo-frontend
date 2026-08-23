import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Diagnostic } from './diagnostic';

describe('Diagnostic', () => {
  let component: Diagnostic;
  let fixture: ComponentFixture<Diagnostic>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Diagnostic],
    }).compileComponents();

    fixture = TestBed.createComponent(Diagnostic);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
