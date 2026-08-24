import { X, Calendar, Dumbbell, Award, Trophy } from "lucide-react";
import { WorkoutSession } from "../../types";
import { formatDateItalian, daysSince } from "../../lib/utils";
import { usePRs } from "../../context/WorkoutContext";
import { motion } from "motion/react";

interface PastWorkoutDetailModalProps {
    workout: WorkoutSession;
    onClose: () => void;
}

function formatDaysAgo(days: number): string {
    if (days <= 0) return "oggi";
    if (days === 1) return "1 giorno fa";
    return `${days} giorni fa`;
}

export default function PastWorkoutDetailModal({
    workout,
    onClose,
}: PastWorkoutDetailModalProps) {
    const { sessionPRs, currentPRsByExercise } = usePRs();
    const sessionPRFlags = sessionPRs[workout.id];

    // Calculate some fun quick stats for this workout
    const totalSets = workout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);

    // Find the peak load in this workout (max weight across any exercise)
    let maxWeight = 0;
    let maxWeightEx = "";
    workout.exercises.forEach((ex) => {
        ex.sets.forEach((set) => {
            if (typeof set.weight === "number" && set.weight > maxWeight) {
                maxWeight = set.weight;
                maxWeightEx = ex.name;
            }
        });
    });
    const peakIsPR =
        maxWeightEx !== "" &&
        !!sessionPRFlags?.[maxWeightEx.trim().toLowerCase()]?.maxWeightPR;

    return (
        <div
            id="past-workout-modal-overlay"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/85 backdrop-blur-md"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="relative w-full max-w-2xl max-h-[85vh] bg-card border border-border rounded-2xl flex flex-col shadow-2xl overflow-hidden text-foreground"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header decoration bar */}
                <div className="h-1.5 bg-gradient-to-r from-primary to-secondary w-full" />

                {/* Modal Header */}
                <div className="p-5 border-b border-border flex items-start justify-between">
                    <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide uppercase">
                            Riepilogo Sessione
                        </span>
                        <h3 className="text-xl font-heading font-extrabold text-foreground tracking-tight flex items-center gap-2 mt-1">
                            {workout.muscleGroups || "Allenamento Generico"}
                        </h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>{formatDateItalian(workout.date, "long")}</span>
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg bg-muted hover:bg-muted/70 text-muted-foreground hover:text-foreground transition-all duration-150 border border-border/50"
                        aria-label="Chiudi"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Modal Quick Stats */}
                <div className="px-5 py-3.5 bg-background/40 border-b border-border/60 grid grid-cols-2 gap-4 text-xs">
                    <div className="flex items-center gap-2">
                        <Dumbbell className="w-4 h-4 text-primary" />
                        <div>
                            <p className="text-muted-foreground font-medium">Totale Esercizi</p>
                            <p className="text-foreground font-bold text-sm">
                                {workout.exercises.length} <span className="text-muted-foreground/70 font-normal">({totalSets} serie totali)</span>
                            </p>
                        </div>
                    </div>
                    {maxWeight > 0 && (
                        <div className="flex items-center gap-2">
                            {peakIsPR ? (
                                <Trophy className="w-4 h-4 text-accent" />
                            ) : (
                                <Award className="w-4 h-4 text-amber-400" />
                            )}
                            <div className="min-w-0">
                                <p className={peakIsPR ? "text-accent font-medium" : "text-muted-foreground font-medium"}>
                                    {peakIsPR ? "Nuovo record!" : "Picco di Carico"}
                                </p>
                                <p className="text-foreground font-bold text-sm truncate" title={`${maxWeight} kg su ${maxWeightEx}`}>
                                    {maxWeight} kg <span className="text-muted-foreground font-normal text-xs">({maxWeightEx})</span>
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Exercises Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6">
                    {workout.exercises.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            Nessun esercizio inserito in questa sessione.
                        </div>
                    ) : (
                        workout.exercises.map((exercise, exIndex) => {
                            const exKey = exercise.name.trim().toLowerCase();
                            const exFlags = sessionPRFlags?.[exKey];
                            const currentPR = currentPRsByExercise[exercise.name.trim()]?.maxWeight;
                            return (
                            <div
                                key={exercise.id}
                                className="bg-background border border-border rounded-xl p-4 space-y-3"
                            >
                                {/* Exercise name */}
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <h4 className="text-base font-heading font-bold text-foreground tracking-tight flex items-center gap-2">
                                        <span className="flex items-center justify-center w-6 h-6 rounded-md bg-card border border-border text-xs text-muted-foreground font-semibold">
                                            {exIndex + 1}
                                        </span>
                                        {exercise.name || "Esercizio senza nome"}
                                    </h4>

                                    {exFlags?.maxWeightPR || exFlags?.bestSetPR ? (
                                        <div className="flex items-center gap-1.5">
                                            {exFlags.maxWeightPR && (
                                                <span className="inline-flex items-center gap-1 bg-accent/10 text-accent border border-accent/30 px-2 py-0.5 rounded-full text-xs font-bold">
                                                    <Trophy className="w-3 h-3" />
                                                    Record di peso!
                                                </span>
                                            )}
                                            {exFlags.bestSetPR && (
                                                <span className="inline-flex items-center gap-1 bg-accent/10 text-accent border border-accent/30 px-2 py-0.5 rounded-full text-xs font-bold">
                                                    <Trophy className="w-3 h-3" />
                                                    Record di serie!
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        currentPR && (
                                            <span className="text-xs text-muted-foreground/70 font-medium">
                                                Record: {currentPR.weight} kg ({formatDaysAgo(daysSince(currentPR.date))})
                                            </span>
                                        )
                                    )}
                                </div>

                                {/* Sets Table */}
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-border text-sm text-muted-foreground uppercase tracking-wider font-semibold">
                                                <th className="py-1.5 px-3">Serie</th>
                                                <th className="py-1.5 px-3">Carico</th>
                                                <th className="py-1.5 px-3">Ripetizioni</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/50">
                                            {exercise.sets.map((set, setIndex) => (
                                                <tr
                                                    key={set.id}
                                                    className="text-sm hover:bg-card/40 text-muted-foreground"
                                                >
                                                    <td className="py-2 px-3 font-semibold text-muted-foreground text-xs">
                                                        SET {setIndex + 1}
                                                    </td>
                                                    <td className="py-2 px-3">
                                                        <span className="font-bold text-foreground text-sm">
                                                            {set.weight !== "" ? set.weight : "-"}
                                                        </span>{" "}
                                                        <span className="text-muted-foreground text-xs">kg</span>
                                                    </td>
                                                    <td className="py-2 px-3">
                                                        <span className="font-bold text-foreground text-sm">
                                                            {set.reps !== "" ? set.reps : "-"}
                                                        </span>{" "}
                                                        <span className="text-muted-foreground text-xs">reps</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            );
                        })
                    )}
                </div>

                {/* Modal Footer */}
                <div className="p-4 bg-background border-t border-border flex justify-end">
                    <button
                        onClick={onClose}
                        className="w-full sm:w-auto px-5 py-2.5 bg-muted hover:bg-muted/70 text-foreground hover:text-foreground rounded-xl text-sm font-semibold transition-all duration-150 border border-border"
                    >
                        Chiudi riepilogo
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
