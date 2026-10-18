import {
  advance,
  extractImmediate,
  reconcileExtraction,
  nextObjective,
  validEmail,
  type Conversation,
  type Extraction,
} from "./state.ts";
export type Interpreter = (
  text: string,
  state: Conversation,
  skip?: boolean,
) => Promise<Extraction>;
/** One production/evaluation processing cycle; model output never writes persistence. */
export async function processTurn(
  state: Conversation,
  text: string,
  interpret: Interpreter,
  skip = false,
) {
  const extraction = await interpret(text, state, skip);
  return {
    state: advance(state, reconcileExtraction(text, state, extraction), skip),
    extraction,
  };
}
/** Clearly signalled service-outage behaviour, not a substitute for semantic evaluation. */
export const fallbackTurn = (state: Conversation, text: string, skip = false) =>
  advance(state, skip ? { utterance: text } : extractImmediate(text, state), skip);

/** Skip duplicate model extraction only when the entire first message is an
 * explicit, simple identity statement. Any additional context needs semantic
 * interpretation, particularly trusteeships, clients, corrections and history. */
export function registrationExtraction(state: Conversation, text: string): Extraction | null {
  if (state.turns || state.professional.length || ["name", "email", "role", "organisation"].some(key => state.facts[key as keyof typeof state.facts])) return null;
  const facts = extractImmediate(text, state, false);
  if (!facts.name || !facts.email || !facts.role || !facts.organisation || facts.intent !== "inform") return null;
  if (!/^(?:chartered accountant|accountant|auditor|finance director|finance manager|fundraising manager|CEO|chief executive)$/i.test(facts.role)) return null;
  const escape = (value: string) => value.replaceAll("’", "'").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^(?:I'm|I am|My name is)\\s+${escape(facts.name)}\\s*,\\s+(?:an?\\s+)?${escape(facts.role)}\\s+(?:at|for)\\s+${escape(facts.organisation)}[.;]\\s+(?:My\\s+)?email(?:\\s+address)?(?:\\s+is|\\s*:)?\\s+${escape(facts.email)}[.!]?$`, "i");
  return pattern.test(text.trim().replaceAll("’", "'")) ? facts : null;
}

/** A couple of unambiguous housekeeping turns need no two-stage AI round trip. */
export function quickTurn(state: Conversation, text: string, skip = false): Conversation | null {
  if (skip && nextObjective(state) !== "registration") return fallbackTurn(state, text, true);
  const value = text.trim();
  if (registrationExtraction(state, value)) return fallbackTurn(state, value);
  if (!state.facts.email && validEmail(value)) return fallbackTurn(state, value);
  if (nextObjective(state) === "charity" && state.charity.phase === "suggest" && state.charity.proposed && /^(?:yes|yes please|sure|that's right|that’s right)[.!]?$/i.test(value)) return fallbackTurn(state, value);
  return null;
}
