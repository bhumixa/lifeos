import { CreateHabitLogDto } from './create-habit-log.dto.js';

/**
 * Same shape as CreateHabitLogDto — `date` identifies *which* day's log to update (defaulting to
 * today), and `completedCount`/`notes` are the new values. Not a PartialType of anything because
 * every field here is already optional.
 */
export class UpdateHabitLogDto extends CreateHabitLogDto {}
