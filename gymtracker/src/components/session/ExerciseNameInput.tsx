import { useState, useMemo, useRef, type KeyboardEvent } from "react";
import { normalizeKey } from "../../lib/utils";

interface ExerciseNameInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

/**
 * Exercise-name field with suggestions drawn from names the user has already
 * used.
 *
 * This is the answer to typos in a free-text model: rather than correcting a
 * name after the fact — which would silently rewrite what someone chose to call
 * their own exercise — it makes the existing spelling the easiest one to pick.
 * Nothing is ever changed automatically, and a name that matches nothing is
 * perfectly valid.
 *
 * The suggestion list needs no new data source: useExerciseProgress already
 * derives the alphabetical set of exercises actually performed, and the
 * exercise favorites cover ones saved but never logged with a weight.
 */
export default function ExerciseNameInput({
  value,
  onChange,
  onSubmit,
  suggestions,
  placeholder,
  className,
  autoFocus,
}: ExerciseNameInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const matches = useMemo(() => {
    const query = normalizeKey(value);
    if (!query) return [];
    return suggestions
      .filter((name) => {
        const key = normalizeKey(name);
        // An exact match is not a suggestion — there is nothing to complete.
        return key !== query && key.includes(query);
      })
      .slice(0, 6);
  }, [value, suggestions]);

  const open = isFocused && matches.length > 0;

  const choose = (name: string) => {
    onChange(name);
    setIsFocused(false);
    setHighlighted(-1);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === "Enter" && onSubmit) {
        e.preventDefault();
        onSubmit();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => (h + 1) % matches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => (h <= 0 ? matches.length - 1 : h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlighted >= 0) choose(matches[highlighted]);
      else if (onSubmit) onSubmit();
    } else if (e.key === "Escape") {
      setIsFocused(false);
      setHighlighted(-1);
    }
  };

  return (
    <div className="relative flex-1 min-w-0">
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        autoFocus={autoFocus}
        onChange={(e) => {
          onChange(e.target.value);
          setHighlighted(-1);
        }}
        onFocus={() => {
          if (blurTimer.current) clearTimeout(blurTimer.current);
          setIsFocused(true);
        }}
        onBlur={() => {
          // Deferred so a tap on a suggestion registers before the list closes;
          // on touch, blur fires first.
          blurTimer.current = setTimeout(() => setIsFocused(false), 150);
        }}
        onKeyDown={handleKeyDown}
        className={className}
      />

      {open && (
        <ul className="absolute left-0 right-0 top-full mt-1 z-30 bg-card border border-border rounded-xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto">
          {matches.map((name, index) => (
            <li key={name}>
              <button
                type="button"
                // onMouseDown, not onClick: it fires before blur, so the choice
                // lands even though focus is leaving the input.
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(name);
                }}
                className={`w-full text-left px-3 py-2.5 text-sm font-semibold cursor-pointer transition-colors ${
                  index === highlighted
                    ? "bg-primary text-on-primary"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
