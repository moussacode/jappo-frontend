import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CohortesList } from './cohortes-list';

describe('CohortesList', () => {
  let component: CohortesList;
  let fixture: ComponentFixture<CohortesList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CohortesList],
    }).compileComponents();

    fixture = TestBed.createComponent(CohortesList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
