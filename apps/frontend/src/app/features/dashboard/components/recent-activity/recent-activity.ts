import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

/** Empty-state placeholder — a real activity feed needs the Tasks/Habits/Journal modules first. */
@Component({
  selector: 'app-recent-activity',
  imports: [MatCardModule, MatIconModule],
  templateUrl: './recent-activity.html',
  styleUrl: './recent-activity.scss',
})
export class RecentActivity {}
