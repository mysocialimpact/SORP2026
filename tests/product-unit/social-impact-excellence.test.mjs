import assert from "node:assert/strict";
import test from "node:test";
import { PILLARS, QUESTIONS } from "../../src/features/excellence/questions.ts";
import { scoreAssessment } from "../../src/features/excellence/scoring.ts";
import { SNAPSHOT_MATURITY } from "../../src/features/excellence/snapshot-maturity.ts";
import { PURPOSE_OPEN_QUESTIONS, PURPOSE_SCALE, PURPOSE_SECTIONS, purposeMaturity, scorePurpose, newPurposeWorkspace, normalisePurposeWorkspace } from "../../src/features/excellence/purpose.ts";
import { PURPOSE_QUESTION_GUIDANCE } from "../../src/features/excellence/purpose-guidance.ts";
import { LEADERSHIP_OPEN_QUESTIONS, LEADERSHIP_SCALE, LEADERSHIP_SECTIONS, leadershipMaturity, newLeadershipWorkspace, normaliseLeadershipWorkspace, scoreLeadership } from "../../src/features/excellence/leadership.ts";
import { LEADERSHIP_QUESTION_GUIDANCE } from "../../src/features/excellence/leadership-guidance.ts";
import { DATA_METHODOLOGY_VERSION, DATA_OPEN_QUESTIONS, DATA_SCALE, DATA_SECTIONS, dataMaturity, newDataWorkspace, normaliseDataWorkspace, scoreData } from "../../src/features/excellence/data.ts";
import { DELIVERY_METHODOLOGY_VERSION, DELIVERY_OPEN_QUESTIONS, DELIVERY_SCALE, DELIVERY_SECTIONS, deliveryMaturity, newDeliveryWorkspace, normaliseDeliveryWorkspace, scoreDelivery } from "../../src/features/excellence/delivery.ts";
import { COMMUNICATIONS_METHODOLOGY_VERSION, COMMUNICATIONS_OPEN_QUESTIONS, COMMUNICATIONS_SCALE, COMMUNICATIONS_SECTIONS, communicationsMaturity, newCommunicationsWorkspace, normaliseCommunicationsWorkspace, scoreCommunications } from "../../src/features/excellence/communications.ts";

test("native charity assessment preserves the established five-pillar, 25-question methodology", () => {
  assert.deepEqual(PILLARS.map(pillar => pillar.key), ["purpose", "leadership", "data", "delivery", "communication"]);
  assert.equal(QUESTIONS.length, 25);
  assert.equal(new Set(QUESTIONS.map(question => question.id)).size, 25);
  assert.equal(Object.keys(SNAPSHOT_MATURITY).length, 25);
  for (const question of QUESTIONS) assert.equal(SNAPSHOT_MATURITY[question.id].length, 5);
});

test("native Social Impact Excellence scoring remains deterministic", () => {
  const result = scoreAssessment([1,2,3,4,5, 2,2,2,2,2, 3,3,3,3,3, 4,4,4,4,4, 5,5,5,5,5]);
  assert.equal(result.overall, 3.4);
  assert.deepEqual(result.pillarScores.map(item => item.score), [3,2,3,4,5]);
  assert.equal(result.maturity, "Partly established");
  assert.equal(result.strengths.length, 3);
  assert.equal(result.opportunities.length, 3);
});

