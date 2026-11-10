/**
 * The fixed discovery spec template every interview session fills in. The
 * section list and order are the product's contract with the customer —
 * the interviewer never invents a different structure per session, and the
 * same document keeps accumulating across a customer's sessions (and
 * passes), so a top-up pass resumes the same spec rather than starting over.
 */
export const SPEC_SECTIONS = [
  "goals",
  "users",
  "flows",
  "data",
  "integrations",
  "constraints",
  "budgetRange",
  "successCriteria",
  "outOfScope",
  "risks",
] as const;

export type SpecSection = (typeof SPEC_SECTIONS)[number];

export const SECTION_LABELS: Record<SpecSection, string> = {
  goals: "Goals",
  users: "Users",
  flows: "Flows",
  data: "Data",
  integrations: "Integrations",
  constraints: "Constraints",
  budgetRange: "Budget range",
  successCriteria: "Success criteria",
  outOfScope: "Out of scope",
  risks: "Risks",
};

/** The sharp, concrete follow-up asked to open or push further on a section. */
export const FOCUS_QUESTIONS: Record<SpecSection, string> = {
  goals: "What's the single outcome that would make this project a success for your business, in one concrete sentence?",
  users: "Who exactly will use this, which roles or teams, and roughly how many people in each?",
  flows: "Walk me through the main flow step by step: what does a user do first, next, and last?",
  data: "What data does this need to store or read, which fields, and where does it come from today?",
  integrations: "Which existing systems does this need to talk to, and do you already have API access or credentials for them?",
  constraints: "Any hard constraints, platform, language, hosting, compliance, deadline, that aren't negotiable?",
  budgetRange: "What budget range are you working with for this project, roughly?",
  successCriteria: "How will you measure, in numbers, whether this worked after launch?",
  outOfScope: "What should this project explicitly NOT include, at least for this phase?",
  risks: "What's the one thing most likely to derail this project, in your view?",
};

export interface SpecPoint {
  text: string;
  recordedAt: string;
}

export interface Assumption {
  text: string;
  section: SpecSection | null;
  recordedAt: string;
}

export interface SpecDoc {
  customerId: string;
  sections: Record<SpecSection, SpecPoint[]>;
  assumptions: Assumption[];
  createdAt: string;
  updatedAt: string;
}

export function emptySpec(customerId: string): SpecDoc {
  const now = new Date().toISOString();
  const sections = {} as Record<SpecSection, SpecPoint[]>;
  for (const section of SPEC_SECTIONS) sections[section] = [];
  return { customerId, sections, assumptions: [], createdAt: now, updatedAt: now };
}

export interface Coverage {
  bySection: Record<SpecSection, boolean>;
  coveredCount: number;
  totalSections: number;
  percent: number;
}

/** A section counts as covered once it has at least one recorded point —
 * crude but deterministic, and it's what drives the customer-facing meter. */
export function coverageOf(spec: SpecDoc): Coverage {
  const bySection = {} as Record<SpecSection, boolean>;
  for (const section of SPEC_SECTIONS) bySection[section] = spec.sections[section].length > 0;
  const coveredCount = SPEC_SECTIONS.filter((s) => bySection[s]).length;
  return {
    bySection,
    coveredCount,
    totalSections: SPEC_SECTIONS.length,
    percent: Math.round((coveredCount / SPEC_SECTIONS.length) * 100),
  };
}

/** The least-covered section, in fixed template order: what the interviewer
 * should press on next. Once everything has at least one point, stays on
 * the last section so the interview keeps deepening rather than stopping. */
export function nextFocus(spec: SpecDoc): SpecSection {
  return SPEC_SECTIONS.find((s) => spec.sections[s].length === 0) ?? SPEC_SECTIONS[SPEC_SECTIONS.length - 1];
}

export function addPoint(spec: SpecDoc, section: SpecSection, text: string): void {
  spec.sections[section].push({ text, recordedAt: new Date().toISOString() });
  spec.updatedAt = new Date().toISOString();
}

export function addAssumption(spec: SpecDoc, text: string, section: SpecSection | null): void {
  spec.assumptions.push({ text, section, recordedAt: new Date().toISOString() });
  spec.updatedAt = new Date().toISOString();
}
