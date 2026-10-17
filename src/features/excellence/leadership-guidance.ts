export type LeadershipQuestionGuidance = { why: string; stars: readonly [string, string, string, string, string] };

/** Authored guidance only. Array positions correspond to Leadership questions 1–20. */
export const LEADERSHIP_QUESTION_GUIDANCE: readonly LeadershipQuestionGuidance[] = [
  {
    why: "This explores whether leaders turn stated support for social impact into sustained attention and visible action. Mature commitment is demonstrated through choices, behaviour and follow-through, not simply a policy or public statement.",
    stars: [
      "Senior leaders show little awareness of, or commitment to, the organisation's social impact.",
      "One or two leaders express support, but attention is informal and rarely followed by action.",
      "Senior leaders demonstrate meaningful commitment in some areas, although it is not yet consistent across the leadership group.",
      "Senior leaders consistently demonstrate commitment through their priorities, behaviour and follow-through.",
      "Commitment to impact is deeply embedded in leadership practice, regularly tested and sustained through changing circumstances."
    ]
  },
  {
    why: "This assesses whether social impact receives serious leadership attention alongside financial and operational matters. Mature leadership makes impact part of its regular agenda and priorities without treating it as a separate or occasional concern.",
    stars: [
      "Social impact is not recognised as a senior leadership priority.",
      "Leaders discuss impact occasionally, usually in response to an external request or immediate issue.",
      "Impact is an identifiable priority, but leadership attention is uneven or easily displaced.",
      "Senior leaders give social impact consistent and proportionate attention alongside other organisational priorities.",
      "Impact is an enduring leadership priority whose relevance and balance with other priorities are actively reviewed."
    ]
  },
  {
    why: "This considers whether leaders understand what they are individually and collectively responsible for in relation to impact. Mature practice combines shared ownership with sufficient clarity about who must lead, oversee and act.",
    stars: [
      "Senior leaders do not recognise specific responsibilities for social impact.",
      "Some leaders accept a general responsibility, but expectations remain vague and individual.",
      "Most leaders understand their main responsibilities, although boundaries or collective duties are not fully clear.",
      "Individual and collective leadership responsibilities for impact are clearly understood and consistently applied.",
      "Leadership responsibilities are embedded, tested through challenge and refreshed as roles or circumstances change."
    ]
  },
  {
    why: "This tests whether commitment survives when leaders face genuine trade-offs, constraints or short-term pressure. Mature leaders consider impact honestly in difficult choices and explain any compromise rather than allowing it to disappear from view.",
    stars: [
      "Social impact is routinely set aside when commercial or operational pressure arises.",
      "Leaders try to protect impact informally, but it usually loses out when decisions become difficult.",
      "Impact is considered in some pressured decisions, although the approach and follow-through are inconsistent.",
      "Leaders consistently weigh impact when managing difficult pressures and make conscious, explainable trade-offs.",
      "Leadership commitment remains resilient under pressure, with trade-offs challenged, recorded appropriately and reviewed for consequences."
    ]
  },
  {
    why: "This assesses whether there is identifiable ownership for social impact at the level where organisational direction is set. Mature accountability is clear, understood and durable rather than depending on informal enthusiasm from one individual.",
    stars: [
      "No senior leader or board member has clearly assigned responsibility for social impact.",
      "Responsibility is discussed informally, but no individual has clear accountability.",
      "A senior leader or board member has responsibility, although the role and expectations are not fully defined.",
      "Clear responsibility is assigned, with defined expectations and regular accountability.",
      "Social impact accountability is embedded within leadership and governance, with effective oversight, regular review and arrangements that maintain responsibility when people or circumstances change."
    ]
  },
  {
    why: "This explores whether the board or equivalent governing leadership provides informed oversight, constructive challenge and accountability for impact. The form should be proportionate: organisations without a separate board should consider whoever performs the governing role.",
    stars: [
      "The governing leadership provides no meaningful oversight of social impact responsibilities.",
      "Impact reaches the board or equivalent occasionally, but scrutiny is limited and largely reactive.",
      "The governing body reviews impact in some contexts and asks useful questions, with identifiable gaps in consistency or depth.",
      "The board or equivalent provides regular, informed oversight and constructive challenge on social impact responsibilities.",
      "Governance oversight is embedded and effective, with the quality of information, challenge and accountability itself kept under review."
    ]
  },
  {
    why: "This assesses whether people know where responsibility for managing impact sits across the organisation. Mature leadership creates appropriate clarity without assuming that every organisation needs a large team or elaborate structure.",
    stars: [
      "Responsibilities for managing social impact are not defined across the organisation.",
      "A few people take responsibility informally, creating gaps, duplication or reliance on personal initiative.",
      "Main responsibilities are identifiable, but some roles, handovers or expectations remain unclear.",
      "Responsibilities are clearly and proportionately defined across relevant roles and understood by those involved.",
      "Accountability is embedded across the organisation, with responsibilities reviewed and adapted while maintaining clear ownership."
    ]
  },
  {
    why: "This asks whether leadership responsibilities have consequences and are followed up in practice. Mature accountability includes appropriate expectations, review and constructive action when commitments are not met.",
    stars: [
      "Leaders are not held accountable for fulfilling social impact responsibilities.",
      "Expectations are mentioned informally, but performance or follow-through is rarely examined.",
      "Some leaders are asked to account for impact commitments, although mechanisms are uneven or weakly used.",
      "Leaders are consistently held to clear, proportionate expectations and follow-up is meaningful.",
      "Accountability is embedded, constructive and transparent internally, with its effectiveness reviewed and strengthened over time."
    ]
  },
  {
    why: "This explores whether impact is a real consideration when leaders shape strategy, investment, partnerships or other important choices. Mature practice weighs impact alongside financial, operational and strategic factors rather than applying it after a decision is made.",
    stars: [
      "Important leadership decisions are made without considering social impact.",
      "Impact is considered occasionally or late in the process, usually because an individual raises it.",
      "Leaders consider impact in several types of important decision, but the practice is not yet reliable.",
      "Social impact is consistently and meaningfully considered alongside other factors in important decisions.",
      "Impact consideration is embedded in leadership judgement, supported by challenge and reviewed to understand the quality of resulting decisions."
    ]
  },
  {
    why: "This assesses whether leaders actively consider who or what could be harmed by organisational choices. Mature practice identifies plausible negative consequences early, weighs them honestly and takes proportionate steps to avoid or address them.",
    stars: [
      "Leaders do not consider potential negative social or environmental consequences when making decisions.",
      "Possible harm is noticed informally, usually after concerns are raised or consequences emerge.",
      "Leaders identify and discuss some potential harms, but analysis or action is inconsistent.",
      "Potential negative consequences are considered systematically and proportionate mitigation influences decisions.",
      "Responsible consideration of harm is embedded, includes relevant challenge and perspectives, and is reviewed against actual consequences."
    ]
  },
  {
    why: "This considers how leaders exercise judgement when impact ambition and financial viability pull in different directions. Mature leadership protects the organisation's ability to continue while making deliberate, transparent choices about the impact it can responsibly pursue.",
    stars: [
      "Leaders treat financial sustainability and social impact as unrelated, or consistently sacrifice one without considering the consequences.",
      "The tension is recognised, but choices are reactive and depend on short-term pressure or individual preference.",
      "Leaders make some informed trade-offs, although criteria, consistency or longer-term thinking need development.",
      "Leadership balances viability and impact through clear, informed judgement that protects both mission and organisational resilience.",
      "The balance is embedded in strategic judgement, openly challenged and adapted as evidence, risk and circumstances change."
    ]
  },
  {
    why: "This assesses whether leadership backs its impact priorities with proportionate time, attention, people and money. Mature practice aligns resources with stated priorities without assuming that higher spending or a dedicated department is automatically better.",
    stars: [
      "Leadership allocates no identifiable attention or resources to social impact priorities.",
      "Support is occasional and informal, leaving impact work dependent on spare capacity.",
      "Some priorities receive meaningful support, but allocation is uneven or not clearly linked to leadership choices.",
      "Leaders consistently allocate proportionate attention and resources in line with agreed impact priorities.",
      "Resource choices are embedded in strategic leadership, tested for sufficiency and value, and adjusted as priorities and learning evolve."
    ]
  },
  {
    why: "This explores whether senior leaders have the knowledge, judgement and support required to oversee impact well. Mature capability can come from experience, learning or access to trusted advice; it does not require every leader to be a technical specialist.",
    stars: [
      "Senior leaders lack the basic understanding needed to oversee social impact and do not seek support.",
      "A small amount of relevant knowledge exists, but capability depends on individuals and important gaps remain unaddressed.",
      "Leaders have useful knowledge and access to some development or advice, with identifiable capability gaps.",
      "Senior leaders collectively have the judgement, skills and support needed for effective impact oversight.",
      "Leadership capability is embedded and continually strengthened through reflection, challenge, development and timely specialist advice."
    ]
  },
  {
    why: "This assesses the signals leaders send through their behaviour, expectations and responses. Mature culture grows when leaders make responsibility for impact part of everyday organisational conduct, not the concern of a specialist team alone.",
    stars: [
      "Leaders do not encourage people to take responsibility for social impact.",
      "Individual leaders promote responsibility informally, but their messages and example are inconsistent.",
      "Leadership sets some useful expectations and models responsible behaviour, although this is not yet organisation-wide.",
      "Leaders consistently model and reinforce shared responsibility for impact across relevant roles.",
      "A strong culture of responsibility is sustained by leadership example, constructive accountability and regular attention to how the culture is experienced."
    ]
  },
  {
    why: "This explores whether leaders create enough psychological and practical space for questions, disagreement and difficult impact conversations. Mature leadership welcomes well-founded challenge and uses it to improve judgement rather than treating it as disloyalty.",
    stars: [
      "Questions or disagreement about social impact are discouraged or ignored by leadership.",
      "Some challenge is tolerated informally, but people are uncertain whether it is safe or worthwhile to speak up.",
      "Leaders invite discussion in some settings, although difficult perspectives do not always influence decisions.",
      "Constructive challenge is actively encouraged, heard respectfully and used in leadership deliberation.",
      "Open challenge is embedded in leadership culture, includes diverse perspectives and is reviewed to ensure it remains genuine and influential."
    ]
  },
  {
    why: "This assesses whether relevant lived experience and stakeholder perspectives reach leaders when impact-related choices are made. Mature involvement is proportionate and influential; it is not measured by the complexity of consultation mechanisms.",
    stars: [
      "Leadership makes impact-related decisions without involving or considering relevant stakeholders.",
      "Leaders hear occasional stakeholder views, but involvement is informal and rarely shapes decisions.",
      "Relevant stakeholders influence some important decisions, although whose perspectives are included and how they are used is inconsistent.",
      "Leadership involves appropriate stakeholders in a timely way and can explain how their perspectives informed decisions.",
      "Stakeholder influence is embedded in leadership judgement, includes voices most affected or easily overlooked, and is regularly tested for authenticity."
    ]
  },
  {
    why: "This examines whether leaders deliberately revisit impact priorities and responsibilities at sensible intervals and when circumstances change. 'Formal' means purposeful and accountable, not necessarily bureaucratic or heavily documented.",
    stars: [
      "Senior leadership does not deliberately review social impact priorities or responsibilities.",
      "Reviews happen only when an external deadline, problem or individual prompts them.",
      "Leadership conducts meaningful reviews occasionally, but timing, participation or follow-through is inconsistent.",
      "Purposeful, proportionate reviews take place at appropriate intervals and when significant change occurs.",
      "Review is embedded in leadership practice, produces accountable decisions and is itself refined to remain useful and proportionate."
    ]
  },
  {
    why: "This assesses whether leaders take ownership when impact concerns or failures come to light. Mature responses are timely, honest and proportionate, address causes as well as symptoms and keep affected people in view.",
    stars: [
      "Leadership ignores, minimises or deflects concerns, weaknesses or failures relating to social impact.",
      "Leaders respond to serious issues, but action is delayed, defensive or focused only on immediate symptoms.",
      "Leadership takes ownership of some concerns and acts, although investigation, communication or follow-through has gaps.",
      "Leaders respond promptly and constructively, address underlying causes and monitor agreed corrective action.",
      "Accountable response is embedded, includes appropriate transparency and challenge, and turns failures into sustained improvements in leadership practice."
    ]
  },
  {
    why: "This explores whether evidence, experience and feedback change how leaders think and behave. Mature continuous improvement can be seen in better governance and judgement, not merely in operational process changes.",
    stars: [
      "Leadership does not use lessons or feedback to improve its approach to social impact.",
      "Individual leaders acknowledge learning informally, but it rarely changes leadership behaviour or governance.",
      "Some lessons lead to identifiable leadership changes, although learning is not gathered or applied consistently.",
      "Leadership routinely uses relevant lessons and feedback to improve its judgement, behaviour and oversight.",
      "Continuous learning is embedded, with leadership changes tested for effect and shared understanding carried into future decisions."
    ]
  },
  {
    why: "This assesses whether responsibility for impact can survive staff turnover, restructuring, growth or other disruption. Mature organisations use proportionate handovers, shared understanding and governance arrangements so responsibility does not rest on one champion.",
    stars: [
      "Leadership responsibility for social impact depends entirely on particular individuals and is lost when they leave or circumstances change.",
      "Some informal continuity exists, but handovers and replacement responsibilities are uncertain.",
      "Core responsibility is usually maintained through change, although gaps or delays still occur.",
      "Clear ownership, handovers and shared leadership understanding reliably maintain impact responsibility through change.",
      "Continuity is resilient and embedded, with succession, governance and learning arrangements regularly tested against foreseeable organisational change."
    ]
  }
] as const;
