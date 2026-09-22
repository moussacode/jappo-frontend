import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssistantIa } from './assistant-ia';

describe('AssistantIa', () => {
  let component: AssistantIa;
  let fixture: ComponentFixture<AssistantIa>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssistantIa],
    }).compileComponents();

    fixture = TestBed.createComponent(AssistantIa);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
