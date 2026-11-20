import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RequestOrganization } from './request-organization';

describe('RequestOrganization', () => {
  let component: RequestOrganization;
  let fixture: ComponentFixture<RequestOrganization>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RequestOrganization],
    }).compileComponents();

    fixture = TestBed.createComponent(RequestOrganization);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