test("native Purpose pathway preserves the released assessment and guidance", () => {
  assert.equal(PURPOSE_SECTIONS.length, 4);
  assert.equal(PURPOSE_SECTIONS.flatMap(section => section.questions).length, 20);
  assert.equal(PURPOSE_OPEN_QUESTIONS.length, 5);
  assert.equal(PURPOSE_QUESTION_GUIDANCE.length, 20);
  assert.equal(new Set(PURPOSE_QUESTION_GUIDANCE.map(guidance => guidance.why)).size, 20);
  const starDescriptions = PURPOSE_QUESTION_GUIDANCE.flatMap(guidance => guidance.stars);
  assert.equal(starDescriptions.length, 100);
  assert.equal(new Set(starDescriptions).size, 100);
  for (const guidance of PURPOSE_QUESTION_GUIDANCE) {
    assert.equal(guidance.stars.length, 5);
    assert.ok(guidance.why.length >= 120);
    for (const description of guidance.stars) assert.ok(description.length >= 25);
  }
  const workspace = newPurposeWorkspace({ name: "QA", email: "qa@example.invalid", organisation: "QA Charity" });
  workspace.answers.slice(0, 20).forEach(answer => { answer.score = 4; });
  assert.deepEqual(scorePurpose(workspace.answers), { score: 4, maturity: "Established" });
  workspace.answers[0].comment = "Existing context remains attached to the scored question.";
  workspace.answers[20].answer = "Existing open reflection remains attached to question 21.";
  const restored = normalisePurposeWorkspace(workspace);
  assert.equal(restored.answers.length, 25);
  assert.equal(restored.answers[0].comment, workspace.answers[0].comment);
  assert.equal(restored.answers[20].answer, workspace.answers[20].answer);
});

test("Leadership pathway provides exactly five scored sections, 20 ratings and five qualitative questions", () => {
  assert.equal(LEADERSHIP_SECTIONS.length, 5);
  assert.deepEqual(LEADERSHIP_SECTIONS.map(section => section.questions.length), [4, 4, 4, 4, 4]);
  assert.equal(LEADERSHIP_SECTIONS.flatMap(section => section.questions).length, 20);
  assert.equal(LEADERSHIP_OPEN_QUESTIONS.length, 5);
  const workspace = newLeadershipWorkspace({ name: "QA", email: "qa@example.invalid", organisation: "QA Charity" });
  assert.equal(workspace.answers.length, 25);
  assert.equal(new Set(workspace.answers.map(answer => answer.questionId)).size, 25);
  assert.deepEqual(workspace.answers.map(answer => answer.questionId), Array.from({ length: 25 }, (_, index) => `leadership-${String(index + 1).padStart(2, "0")}`));
});

test("Leadership guidance is fully authored and question-specific", () => {
  assert.equal(LEADERSHIP_QUESTION_GUIDANCE.length, 20);
  assert.equal(new Set(LEADERSHIP_QUESTION_GUIDANCE.map(item => item.why)).size, 20);
  const stars = LEADERSHIP_QUESTION_GUIDANCE.flatMap(item => item.stars);
  assert.equal(stars.length, 100);
  assert.equal(new Set(stars).size, 100);
  for (const item of LEADERSHIP_QUESTION_GUIDANCE) {
    assert.equal(item.stars.length, 5);
    assert.match(item.why, /[.!?].+[.!?]$/);
    for (const description of item.stars) assert.ok(description.length >= 35);
  }
});

test("Leadership scoring reuses Purpose bands, excludes qualitative answers and rejects missing or invalid ratings", () => {
  assert.deepEqual(LEADERSHIP_SCALE, PURPOSE_SCALE);
  const workspace = newLeadershipWorkspace();
  assert.equal(scoreLeadership(workspace.answers), null);
  workspace.answers.slice(0, 20).forEach(answer => { answer.score = 4; });
  workspace.answers.slice(20).forEach(answer => { answer.answer = "Qualitative context that is deliberately unscored."; answer.score = 1; });
  assert.deepEqual(scoreLeadership(workspace.answers), { score: 4, maturity: "Established" });
  workspace.answers[0].score = 6;
  assert.equal(scoreLeadership(workspace.answers), null);
  workspace.answers[0].score = 2;
  assert.deepEqual(scoreLeadership(workspace.answers), { score: 3.9, maturity: "Established" });
  for (const score of [1, 1.79, 1.8, 2.59, 2.6, 3.39, 3.4, 4.19, 4.2, 5]) {
    assert.equal(leadershipMaturity(score), purposeMaturity(score));
  }
});

