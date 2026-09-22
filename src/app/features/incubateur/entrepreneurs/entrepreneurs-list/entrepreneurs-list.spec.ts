import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EntrepreneursList } from './entrepreneurs-list';

describe('EntrepreneursList', () => {
  let component: EntrepreneursList;
  let fixture: ComponentFixture<EntrepreneursList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EntrepreneursList],
    }).compileComponents();

    fixture = TestBed.createComponent(EntrepreneursList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
