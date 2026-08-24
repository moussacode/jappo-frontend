import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PitchDeck } from './pitch-deck';

describe('PitchDeck', () => {
  let component: PitchDeck;
  let fixture: ComponentFixture<PitchDeck>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PitchDeck],
    }).compileComponents();

    fixture = TestBed.createComponent(PitchDeck);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