test("Leadership draft restoration sanitises invalid data without touching other product namespaces", () => {
  const purpose = { preserved: true };
  const snapshot = { answers: [1, 2, 3] };
  const workspace = newLeadershipWorkspace({ organisation: "QA Charity" });
  workspace.status = "draft";
  workspace.answers[0].score = 5;
  workspace.answers[0].comment = "Board challenge is recorded proportionately.";
  workspace.answers[20].answer = "Our leadership is committed but needs clearer shared accountability.";
  const product = { purpose, snapshot, leadership: workspace };
  const restored = normaliseLeadershipWorkspace(product.leadership);
  assert.equal(restored.answers[0].score, 5);
  assert.equal(restored.answers[0].comment, workspace.answers[0].comment);
  assert.equal(restored.answers[20].answer, workspace.answers[20].answer);
  assert.strictEqual(product.purpose, purpose);
  assert.strictEqual(product.snapshot, snapshot);
  const invalid = structuredClone(workspace);
  invalid.answers[1].score = 0;
  invalid.answers[2].questionId = "purpose-03";
  invalid.reviewStatus = "reviewed";
  const sanitised = normaliseLeadershipWorkspace(invalid);
  assert.equal(sanitised.answers[1].score, null);
  assert.equal(sanitised.answers[2].questionId, "leadership-03");
  assert.equal(sanitised.reviewStatus, "not_submitted");
});

test("Data pathway contains the complete authored 20-question methodology", () => {
  assert.equal(DATA_SECTIONS.length, 5);
  assert.deepEqual(DATA_SECTIONS.map(section => section.questions.length), [4, 4, 4, 4, 4]);
  const questions = DATA_SECTIONS.flatMap(section => section.questions);
  assert.deepEqual(questions.map(question => question.id), Array.from({ length: 20 }, (_, index) => `DATA${String(index + 1).padStart(2, "0")}`));
  assert.equal(new Set(questions.map(question => question.why)).size, 20);
  const stars = questions.flatMap(question => question.stars);
  assert.equal(stars.length, 100);
  assert.equal(new Set(stars).size, 100);
  assert.ok(questions.every(question => question.why.length >= 100 && question.stars.every(description => description.length >= 40)));
  assert.deepEqual(DATA_OPEN_QUESTIONS.map(question => question.id), ["DATA_OPEN01", "DATA_OPEN02", "DATA_OPEN03", "DATA_OPEN04", "DATA_OPEN05"]);
});

test("Data scoring matches Purpose bands and excludes comments, reflections and evidence", () => {
  assert.deepEqual(DATA_SCALE, PURPOSE_SCALE);
  const workspace = newDataWorkspace();
  workspace.answers.slice(0, 19).forEach(answer => { answer.score = 4; });
  assert.equal(scoreData(workspace.answers), null);
  workspace.answers[19].score = 4;
  workspace.answers[0].comment = "This context is unscored.";
  workspace.answers.slice(20).forEach(answer => { answer.answer = "Optional qualitative context."; answer.score = 1; });
  workspace.evidence.push({ id: "evidence-1", fileName: "summary.pdf", category: "Examples of analysis", notes: "Unscored", size: 1200, uploadedAt: new Date(0).toISOString() });
  assert.deepEqual(scoreData(workspace.answers), { score: 4, maturity: "Established" });
  workspace.answers[0].score = 6;
  assert.equal(scoreData(workspace.answers), null);
  for (const score of [1, 1.79, 1.8, 2.59, 2.6, 3.39, 3.4, 4.19, 4.2, 5]) assert.equal(dataMaturity(score), purposeMaturity(score));
});

