import type { FormBuilder } from '@angular/forms';
import type { Energy, Mood } from '@lifeos/shared-types';

/** The fields every JournalType shares (title/content/mood/energy/tags/weather/location/goalId),
 * factored out so Morning/Evening/Journal Detail's own forms each add only the type-specific
 * fields on top, rather than repeating these seven three times. `fb` is passed in rather than
 * injected here since FormBuilder is only available inside a component/service's own DI context. */
export function commonEntryControls(fb: FormBuilder) {
  return {
    title: fb.nonNullable.control(''),
    content: fb.nonNullable.control(''),
    mood: fb.control<Mood | null>(null),
    energy: fb.control<Energy | null>(null),
    tags: fb.nonNullable.control<string[]>([]),
    weather: fb.nonNullable.control(''),
    location: fb.nonNullable.control(''),
    goalId: fb.control<string | null>(null),
  };
}
