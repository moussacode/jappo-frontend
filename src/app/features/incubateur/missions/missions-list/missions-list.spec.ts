import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MissionsList } from './missions-list';

describe('MissionsList', () => {
  let component: MissionsList;
  let fixture: ComponentFixture<MissionsList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MissionsList],
    }).compileComponents();

    fixture = TestBed.createComponent(MissionsList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
