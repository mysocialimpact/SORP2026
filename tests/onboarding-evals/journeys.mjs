import assert from "node:assert/strict";
import {
  nextQuestion,
  nextObjective,
  charityOptions,
  registrationReady,
  validEmail,
} from "../../src/lib/onboarding/state.ts";
const has = (s, k, value) =>
  assert.ok(
    s.facts[k].toLowerCase().includes(value.toLowerCase()),
    `${k}: expected ${value}, got ${s.facts[k]}`,
  );
const candidate = (s, name) => {
  assert.ok(
    charityOptions(s).some((c) => c.toLowerCase().includes(name.toLowerCase())),
    `missing candidate ${name}`,
  );
  assert.equal(s.charity.confirmed, null);
};
const asks = (s, re) => assert.match(nextQuestion(s), re);
const relation = (s, entity, period) =>
  assert.ok(
    s.professional.some(
      (r) =>
        r.entity.toLowerCase().includes(entity.toLowerCase()) &&
        r.period === period,
    ),
    `missing ${period} relationship with ${entity}`,
  );
const message = (text, check) => ({ text, check });
const intro =
  "I'm Alex Rowan, a trustee at Interim Spaces. My email is alex.rowan@example.invalid.";
export const blueCross =
  "My name is Marcus Worrey, and I used to work on a charity client called The Blue Cross, or Blue Cross, I think it was. My email is marcus.worrey@gmail.com.";