test("Data persistence is versioned, restores drafts and preserves immutable submission history", () => {
  const workspace = newDataWorkspace({ name: "QA", email: "qa@example.invalid", organisation: "QA Charity" });
  workspace.status = "draft";
  workspace.answers[0].score = 5;
  workspace.answers[0].comment = "A proportionate spreadsheet supports this practice.";
  workspace.answers[20].answer = "A reflective answer.";
  workspace.submissions.push({ assessmentId: workspace.assessmentId, methodologyVersion: DATA_METHODOLOGY_VERSION, submittedAt: new Date(0).toISOString(), score: 5, maturity: "Fully Embedded", answers: structuredClone(workspace.answers) });
  const purpose = { preserved: true }, leadership = { preserved: true }, snapshot = { answers: [1, 2, 3] };
  const product = { purpose, leadership, snapshot, data: workspace };
  const restored = normaliseDataWorkspace(product.data);
  assert.equal(restored.methodologyVersion, DATA_METHODOLOGY_VERSION);
  assert.equal(restored.answers[0].comment, workspace.answers[0].comment);
  assert.equal(restored.answers[20].answer, workspace.answers[20].answer);
  assert.equal(restored.submissions.length, 1);
  assert.deepEqual(restored.submissions[0].answers, workspace.submissions[0].answers);
  assert.strictEqual(product.purpose, purpose);
  assert.strictEqual(product.leadership, leadership);
  assert.strictEqual(product.snapshot, snapshot);
  const invalid = structuredClone(workspace);
  invalid.reviewStatus = "reviewed";
  invalid.answers[0].score = 0;
  assert.equal(normaliseDataWorkspace(invalid).reviewStatus, "not_submitted");
  assert.equal(normaliseDataWorkspace(invalid).answers[0].score, null);
});

test("Delivery pathway contains five sections, 20 authored ratings and five open reflections", () => {
  assert.equal(DELIVERY_SECTIONS.length, 5);
  assert.deepEqual(DELIVERY_SECTIONS.map(section => section.questions.length), [4, 4, 4, 4, 4]);
  const questions = DELIVERY_SECTIONS.flatMap(section => section.questions);
  assert.deepEqual(questions.map(question => question.id), Array.from({ length: 20 }, (_, index) => `DELIVERY${String(index + 1).padStart(2, "0")}`));
  assert.equal(new Set(questions.map(question => question.question)).size, 20);
  assert.equal(new Set(questions.map(question => question.why)).size, 20);
  const stars = questions.flatMap(question => question.stars);
  assert.equal(stars.length, 100);
  assert.equal(new Set(stars).size, 100);
  assert.ok(questions.every(question => question.why.length >= 100 && question.stars.every(description => description.length >= 50)));
  assert.equal(DELIVERY_OPEN_QUESTIONS.length, 5);
  assert.deepEqual(DELIVERY_OPEN_QUESTIONS.map(question => question.id), ["DELIVERY_OPEN01", "DELIVERY_OPEN02", "DELIVERY_OPEN03", "DELIVERY_OPEN04", "DELIVERY_OPEN05"]);
});

test("Delivery embeds management accounting and operational practice without collapsing into finance alone", () => {
  const content = JSON.stringify(DELIVERY_SECTIONS).toLowerCase();
  for (const concept of ["budget", "cost", "management information", "forecast", "resource allocation", "cost-effectiveness", "value for money", "financial resilience", "quality", "partnership"]) assert.match(content, new RegExp(concept));
  assert.equal(DELIVERY_SECTIONS[1].title, "FINANCIAL MANAGEMENT & RESOURCE ALLOCATION");
  assert.equal(DELIVERY_SECTIONS[3].title, "PERFORMANCE, EFFICIENCY & VALUE FOR MONEY");
});

