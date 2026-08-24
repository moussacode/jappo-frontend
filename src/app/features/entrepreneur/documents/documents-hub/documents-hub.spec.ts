import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentsHub } from './documents-hub';

describe('DocumentsHub', () => {
  let component: DocumentsHub;
  let fixture: ComponentFixture<DocumentsHub>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentsHub],
    }).compileComponents();

    fixture = TestBed.createComponent(DocumentsHub);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