export const journeys = [
  {
    id: "trustee-complete",
    steps: [
      message(
        intro +
          " I oversee governance. I found you on LinkedIn. I'm worried about funding.",
        (s) => {
          has(s, "name", "Alex Rowan");
          has(s, "role", "trustee");
          candidate(s, "Interim Spaces");
          asks(s, /Interim Spaces/);
        },
      ),
      {
        confirm: "Interim Spaces",
        check: (s) => assert.equal(nextObjective(s), "complete"),
      },
    ],
  },
  {
    id: "trustee-incomplete",
    steps: [
      message("I'm a trustee at Interim Spaces.", (s) => {
        has(s, "role", "trustee");
        has(s, "organisation", "Interim Spaces");
        candidate(s, "Interim Spaces");
        assert.equal(s.facts.email, "");
        asks(s, /Interim Spaces/);
        assert.doesNotMatch(nextQuestion(s), /what you do|which charity/i);
      }),
      message(
        "My name is Alex Rowan. My email is alex.rowan@example.invalid.",
        (s) => {
          assert.equal(nextObjective(s), "charity");
          asks(s, /Interim Spaces/);
        },
      ),
    ],
  },
  {
    id: "accountant-one-client",
    steps: [
      message(
        "I'm Sarah Jones, an accountant at Burton Sweet. My email is sarah@example.invalid. Brainstrust is one of my charity clients.",
        (s) => {
          has(s, "organisation", "Burton Sweet");
          candidate(s, "Brainstrust");
          assert.ok(!charityOptions(s).includes("Burton Sweet"));
          asks(s, /Brainstrust/);
        },
      ),
    ],
  },
  {
    id: "accountant-portfolio",
    steps: [
      message(
        "I'm Sarah Jones, an accountant at Burton Sweet working with around 20 charities. My email is sarah@example.invalid.",
        (s) => {
          has(s, "portfolio", "20");
          assert.equal(charityOptions(s).length, 0);
          assert.equal(nextObjective(s), "charity");
        },
      ),
    ],
  },
  {
    id: "former-client-blue-cross",
    steps: [
      message(blueCross, (s) => {
        has(s, "name", "Marcus Worrey");
        assert.equal(s.facts.email, "marcus.worrey@gmail.com");
        assert.equal(s.facts.organisation, "");
        relation(s, "Blue Cross", "past");
        candidate(s, "Blue Cross");
        assert.equal(charityOptions(s).length, 1);
        asks(s, /Blue Cross/);
        asks(s, /now|current|today/i);
      }),
      {
        edit: { name: "Marcus Warry" },
        check: (s) => {
          assert.equal(s.facts.name, "Marcus Warry");
          asks(s, /Blue Cross/);
          asks(s, /now|current|today/i);
          assert.doesNotMatch(nextQuestion(s), /Worrey/);
        },
      },
      message(
        "I now work as an independent consultant. I advise charity boards. I found you on LinkedIn. I'm concerned about funding.",
        (s) => {
          assert.equal(s.facts.name, "Marcus Warry");
          has(s, "role", "consultant");
          assert.equal(s.facts.organisation, "");
          assert.equal(nextObjective(s), "charity");
        },
      ),
      {
        confirm: "Blue Cross",
        check: (s) => assert.equal(nextObjective(s), "complete"),
      },
    ],
  },
  {
    id: "current-charity",
    steps: [
      message(
        "I'm Priya Shah, finance director at the charity Mind. My email is priya@example.invalid.",
        (s) => {
          has(s, "role", "finance director");
          has(s, "organisation", "Mind");
          relation(s, "Mind", "current");
          candidate(s, "Mind");
        },
      ),
    ],
  },
  {
    id: "several-charities",
    steps: [
      message(
        "I'm Alex Rowan, an accountant. My email is alex@example.invalid. My charity clients include Shelter, Mind and Brainstrust.",
        (s) => {
          assert.equal(charityOptions(s).length, 3);
          assert.equal(s.charity.proposed, "");
          asks(s, /which|one/i);
        },
      ),
      message("No, the other charity.", (s) => {
        assert.equal(s.clarification, "charity");
        assert.equal(s.charity.phase, "suggest");
      }),
    ],
  },
  {
    id: "identity-only",
    steps: [
      message("My name is Emma Lee. My email is emma@example.invalid.", (s) => {
        assert.equal(s.facts.role, "");
        assert.equal(nextObjective(s), "registration");
        assert.doesNotMatch(nextQuestion(s), /your name|email address/i);
      }),
    ],
  },
  {
    id: "professional-history",
    steps: [
      message(
        "I'm Daniel Reed, daniel@example.invalid. I was an accountant at KPMG, then a volunteer with Shelter. These days I'm a strategy consultant at Orchard Advisory, advising charity boards.",
        (s) => {
          has(s, "role", "consultant");
          has(s, "organisation", "Orchard Advisory");
          relation(s, "KPMG", "past");
          relation(s, "Shelter", "past");
          relation(s, "Orchard Advisory", "current");
          candidate(s, "Shelter");
        },
      ),
    ],
  },
  {
    id: "early-referral",
    steps: [
      message(intro + " A colleague sent me your website.", (s) =>
        has(s, "discovery", "colleague"),
      ),
      { confirm: "Interim Spaces" },
      message("I oversee governance and financial reporting.", (s) => {
        assert.notEqual(nextObjective(s), "discovery");
        assert.doesNotMatch(nextQuestion(s), /come across|find us|hear about/i);
      }),
    ],
  },
  {
    id: "early-concerns",
    steps: [
      message(
        intro +
          " I'm worried about our accounts being ready for SORP 2026. I oversee governance. I found you on LinkedIn.",
        (s) => has(s, "concerns", "SORP"),
      ),
      {
        confirm: "Interim Spaces",
        check: (s) => {
          assert.equal(nextObjective(s), "complete");
          assert.doesNotMatch(nextQuestion(s), /up at night/);
        },
      },
    ],
  },
  {
    id: "change-selected-charity",
    steps: [
      message(intro),
      { confirm: "Interim Spaces" },
      message("Actually, let's use Brainstrust instead.", (s) => {
        assert.equal(s.charity.confirmed, null);
        assert.match(s.charity.proposed, /Brainstrust/i);
        assert.equal(s.charity.phase, "lookup");
        assert.equal(nextObjective(s), "charity");
      }),
    ],
  },
  {
    id: "manual-name-authority",
    steps: [
      message(intro),
      { edit: { name: "Alexandra Rowan" } },
      message(
        "The transcript says Alex Rowan, but please keep the name I entered in the form.",
        (s) => {
          assert.equal(s.facts.name, "Alexandra Rowan");
          assert.doesNotMatch(nextQuestion(s), /Alex Rowan/);
          assert.ok(s.corrections.some((c) => c.field === "name"));
        },
      ),
    ],
  },
  {
    id: "email-transcription-correction",
    steps: [
      message(intro),
      { edit: { email: "alexandra.rowan@example.invalid" } },
      message(
        "My transcription had the wrong email. Please keep the address I edited.",
        (s) => {
          assert.equal(s.facts.email, "alexandra.rowan@example.invalid");
          assert.ok(validEmail(s.facts.email));
        },
      ),
    ],
  },
  {
    id: "correct-misunderstanding",
    steps: [
      message(intro),
      message(
        "I work there, but that's not the charity I want to review.",
        (s) => {
          has(s, "organisation", "Interim Spaces");
          assert.equal(s.charity.confirmed, null);
          assert.ok(!charityOptions(s).includes("Interim Spaces"));
        },
      ),
      message("Let's use Brainstrust.", (s) =>
        assert.equal(s.charity.proposed, "Brainstrust"),
      ),
    ],
  },
  {
    id: "reminder-reference",
    steps: [
      message(intro),
      message("I already told you Interim Spaces.", (s) => {
        has(s, "organisation", "Interim Spaces");
        candidate(s, "Interim Spaces");
        assert.equal(s.lastIntent, "remind");
        assert.equal(s.charity.phase, "suggest");
        asks(s, /right|Interim Spaces/i);
        assert.ok(!charityOptions(s).some((c) => /told|already/i.test(c)));
      }),
    ],
  },
  {
    id: "voice-error-then-typed",
    steps: [
      message(
        "My name is Joanna Smyth. I'm a trustee at Mind. My email is joanna.smyth@example.invalid.",
      ),
      { edit: { name: "Joanna Smith", email: "joanna.smith@example.invalid" } },
      message(
        "I oversee finances and prepare our annual reporting. I found you through LinkedIn.",
        (s) => {
          assert.equal(s.facts.name, "Joanna Smith");
          assert.equal(s.facts.email, "joanna.smith@example.invalid");
          has(s, "responsibilities", "financ");
          has(s, "discovery", "LinkedIn");
        },
      ),
    ],
  },
  {
    id: "many-facts-one-answer",
    steps: [
      message(
        "I'm Sarah Jones, a chartered accountant at Burton Sweet. My email is sarah@example.invalid. I prepare accounts and advise trustees for about 20 charities, including Brainstrust. I found you on LinkedIn. I'm interested in impact reporting and worried about poor data quality.",
        (s) => {
          has(s, "role", "accountant");
          has(s, "organisation", "Burton Sweet");
          has(s, "discovery", "LinkedIn");
          has(s, "concerns", "data");
          has(s, "interests", "impact");
          candidate(s, "Brainstrust");
        },
      ),
      {
        confirm: "Brainstrust",
        check: (s) => assert.equal(nextObjective(s), "complete"),
      },
    ],
  },
  {
    id: "finish-early",
    steps: [
      message(intro),
      message(
        "I'd like to finish onboarding now and explore the platform, please.",
        (s) => {
          assert.equal(s.finishRequested, true);
          assert.ok(registrationReady(s.facts));
          assert.equal(nextObjective(s), "complete");
          assert.equal(s.charity.confirmed, null);
        },
      ),
    ],
  },
  {
    id: "resume-incomplete",
    steps: [
      message(
        "My name is Nina Patel. I used to advise the charity Shelter.",
        (s) => relation(s, "Shelter", "past"),
      ),
      { resume: true },
      message(
        "My email is nina@example.invalid. I'm now a consultant at Cedar Advisory.",
        (s) => {
          has(s, "name", "Nina Patel");
          has(s, "role", "consultant");
          has(s, "organisation", "Cedar Advisory");
          candidate(s, "Shelter");
          relation(s, "Shelter", "past");
          assert.equal(nextObjective(s), "charity");
        },
      ),
    ],
  },
  {
    id: "historical-employer-not-current",
    steps: [
      message(
        "My name is Nina Patel, nina@example.invalid. I used to be a finance manager at Shelter, but I left last year.",
        (s) => {
          assert.equal(s.facts.organisation, "");
          assert.equal(s.facts.role, "");
          relation(s, "Shelter", "past");
          asks(s, /now|current|today/i);
        },
      ),
    ],
  },
  {
    id: "unrelated-person-role",
    steps: [
      message(
        "I'm Emma Lee, emma@example.invalid. My partner is a trustee at Interim Spaces; I'm exploring this for my own work.",
        (s) => {
          assert.equal(s.facts.role, "");
          assert.equal(s.facts.organisation, "");
          assert.equal(nextObjective(s), "registration");
        },
      ),
    ],
  },
];
