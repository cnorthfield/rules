## 9. UI, forms & UX

### Validation
**Do:** Validate on the client for instant feedback and re-validate everything on the server as the only authority. Share the schema (zod, Valibot) across both so the rules can't drift.
**Never:** Treat a client-side check as a security or integrity guarantee. The browser is attacker-controlled.
**Why:** Client validation is UX, server validation is correctness. Skip the server half and a curl request walks straight past your form (see security, data).
**Escape hatch:** None. Even a purely internal tool gets server validation.

### Inline errors
**Do:** Put each error next to the field that caused it, say what's wrong and how to fix it, and tie it to the input with `aria-describedby` plus a live region so screen readers hear it (see accessibility).
**Never:** Dump a single generic "Invalid input" banner at the top for a fixable field-level problem, or signal an error with red colour alone.
**Why:** A vague banner makes the user hunt for the broken field, and specificity is the whole point of validation.

### Validation timing
**Do:** Validate a field on blur once the user has finished with it, and re-check the whole form on submit. Clear a field's error the moment it becomes valid.
**Never:** Fire errors on every keystroke while someone is still typing an email or password.
**Why:** Yelling at a half-typed field reads as the form being broken, not the input.

### Preserve input
**Do:** Keep everything the user typed when validation fails, and return focus to the first bad field. On a server round-trip, echo the submitted values back into the form.
**Never:** Clear the form, reset selects, or lose a long text body because one field failed.
**Why:** Making someone retype a working answer because of an unrelated error is the fastest way to lose the submission.

### Double-submit
**Do:** Disable the submit control the instant a mutating request is in flight and re-enable it only when the request settles. Show progress on the button itself so the click clearly registered.
**Never:** Leave a live submit button during the request and rely on the user not clicking twice.
**Escape hatch:** If you can't disable in time (slow JS, no-JS fallback), the server idempotency key below is your real defence.

### Idempotent submits
**Do:** Pair every create-style submit with an idempotency key generated client-side and honoured server-side, so a retry, refresh, or double-click resolves to one record (see api).
**Never:** Assume a disabled button is enough. Network retries, the back-then-forward dance, and impatient reloads all bypass the UI.
**Why:** Disabling the button prevents the common case, idempotency prevents the duplicate charge.

### Submission feedback
**Do:** Confirm success explicitly with a toast, a redirect, or a visibly updated view, and on failure keep the data, explain what happened, and offer a retry.
**Never:** Return the user to a quiet, unchanged screen on success, or swallow a rejected request silently.
**Why:** Silence after a submit reads as failure, so people resubmit. A dead error reads as a dead app.

### The four states
**Do:** Design empty, loading, error, and success for every async view and treat them as first-class work, not afterthoughts. A view that fetches has all four.
**Never:** Ship a blank screen while loading or a spinner that can spin forever with no timeout and no error path.
**Why:** "Happy path only" is the single most common UI defect, and the other three states are where users actually live.

### Empty & error states
**Do:** Make empty states explain what goes here and offer the action that fills it. Give error states a concrete way out: a retry, a back link, a support route, never a dead end.
**Never:** Render a bare "No data" or an unhandled stack trace.
**Escape hatch:** A truly empty list inside a richer view can be a one-line hint, not a full illustrated zero-state.

### No layout shift
**Do:** Reserve space for incoming content with skeletons that match its shape, so the page doesn't jump as data arrives. This is also what protects your CLS (the Core Web Vitals "good" target is 0.1 or below at the 75th percentile) (see performance).
**Never:** Render at zero height and let content shove everything down, and don't swap a spinner for content of a different size.

### Input types & keyboards
**Do:** Use the correct input type so mobile gets the right keyboard and the browser gets free validation: `email`, `tel`, `url`, `number`, `date`, `search`. Set `inputmode` where the type alone is wrong (a numeric PIN that isn't a `number`).
**Never:** Use a plain text box for an email or a numeric code, or a `number` input for things like phone numbers and card numbers that aren't quantities.

### Labels & autocomplete
**Do:** Give every input a real `<label for>`, and set the right `autocomplete` token (`email`, `given-name`, `street-address`, `one-time-code`, `current-password`, `new-password`) so browsers and password managers fill it.
**Never:** Use placeholder text as a label. It vanishes on focus, fails contrast, and is invisible to assistive tech (see accessibility).
**Why:** Correct autocomplete tokens are the difference between a one-tap checkout and a manual retype.

### Defaults & forgiving formats
**Do:** Prefill what you already know, pick sensible defaults, and accept input in whatever shape people naturally type it: phone numbers and cards with or without spaces, dates with slashes or dashes. Normalise on the server.
**Never:** Reject "+44 7700 900000" because it has spaces, or force a single rigid format the user has to guess.
**Why:** Rejecting a valid value over punctuation is a self-inflicted conversion loss.

### Required vs optional
**Do:** Mark required fields in both text and markup (`required`/`aria-required`), and label optional ones explicitly when most are required.
**Never:** Disable the submit button to "enforce" validation. It strands keyboard and screen-reader users with no path forward (see accessibility). Validate and explain on submit instead.

### Destructive actions
**Do:** Make destructive actions deliberate and scale the friction to the consequence: a single click for small reversible deletes, a typed confirmation ("type the project name") for irreversible bulk ones. Name exactly what will happen ("Delete 3 projects and 412 tasks").
**Never:** Guard everything with the same vague "Are you sure?" modal, which trains people to click through it on autopilot.
**Why:** Uniform friction is friction users learn to ignore, so it stops protecting the action that matters.

### Undo over confirm
**Do:** Prefer a brief undo window (soft-delete, then a toast with Undo) over a confirmation dialog wherever the action can be reversed. Keep the data recoverable for the undo period.
**Never:** Block routine reversible actions behind a modal when an undo would do.
**Escape hatch:** Genuinely irreversible or out-the-door actions (charge a card, send the email, publish to the public) still get an explicit confirm, because there's nothing to undo.

### Optimistic updates
**Do:** Apply the change in the UI immediately, fire the request in the background, and on failure roll back to the prior state visibly and tell the user it didn't stick.
**Never:** Leave an optimistic change on screen after the server rejected it. A silent lie about saved state is worse than a slow spinner.
**Escape hatch:** For high-stakes mutations (payments, anything irreversible) skip optimism and wait for the server before showing success.
