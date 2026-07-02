import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

interface QuickAction {
  label: string;
  icon: string;
  route: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Add Task', icon: 'add_task', route: '/tasks' },
  { label: 'Log Habit', icon: 'repeat', route: '/habits' },
  { label: 'New Journal Entry', icon: 'edit_note', route: '/journal' },
  { label: 'Ask AI Coach', icon: 'psychology', route: '/ai-coach' },
];

/** Links into each feature's (currently placeholder) route — no business logic triggered here. */
@Component({
  selector: 'app-quick-actions',
  imports: [RouterLink, MatButtonModule, MatCardModule, MatIconModule],
  templateUrl: './quick-actions.html',
  styleUrl: './quick-actions.scss',
})
export class QuickActions {
  protected readonly actions = QUICK_ACTIONS;
}