test("Delivery scoring uses Purpose bands and excludes comments, reflections and evidence", () => {
  assert.deepEqual(DELIVERY_SCALE, PURPOSE_SCALE);
  const workspace = newDeliveryWorkspace();
  workspace.answers.slice(0, 19).forEach(answer => { answer.score = 4; });
  assert.equal(scoreDelivery(workspace.answers), null);
  workspace.answers[19].score = 4;
  workspace.answers[0].comment = "Operational and financial context is unscored.";
  workspace.answers.slice(20).forEach(answer => { answer.answer = "Optional reflection."; answer.score = 1; });
  workspace.evidence.push({ id: "evidence-1", fileName: "programme-budget.xlsx", category: "Programme budget", notes: "Unscored", size: 1200, uploadedAt: new Date(0).toISOString() });
  assert.deepEqual(scoreDelivery(workspace.answers), { score: 4, maturity: "Established" });
  workspace.answers[0].score = 6;
  assert.equal(scoreDelivery(workspace.answers), null);
  for (const score of [1, 1.79, 1.8, 2.59, 2.6, 3.39, 3.4, 4.19, 4.2, 5]) assert.equal(deliveryMaturity(score), purposeMaturity(score));
});

test("Delivery persistence remains versioned and isolated from every existing pillar", () => {
  const workspace = newDeliveryWorkspace({ name: "QA", email: "qa@example.invalid", organisation: "QA Charity" });
  workspace.status = "draft";
  workspace.answers[0].score = 5;
  workspace.answers[0].comment = "Delivery decisions use proportionate management information.";
  workspace.answers[20].answer = "Capacity is the most significant practical constraint.";
  workspace.submissions.push({ assessmentId: workspace.assessmentId, methodologyVersion: DELIVERY_METHODOLOGY_VERSION, submittedAt: new Date(0).toISOString(), score: 5, maturity: "Fully Embedded", answers: structuredClone(workspace.answers) });
  const purpose = { preserved: true }, leadership = { preserved: true }, data = { preserved: true }, snapshot = { answers: [1, 2, 3] };
  const product = { purpose, leadership, data, snapshot, delivery: workspace };
  const restored = normaliseDeliveryWorkspace(product.delivery);
  assert.equal(restored.methodologyVersion, DELIVERY_METHODOLOGY_VERSION);
  assert.equal(restored.answers[0].comment, workspace.answers[0].comment);
  assert.equal(restored.answers[20].answer, workspace.answers[20].answer);
  assert.equal(restored.submissions.length, 1);
  assert.strictEqual(product.purpose, purpose); assert.strictEqual(product.leadership, leadership); assert.strictEqual(product.data, data); assert.strictEqual(product.snapshot, snapshot);
  const invalid = structuredClone(workspace); invalid.reviewStatus = "verified"; invalid.answers[0].score = 0;
  const sanitised = normaliseDeliveryWorkspace(invalid);
  assert.equal(sanitised.reviewStatus, "not_submitted");
  assert.equal(sanitised.answers[0].score, null);
});

test("Communications pathway contains five sections, 20 authored ratings and five open reflections", () => {
  assert.equal(COMMUNICATIONS_SECTIONS.length, 5);
  assert.deepEqual(COMMUNICATIONS_SECTIONS.map(section => section.questions.length), [4, 4, 4, 4, 4]);
  const questions = COMMUNICATIONS_SECTIONS.flatMap(section => section.questions);
  assert.deepEqual(questions.map(question => question.id), Array.from({ length: 20 }, (_, index) => `COMMUNICATIONS${String(index + 1).padStart(2, "0")}`));
  assert.equal(new Set(questions.map(question => question.question)).size, 20);
  assert.equal(new Set(questions.map(question => question.why)).size, 20);
  const stars = questions.flatMap(question => question.stars);
  assert.equal(stars.length, 100);
  assert.equal(new Set(stars).size, 100);
  assert.ok(questions.every(question => question.why.length >= 100 && question.stars.every(description => description.length >= 50)));
  assert.deepEqual(COMMUNICATIONS_OPEN_QUESTIONS.map(question => question.id), ["COMMUNICATIONS_OPEN01", "COMMUNICATIONS_OPEN02", "COMMUNICATIONS_OPEN03", "COMMUNICATIONS_OPEN04", "COMMUNICATIONS_OPEN05"]);
});

