import {
  advance,
  extractImmediate,
  reconcileExtraction,
  type Conversation,
  type Extraction,
} from "./state.ts";
export type Interpreter = (
  text: string,
  state: Conversation,
) => Promise<Extraction>;
/** One production/evaluation processing cycle; model output never writes persistence. */
export async function processTurn(
  state: Conversation,
  text: string,
  interpret: Interpreter,
  skip = false,
) {
  if (skip)
    return { state: advance(state, {}, true), extraction: {} as Extraction };
  const extraction = await interpret(text, state);
  return {
    state: advance(state, reconcileExtraction(text, state, extraction)),
    extraction,
  };
}
/** Clearly signalled service-outage behaviour, not a substitute for semantic evaluation. */
export const fallbackTurn = (state: Conversation, text: string) =>
  advance(state, extractImmediate(text, state));
