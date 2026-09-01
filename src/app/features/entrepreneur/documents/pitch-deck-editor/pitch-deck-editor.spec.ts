import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PitchDeckEditor } from './pitch-deck-editor';

describe('PitchDeckEditor', () => {
  let component: PitchDeckEditor;
  let fixture: ComponentFixture<PitchDeckEditor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PitchDeckEditor],
    }).compileComponents();

    fixture = TestBed.createComponent(PitchDeckEditor);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
