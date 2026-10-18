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

/** A couple of unambiguous housekeeping turns need no two-stage AI round trip. */
export function quickTurn(state: Conversation, text: string, skip = false): Conversation | null {
  if (skip && nextObjective(state) !== "registration") return fallbackTurn(state, text, true);
  const value = text.trim();
  if (!state.facts.email && validEmail(value)) return fallbackTurn(state, value);
  return null;
}
