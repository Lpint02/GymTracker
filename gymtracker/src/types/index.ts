export interface WorkoutSet {
    id: string;
    reps: number | "";
    weight: number | "";
}

export interface Exercise {
    id: string;
    name: string;
    sets: WorkoutSet[];
}

export interface WorkoutSession {
    id: string;
    date: string; // YYYY-MM-DD
    muscleGroups: string;
    exercises: Exercise[];
    completedAt?: string; // ISO string when completed
}

export interface Favorite {
    id: string;
    label: string;
}
