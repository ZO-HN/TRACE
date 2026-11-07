import type { PrivateWorkout } from '../../hooks/useCoachPrivateWorkouts';

export function expectedWorkoutSnapshot(workout: PrivateWorkout) {
  return {
    name: workout.name,
    description: workout.description,
    items: [...workout.template_items].sort((a, b) => a.position - b.position).map((item) => ({
      exercise_id: item.exercise_id,
      position: item.position,
      target_sets: item.target_sets,
      target_reps: item.target_reps,
      target_rpe: item.target_rpe,
      rest_seconds: item.rest_seconds,
    })),
  };
}
