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
