import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EntrepreneurDetail } from './entrepreneur-detail';

describe('EntrepreneurDetail', () => {
  let component: EntrepreneurDetail;
  let fixture: ComponentFixture<EntrepreneurDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EntrepreneurDetail],
    }).compileComponents();

    fixture = TestBed.createComponent(EntrepreneurDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
