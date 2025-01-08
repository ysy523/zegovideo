import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserJoinVideoComponent } from './user-join-video.component';

describe('UserJoinVideoComponent', () => {
  let component: UserJoinVideoComponent;
  let fixture: ComponentFixture<UserJoinVideoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserJoinVideoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserJoinVideoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
