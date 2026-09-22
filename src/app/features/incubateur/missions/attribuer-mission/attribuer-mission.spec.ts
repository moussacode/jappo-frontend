import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AttribuerMission } from './attribuer-mission';

describe('AttribuerMission', () => {
  let component: AttribuerMission;
  let fixture: ComponentFixture<AttribuerMission>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AttribuerMission],
    }).compileComponents();

    fixture = TestBed.createComponent(AttribuerMission);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
