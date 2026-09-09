# Hint Logic Specification

The hint logic in the Spatial Learning Platform is built as a progressive "ladder". It is designed to encourage deduction by revealing slightly more information each time the child gets the answer wrong.

It relies on the deterministic diagnostic engine (`diagnose.ts`) to calculate *what kind* of mistake was made. The hint ladder is driven by the `attempts` counter in the state, which increments every time the user presses the "Check" button.

## Base States (Attempt 0 / Fallbacks)
When the user clicks "Check" but the board doesn't match the goal, the app determines a base state.
* **Empty Board:** `"Place some bricks first."`
* **Hidden Void:** `"The views match, but a brick is missing inside."` (Occurs when the external shape matches perfectly, but there is an empty hole inside).
* **Solved:** `"That's the shape."`
* **General Mismatch (Attempt 1 fallback):** `"The views don't match yet."`

## The Hint Ladder

### Attempt 1: The Views are the Feedback
The child receives visual "Match" or "Miss" badges on the three view cards.
* **Message:** `"The views don't match yet."`
* **Design intent:** No specific text hints are given yet. The child is encouraged to look at the view cards and spot the difference themselves.

### Attempt 2: The Dimension of the Error
The engine uses the highest-priority diagnosis code (e.g., `footprint-wrong`, `height-wrong`, `shape-right-colour-wrong`) to tell the child *what kind* of mistake they made. They receive a static string based on the code:
* `brick-count-low` -> `"Not enough bricks."`
* `brick-count-high` -> `"Too many bricks."`
* `footprint-wrong` -> `"The top shape is wrong."`
* `height-wrong` -> `"The height is wrong."`
* `shape-right-colour-wrong` -> `"The shape is right. The colours aren't."`
* `colour-swap` -> `"Right colours, wrong places."`
* `hidden-brick` -> `"A brick is hiding inside."`
* `region-mismatch` -> `"Look at the highlighted region."`

### Attempt 3: The Region Highlight
The text explicitly tells the child which view to look at, and the engine draws a shaded bounding-box over the exact mismatched area directly on the 2D view card.
* **Message:** `"Look at the highlighted region in the [top/front/right] view."`
* **Design intent:** It shows them *where* the error is in 2D space, but still doesn't name the incorrect brick on the 3D board.

### Attempt 4: AI Assistance ("Get help")
A **"Get help"** button appears. When clicked, it makes a POST request to the `/api/hint` endpoint. 
It sends the failing views, the specific diagnosis code, and the puzzle's default hint to the `gemini-1.5-flash` model. The AI turns all that mechanical context into one highly contextual, easy-to-read sentence for a 7-year-old.

**Strict AI Constraints (Prompt Rules):**
1. Short sentences. Aim at a seven-year-old reading alone.
2. Say what happened and what to do.
3. No praise words (great, awesome, nice work, well done, perfect, amazing). Solving it is the reward; the app doesn't applaud.
4. No exclamation marks. No emoji.
5. One job per string. Hints must be under 12 words.
6. Errors don't apologise and are never vague.

**Examples:**
* `"Check the right side of the top view."`
* `"Your build is one layer too tall."`
* `"The shape is right, but the colours aren't."`

*(Note: If the network is down, or if the AI returns a sentence that breaks the constraints during validation, it automatically and silently falls back to the static Attempt 3 message).*

### Attempt 5: The Escape Hatch ("Show Me")
If the child continues to struggle, a **"Show me"** button appears. 
* **Message:** (The text does not change).
* **Action:** Clicking it reveals exactly one single mismatched cell directly on the 3D board as a transparent red ghost block.
* **Design intent:** This is the ultimate floor of the app, acting as an escape hatch ensuring that no child ever gets permanently stuck.
