import { Component, OnInit, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Skeleton } from '../../../../shared/components/skeleton/skeleton';
import { AchievementCard } from '../../components/achievement-card/achievement-card';
import { StreaksStore } from '../../state/streaks-store';

/** Full achievement catalog, locked and unlocked alike — StreaksStore already loads the whole
 * list (GET /achievements) alongside statistics, so this page just renders what's there rather
 * than issuing its own fetch. */
@Component({
  selector: 'app-achievement-gallery-page',
  imports: [MatButtonModule, Skeleton, AchievementCard],
  templateUrl: './achievement-gallery-page.html',
  styleUrl: './achievement-gallery-page.scss',
})
export class AchievementGalleryPage implements OnInit {
  private readonly store = inject(StreaksStore);

  protected readonly achievements = this.store.achievements;
  protected readonly loading = this.store.loading;
  protected readonly error = this.store.error;

  protected readonly unlockedCount = computed(
    () => this.achievements().filter((achievement) => achievement.unlocked).length,
  );

  ngOnInit(): void {
    // A no-op re-fetch if the Streak Dashboard already loaded this session — StreaksStore has no
    // separate "loaded" flag (see its class doc), so this always issues a fresh request, which
    // also means an achievement unlocked since the last visit shows up immediately.
    this.store.load();
  }

  protected retry(): void {
    this.store.load();
  }
}
