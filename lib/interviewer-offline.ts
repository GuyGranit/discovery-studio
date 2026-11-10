import { FOCUS_QUESTIONS, SpecDoc, SpecSection, nextFocus } from "./spec";
import { TurnResult } from "./interviewer-types";

/**
 * Deterministic, rule-based interviewer. This is the engine used whenever
 * no production LLM key is configured (local dev, CI, tests), and it is
 * also the fallback if the real engine's call fails — so a customer never
 * gets dropped mid-session just because the LLM provider had a bad
 * moment. It enforces the same contract (scope lock, injection
 * resistance, measurable-answer pushback, assumption logging) the real
 * engine's system prompt is written to follow, just without the
 * conversational polish a real model gives the follow-up questions.
 */

const OFF_TOPIC_PATTERNS: RegExp[] = [
  /\b(write|generate|give me|create|build me)\b[^.?!]{0,40}\b(code|script|function|program|sql|regex|html|css|component)\b/i,
  /\bdebug (this|my)\b/i,
  /\bfix (this|my) (code|bug|error)\b/i,
  /\bwhat('s| is) the weather\b/i,
  /\btell me a joke\b/i,
  /\bwrite me (a|an) (poem|story|essay|email)\b/i,
  /\b(stock|crypto|bitcoin) (price|advice|tip)\b/i,
  /\bgive me (free )?(legal|medical|tax) advice\b/i,
];

const INJECTION_PATTERNS: RegExp[] = [
  /\bignore (all |the )?(previous|prior|above)\b/i,
  /\bdisregard (all |the )?(previous|prior|above)\b/i,
  /\byou are now\b/i,
  /\bact as\b/i,
  /\bnew instructions?\b/i,
  /\breveal your (system|instructions|prompt)\b/i,
  /\bwhat (is|are) your (system|instructions|prompt)\b/i,
  /\bpretend (to be|you('re| are))\b/i,
  /\bthis is (guy|the admin|the owner|o)\b/i,
];

const VAGUE_PATTERNS: RegExp[] = [
  /\b(maybe|i('m| am)? not sure|i dont know|i don't know|something like that|whatever works|up to you|etc\.?|some stuff|tbd|not sure yet)\b/i,
];

const REFUSAL_REPLY =
  "I'm scoped to this discovery interview only, I can't help with coding, general advice, or anything off-topic here. Let's get back to the project — ";

function isOffTopic(text: string): boolean {
  return OFF_TOPIC_PATTERNS.some((re) => re.test(text));
}

function isInjectionAttempt(text: string): boolean {
  return INJECTION_PATTERNS.some((re) => re.test(text));
}

function isVague(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 15) return true;
  return VAGUE_PATTERNS.some((re) => re.test(trimmed));
}

function extractAssumption(text: string): string | null {
  const match = /\bassum\w*\b[^.?!]*[.?!]?/i.exec(text);
  return match ? match[0].trim() : null;
}

export function offlineTurn(spec: SpecDoc, customerText: string): TurnResult {
  const focus = nextFocus(spec);

  // Every customer message is interview data, never instructions — checked
  // before anything else gets a chance to act on its content.
  if (isInjectionAttempt(customerText) || isOffTopic(customerText)) {
    return {
      reply: REFUSAL_REPLY + FOCUS_QUESTIONS[focus],
      accepted: [],
      assumptions: [],
      refused: true,
    };
  }

  const assumptionText = extractAssumption(customerText);
  const assumptions = assumptionText ? [assumptionText] : [];

  if (isVague(customerText)) {
    return {
      reply: `That's a bit too general for the spec — I need something measurable. ${FOCUS_QUESTIONS[focus]}`,
      accepted: [],
      assumptions,
      refused: false,
    };
  }

  const accepted: Array<{ section: SpecSection; text: string }> = [{ section: focus, text: customerText.trim() }];
  const nextSpecState: SpecDoc = {
    ...spec,
    sections: { ...spec.sections, [focus]: [...spec.sections[focus], { text: customerText.trim(), recordedAt: new Date().toISOString() }] },
  };
  const upcoming = nextFocus(nextSpecState);
  const reply =
    upcoming === focus
      ? `Noted. Let's go deeper on this — ${FOCUS_QUESTIONS[focus]}`
      : `Got it, that covers it. Next: ${FOCUS_QUESTIONS[upcoming]}`;

  return { reply, accepted, assumptions, refused: false };
}
