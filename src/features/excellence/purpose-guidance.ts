export type PurposeQuestionGuidance = {
  why: string;
  stars: readonly [string, string, string, string, string];
};

/** Explanatory content only. Array positions correspond to Purpose questions 1–20. */
export const PURPOSE_QUESTION_GUIDANCE: readonly PurposeQuestionGuidance[] = [
  {
    why: "This assesses whether your purpose has been made explicit rather than remaining an assumption. A mature organisation has a clear, accessible statement of why it exists and revisits it to ensure it remains meaningful.",
    stars: [
      "We have no documented purpose.",
      "We have discussed our purpose informally, but it has not been clearly documented.",
      "We have a documented purpose statement, although it could be clearer or more complete.",
      "Our purpose is clearly articulated and documented, with a strong explanation of why we exist.",
      "Our purpose is exceptionally clear, well developed, documented and regularly reviewed for continued relevance."
    ]
  },
  {
    why: "This explores whether the organisation understands the fundamental reason it exists, beyond its day-to-day work. Mature purpose is shared and can be explained consistently without relying only on a written statement.",
    stars: [
      "We have not considered why the organisation exists beyond carrying out its activities.",
      "A few people have views about why we exist, but there is no shared understanding.",
      "There is a broadly shared understanding of why we exist, although interpretations still vary.",
      "People across the organisation clearly understand the underlying reason we exist.",
      "Our reason for existing is deeply understood, consistently expressed and actively used to maintain clarity of purpose."
    ]
  },
  {
    why: "This tests whether purpose describes the change you exist to create rather than simply what you sell or do. Mature organisations can clearly separate their enduring reason for existing from the activities they may change over time.",
    stars: [
      "Our purpose is expressed entirely in terms of the products, services or activities we provide.",
      "We recognise that purpose should go beyond activities, but our language still mostly describes what we do.",
      "Our purpose includes the difference we seek to make, although it remains partly mixed with our activities.",
      "Our purpose clearly expresses why we exist and is distinct from the products, services or activities we use to pursue it.",
      "Our purpose is an enduring expression of the change we exist to create and remains clear even as our activities evolve."
    ]
  },
  {
    why: "This assesses whether your purpose still fits the organisation and the context in which it operates. A mature purpose responds to meaningful change while preserving a clear and enduring reason for existing.",
    stars: [
      "Our purpose no longer reflects the organisation or its current context.",
      "Parts of our purpose remain relevant, but important changes have not been reflected.",
      "Our purpose is generally relevant today, although some wording or emphasis needs updating.",
      "Our purpose closely reflects who we are, the needs we address and the context in which we operate today.",
      "Our purpose is demonstrably current and enduring, with relevance actively considered as the organisation and its context change."
    ]
  },
  {
    why: "This looks for a coherent understanding of purpose among those with the greatest influence over organisational direction. In a mature organisation, senior leaders describe the same core reason for existing even when using their own words.",
    stars: [
      "Senior leaders give conflicting or unrelated explanations of our purpose.",
      "Some leaders describe a similar purpose, but there are substantial differences in emphasis or meaning.",
      "Most leaders share a broadly consistent view, although a few important differences remain.",
      "Senior leaders describe our purpose consistently and agree on its essential meaning.",
      "Senior leaders demonstrate a deeply shared and nuanced understanding of purpose and preserve that consistency as circumstances change."
    ]
  },
  {
    why: "This assesses whether the positive change at the heart of your purpose has been defined, not merely implied. A mature approach describes the change clearly enough to give the organisation a meaningful long-term destination.",
    stars: [
      "We have not defined the change our organisation wants to create.",
      "We have broad ambitions for change, but they are informal, vague or open to very different interpretations.",
      "We have described the change we want to create, although parts need greater clarity or precision.",
      "The change we seek is clearly defined, specific enough to guide our purpose and understood by relevant people.",
      "We have a compelling, precise and regularly tested definition of the enduring change our organisation exists to create."
    ]
  },
  {
    why: "This examines whether your purpose is clear about the people, communities or other groups whose lives or circumstances should improve. Mature purpose identifies intended beneficiaries precisely while recognising that different groups may be affected in different ways.",
    stars: [
      "We have not identified who is intended to benefit from our work.",
      "We refer broadly to beneficiaries or stakeholders, but have not defined the relevant groups.",
      "We have identified our main intended beneficiaries, although some groups or distinctions remain unclear.",
      "Our intended beneficiaries are clearly defined, including the principal groups our purpose is designed to benefit.",
      "We have a precise, inclusive and current understanding of intended beneficiaries, including differing needs and who may be overlooked."
    ]
  },
  {
    why: "This assesses whether your purpose is grounded in a credible understanding of the need it exists to address. A mature organisation can explain the nature, causes and context of that need, rather than relying on assumptions.",
    stars: [
      "We have little or no shared understanding of the needs or challenges our organisation exists to address.",
      "We have an informal or anecdotal view of the need, with important gaps in our understanding.",
      "We understand the main need and its context, although some causes, experiences or changes require further exploration.",
      "Our purpose is grounded in a clear, current and well-supported understanding of the needs or challenges involved.",
      "We have a deep, nuanced and continually refreshed understanding of the need, including root causes and differing lived experiences."
    ]
  },
  {
    why: "This considers whether you have translated your purpose into a clear picture of the lasting conditions you hope to see. Mature long-term outcomes express meaningful change rather than short-term activity or output.",
    stars: [
      "We have not defined any long-term outcomes connected to our purpose.",
      "We have broad aspirations, but they are not expressed as clear long-term changes.",
      "We have identified several intended long-term outcomes, although some are vague or activity-focused.",
      "Our intended long-term outcomes are clear, coherent and directly connected to our purpose.",
      "Our long-term outcomes provide a compelling and well-developed picture of success, with clear boundaries and continued relevance."
    ]
  },
  {
    why: "This takes an overall view of how well the organisation has defined the difference its purpose is meant to make. A mature understanding connects the need, intended beneficiaries and desired long-term change into a coherent whole.",
    stars: [
      "We cannot yet explain the difference our organisation ultimately wants to make.",
      "We have a general aspiration to make a difference, but the intended change is largely undefined.",
      "We can describe the main difference we want to make, although the elements are not yet fully connected.",
      "We have a clear and coherent understanding of the difference we seek, for whom and in response to what need.",
      "Our understanding of the intended difference is comprehensive, distinctive and sufficiently developed to anchor our purpose over time."
    ]
  },
  {
    why: "This assesses whether purpose remains a living expression of why the organisation exists. Mature organisations review it at sensible intervals and when significant changes make reconsideration necessary, without changing it simply for novelty.",
    stars: [
      "Our purpose has never been reviewed or reconsidered.",
      "We revisit our purpose only informally or when a problem forces us to do so.",
      "Our purpose has been reviewed occasionally, but there is no clear rhythm or approach for refining it.",
      "We review our purpose at appropriate intervals and refine it when evidence or meaningful change warrants this.",
      "Purpose review is a thoughtful, established practice that tests continued relevance while protecting the enduring core of why we exist."
    ]
  },
  {
    why: "This explores whether the people most affected by your purpose have helped shape its meaning. A mature purpose reflects relevant perspectives and experiences, with the organisation clear about whose input was sought and how it influenced the result.",
    stars: [
      "Our purpose was developed without input from relevant stakeholders or intended beneficiaries.",
      "A small amount of informal input was heard, but it had little visible influence on our purpose.",
      "We sought input from some relevant groups and used parts of it, although participation or influence was uneven.",
      "A meaningful range of relevant stakeholders helped shape our purpose, and their influence can be clearly explained.",
      "Our purpose is genuinely informed by diverse and inclusive stakeholder insight, with perspectives revisited as needs and context evolve."
    ]
  },
  {
    why: "This tests whether stated purpose is authentic to the organisation that exists today. A mature purpose is ambitious but credible, reflecting the organisation’s identity, context and genuine reason for being rather than acting as a slogan.",
    stars: [
      "Our stated purpose bears little relationship to the reality of the organisation.",
      "There are some connections between our purpose and reality, but the statement is largely aspirational or generic.",
      "Our purpose broadly reflects the organisation, although there are noticeable gaps between the language and our current identity or context.",
      "Our purpose is an authentic and accurate expression of the organisation and the reason it exists.",
      "Our purpose is both aspirational and demonstrably authentic, capturing our distinctive identity while honestly acknowledging our context and boundaries."
    ]
  },
  {
    why: "This considers whether purpose gives the organisation a useful long-term orientation when choices about its future arise. A mature purpose is clear and distinctive enough to act as a practical compass without prescribing every action.",
    stars: [
      "Our purpose provides no meaningful direction for the organisation’s future.",
      "Our purpose offers a general aspiration, but is too vague to help distinguish suitable future directions.",
      "Our purpose influences some thinking about the future, although its implications are not always clear.",
      "Our purpose provides a clear and useful compass for considering the organisation’s future direction.",
      "Our purpose consistently clarifies which future possibilities fit why we exist and helps us navigate uncertainty without losing our core intent."
    ]
  },
  {
    why: "This is a holistic check on the depth and coherence of the organisation’s understanding of purpose. Mature thinking recognises purpose as an enduring organisational concept, can explain its boundaries and remains open to thoughtful challenge.",
    stars: [
      "We have not meaningfully explored what organisational purpose means for us.",
      "We have begun discussing purpose, but our thinking is fragmented, generic or dependent on a few individuals.",
      "We have a reasonable shared view of purpose, though some concepts, boundaries or implications remain underdeveloped.",
      "Our thinking about purpose is coherent, informed and sufficiently developed to explain why it matters to our organisation.",
      "Our thinking is sophisticated, distinctive and continually challenged, with a shared understanding of purpose, its limits and its enduring value."
    ]
  },
  {
    why: "This assesses whether claims about your purpose can be traced to credible material rather than assertion alone. Mature evidence may include research, consultation, founding documents or other records that explain why the purpose is relevant and authentic.",
    stars: [
      "We have no documented evidence that supports the basis or relevance of our purpose.",
      "A few documents or anecdotes relate to our purpose, but they are incomplete or difficult to connect to it.",
      "We hold some useful evidence supporting our purpose, although there are gaps in coverage, quality or organisation.",
      "Our purpose is supported by relevant, credible and accessible evidence that explains its basis and continued relevance.",
      "A coherent and well-maintained body of evidence substantiates our purpose, its context and its authenticity, and is reviewed as understanding evolves."
    ]
  },
  {
    why: "This tests whether you can explain how your reason for existing connects to the positive difference you intend to make. Mature articulation makes the relationship logical and easy to understand without drifting into detailed delivery plans or performance measures.",
    stars: [
      "We have not articulated any relationship between our purpose and intended impact.",
      "We assume the connection is self-evident, but can explain it only in broad or inconsistent terms.",
      "We have described a plausible connection, although parts of the relationship remain vague or incomplete.",
      "We clearly articulate how our purpose relates to the impact we ultimately intend to create.",
      "The relationship between purpose and intended impact is compelling, coherent and explicit about the contribution our organisation exists to make."
    ]
  },
  {
    why: "This explores whether there are credible examples showing that the organisation’s stated purpose is more than words. A mature organisation can point to representative examples that make its purpose tangible while recognising that examples alone do not prove overall impact.",
    stars: [
      "We cannot identify examples that demonstrate our purpose in practice.",
      "We can describe isolated anecdotes, but they are undocumented or only loosely connected to our purpose.",
      "We have several relevant examples, although they are inconsistent, incomplete or not clearly explained.",
      "We have credible, documented examples that clearly illustrate what our purpose looks like in practice.",
      "We maintain a rich and representative body of examples that makes our purpose tangible, shows its distinctive meaning and is updated over time."
    ]
  },
  {
    why: "This assesses whether the beliefs beneath your purpose have been made visible and examined. Mature organisations recognise what they are assuming about the need, beneficiaries and desired change, and are willing to revise those assumptions when challenged.",
    stars: [
      "We have not identified the assumptions underlying our purpose.",
      "Some assumptions are recognised informally, but they have not been clearly stated or examined.",
      "We have identified several important assumptions, although analysis is incomplete or not consistently recorded.",
      "The main assumptions behind our purpose are explicit, documented and thoughtfully considered.",
      "We have a comprehensive and nuanced understanding of underlying assumptions, including uncertainty, alternative perspectives and when reconsideration is needed."
    ]
  },
  {
    why: "This is an external clarity test: whether the available material tells a coherent story about why the organisation exists. A mature evidence base enables an informed independent reader to understand the purpose, its basis and intended change without relying on insider knowledge.",
    stars: [
      "An independent reviewer would be unable to understand our purpose from the evidence available.",
      "A reviewer might infer parts of our purpose, but would encounter major gaps, contradictions or unexplained language.",
      "A reviewer would gain a reasonable overview, although they would need clarification on important aspects.",
      "A reviewer could clearly understand our purpose, its context and intended change from the evidence available.",
      "Our evidence gives an independent reviewer a clear, compelling and nuanced understanding of purpose, including its basis, boundaries and continued relevance."
    ]
  }
] as const;