test("Communications covers clear, credible and two-way impact communication without rewarding scale", () => {
  const content = JSON.stringify(COMMUNICATIONS_SECTIONS).toLowerCase();
  for (const concept of ["activities", "outputs", "outcomes", "impact", "limitations", "uncertainty", "stakeholder", "accessible", "consent", "feedback", "correct"]) assert.match(content, new RegExp(concept));
  for (const excludedReward of ["follower count establishes", "large budget is required", "communications department is required"]) assert.doesNotMatch(content, new RegExp(excludedReward));
  assert.equal(COMMUNICATIONS_SECTIONS[1].title, "EVIDENCE, CREDIBILITY & TRANSPARENCY");
  assert.equal(COMMUNICATIONS_SECTIONS[4].title, "COMMUNICATIONS EFFECTIVENESS & IMPROVEMENT");
});

test("Communications scoring uses Purpose bands and excludes comments, reflections and evidence", () => {
  assert.deepEqual(COMMUNICATIONS_SCALE, PURPOSE_SCALE);
  const workspace = newCommunicationsWorkspace();
  workspace.answers.slice(0, 19).forEach(answer => { answer.score = 4; });
  assert.equal(scoreCommunications(workspace.answers), null);
  workspace.answers[19].score = 4;
  workspace.answers[0].comment = "Communication context is unscored.";
  workspace.answers.slice(20).forEach(answer => { answer.answer = "Optional reflection."; answer.score = 1; });
  workspace.evidence.push({ id: "evidence-1", fileName: "impact-report.pdf", category: "Impact report", notes: "Unscored", size: 1200, uploadedAt: new Date(0).toISOString() });
  assert.deepEqual(scoreCommunications(workspace.answers), { score: 4, maturity: "Established" });
  workspace.answers[0].score = 6;
  assert.equal(scoreCommunications(workspace.answers), null);
  for (const score of [1, 1.79, 1.8, 2.59, 2.6, 3.39, 3.4, 4.19, 4.2, 5]) assert.equal(communicationsMaturity(score), purposeMaturity(score));
});

test("Communications persistence is versioned and isolated from all existing pillars", () => {
  const workspace = newCommunicationsWorkspace({ name: "QA", email: "qa@example.invalid", organisation: "QA Charity" });
  workspace.status = "draft";
  workspace.answers[0].score = 5;
  workspace.answers[0].comment = "Our purpose explanation is tested with stakeholders.";
  workspace.answers[20].answer = "Accessible engagement remains our main communications challenge.";
  workspace.submissions.push({ assessmentId: workspace.assessmentId, methodologyVersion: COMMUNICATIONS_METHODOLOGY_VERSION, submittedAt: new Date(0).toISOString(), score: 5, maturity: "Fully Embedded", answers: structuredClone(workspace.answers) });
  const purpose = { preserved: true }, leadership = { preserved: true }, data = { preserved: true }, delivery = { preserved: true }, snapshot = { answers: [1, 2, 3] };
  const product = { purpose, leadership, data, delivery, snapshot, communications: workspace };
  const restored = normaliseCommunicationsWorkspace(product.communications);
  assert.equal(restored.methodologyVersion, COMMUNICATIONS_METHODOLOGY_VERSION);
  assert.equal(restored.answers[0].comment, workspace.answers[0].comment);
  assert.equal(restored.answers[20].answer, workspace.answers[20].answer);
  assert.equal(restored.submissions.length, 1);
  assert.strictEqual(product.purpose, purpose); assert.strictEqual(product.leadership, leadership); assert.strictEqual(product.data, data); assert.strictEqual(product.delivery, delivery); assert.strictEqual(product.snapshot, snapshot);
  const invalid = structuredClone(workspace); invalid.reviewStatus = "verified"; invalid.answers[0].score = 0;
  const sanitised = normaliseCommunicationsWorkspace(invalid);
  assert.equal(sanitised.reviewStatus, "not_submitted");
  assert.equal(sanitised.answers[0].score, null);
});
