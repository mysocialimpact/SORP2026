// Question-specific maturity anchors supplied by MSI. Statements remain in questions.ts.
export const SNAPSHOT_MATURITY_LABELS = ["Not Yet Considered", "Emerging", "Developing", "Established", "Fully Embedded"] as const;

export const SNAPSHOT_MATURITY: Record<number, readonly string[]> = {
  "1": [
    "There is no clear, shared statement of why the organisation exists or what positive change it ultimately wants to create. Different people may describe its purpose in very different ways.",
    "There is growing awareness of the need for a clear purpose and some language exists, but it may be broad, activity-focused or interpreted differently by different people.",
    "The organisation has a reasonably clear statement of purpose and intended change. It is understood by key people but is not yet consistently used to guide decisions across the organisation.",
    "Purpose and intended impact are clearly documented, widely understood and regularly considered in strategic and operational decisions.",
    "The organisation has a clear, documented and widely understood purpose that defines why it exists and the positive change it seeks to create. This purpose actively guides priorities and decisions."
  ],
  "2": [
    "The organisation has limited evidence that its purpose has been shaped by a real understanding of the people, communities or stakeholders it exists to serve.",
    "Some stakeholder needs and perspectives are understood, often through informal contact or individual projects, but this understanding is not systematic.",
    "Key stakeholder groups have been identified and their needs increasingly inform the organisation's thinking, although engagement and evidence remain uneven.",
    "Stakeholder needs and experiences are understood through regular engagement and evidence and clearly influence purpose and priorities.",
    "The organisation has a strong and current understanding of its key stakeholders or beneficiaries. Their needs, experiences and perspectives meaningfully shape the organisation’s purpose and intended impact."
  ],
  "3": [
    "Understanding of purpose is inconsistent or largely limited to a small number of senior people. Staff may know what the organisation does without clearly understanding why it exists.",
    "Some teams and individuals understand the organisation's purpose, but awareness varies considerably and depends heavily on individual managers or communication.",
    "Most people have a reasonable understanding of purpose and can broadly describe how their work relates to it, although consistency is still developing.",
    "Purpose is clearly communicated, understood across most of the organisation and regularly connected to people's roles and priorities.",
    "People throughout the organisation can clearly explain its purpose and understand how their own work contributes to it. Purpose is reflected in everyday behaviour and decision-making."
  ],
  "4": [
    "Strategic priorities are developed largely independently of the organisation’s stated purpose or intended impact. Commercial, operational and impact decisions may pull in different directions.",
    "Purpose is sometimes referenced during strategy discussions, but links between strategy, priorities and intended impact are informal or inconsistent.",
    "The strategy increasingly reflects purpose and impact objectives, although some priorities, investments or decisions are not yet clearly aligned.",
    "Purpose and intended impact are clearly reflected in strategy, planning and most major decisions, with alignment reviewed periodically.",
    "Purpose and intended impact are explicitly reflected in strategy, priorities, resource allocation and major decisions. The organisation can clearly show how its strategy advances its purpose."
  ],
  "5": [
    "The organisation can describe its activities but cannot clearly explain how those activities are expected to lead to the changes or outcomes it wants to create.",
    "There is some understanding of how activities may contribute to outcomes, but the logic is mostly informal and assumptions have not been clearly tested.",
    "A reasonably clear pathway exists linking key activities to outputs and outcomes, although some assumptions or connections remain weak.",
    "The organisation has a documented and credible explanation of how its main activities contribute to intended outcomes, and it reviews this logic.",
    "The organisation has a clear and credible explanation of how its activities lead to outputs, outcomes and longer-term impact. The assumptions behind this logic are understood and reviewed, for example through a Theory of Change."
  ],
  "6": [
    "No senior leader has clear accountability for social impact. Responsibility may be informal, fragmented or assumed to sit elsewhere.",
    "One or more senior leaders show interest in impact, but responsibility and accountability remain informal or unclear.",
    "Senior responsibility for impact has been identified and some expectations are defined, although accountability and oversight are still developing.",
    "Impact responsibilities are formally assigned at senior level and progress is regularly reviewed.",
    "Responsibility for impact is clearly assigned at senior level, with explicit accountability, authority and oversight. Leaders understand what they are responsible for and are held accountable for progress."
  ],
  "7": [
    "Impact is rarely or never discussed formally by senior leadership unless a specific problem, funder request or reporting deadline arises.",
    "Impact appears occasionally on leadership agendas, but discussion is irregular and often reactive.",
    "Impact is discussed with increasing regularity and some relevant performance information is reviewed.",
    "Impact has a regular place in leadership discussions alongside financial, operational and strategic performance.",
    "Impact performance is reviewed routinely by leadership alongside financial, operational and strategic performance. Evidence, risks, learning and improvement actions are part of regular leadership discussion."
  ],
  "8": [
    "Responsibility for impact is unclear. People may care about it, but there is little clarity about who should collect evidence, review performance, make decisions or drive improvements.",
    "Certain individuals informally take responsibility for impact-related work, but roles depend heavily on personal initiative.",
    "Key impact responsibilities have been identified and allocated, although there are still gaps or overlaps.",
    "Roles and responsibilities for impact are clearly documented and understood across most relevant teams.",
    "Roles and responsibilities for managing, measuring and delivering impact are clearly defined across the organisation. People understand both their own responsibilities and where accountability sits."
  ],
  "9": [
    "People are expected to manage or measure impact without specific training, support or access to the skills they need.",
    "Some staff have relevant experience or have received ad hoc training, but capability varies significantly.",
    "The organisation has begun identifying capability needs and provides training or support in important areas.",
    "Most people with significant impact responsibilities have the appropriate skills, training and tools, with remaining gaps actively managed.",
    "The organisation understands the capabilities required to manage impact and actively develops them. Relevant staff have appropriate skills, training, tools and access to specialist support where needed."
  ],
  "10": [
    "Major decisions are primarily made using financial, operational or commercial considerations, with little explicit consideration of their effect on impact.",
    "Impact is considered in some decisions, particularly where consequences are obvious, but there is no consistent approach.",
    "Leadership increasingly considers impact alongside other decision criteria, although practice varies between decisions and teams.",
    "Impact consequences are routinely considered in most significant decisions and supporting evidence is increasingly used.",
    "Leaders routinely consider expected positive and negative impact alongside financial performance, risk and other strategic factors. Significant decisions can be traced back to impact considerations where relevant."
  ],
  "11": [
    "Data collection is limited, irregular or focused mainly on activities and outputs. The organisation has little systematic evidence about the outcomes or changes its work creates.",
    "Some outcome or impact data is collected, usually for individual projects or external requirements, but approaches are inconsistent and coverage is limited.",
    "The organisation has defined much of the impact data it needs and collects it across important areas, although gaps, inconsistencies or limited use of the information remain.",
    "Relevant impact data is collected consistently across most activities using defined processes and is reviewed regularly to understand performance and outcomes.",
    "Relevant impact data is collected systematically and consistently over time. The organisation uses it to understand outcomes, track progress, learn what is working and improve its work."
  ],
  "12": [
    "The organisation has not clearly defined how success or impact will be measured. Measures may focus mainly on activity volumes rather than meaningful change.",
    "Some indicators exist, often created for individual projects or reporting requirements, but there is no coherent organisation-wide set.",
    "Key outcomes have defined indicators and the organisation is improving the balance between activity, output and outcome measures.",
    "A clear set of relevant impact indicators is used consistently across most key areas and reviewed periodically.",
    "The organisation has a focused set of clearly defined indicators that link directly to its intended outcomes and impact. Measures are understood, reviewed and used consistently across the organisation."
  ],
  "13": [
    "Impact data is collected inconsistently or manually without common definitions, processes or quality controls. Confidence in its accuracy and comparability is limited.",
    "Some common data collection approaches exist, but different teams or projects still use inconsistent definitions and methods.",
    "Standard definitions and collection processes exist for important measures, although data quality and consistency issues still arise.",
    "Impact data is collected through documented processes and routine checks provide good confidence in its quality and consistency.",
    "Impact data follows clear definitions, ownership and collection processes. Quality is routinely checked, inconsistencies are addressed and decision-makers have confidence in the information they use."
  ],
  "14": [
    "Impact information is scattered across spreadsheets, documents, inboxes or individual people, making it difficult to access, combine or review.",
    "Some tools are being used to organise impact information, but systems remain fragmented and heavily dependent on manual processes.",
    "Core impact data is increasingly organised within common systems or structured tools, although integration and usability remain incomplete.",
    "Appropriate systems support the storage, management and review of most impact data and provide reliable access for relevant staff.",
    "The organisation uses appropriate systems and tools to organise, protect, analyse and review impact data. Relevant information is accessible to the people who need it and supports regular management decisions."
  ],
  "15": [
    "The organisation can mainly describe what it did or how many people it reached, but has limited credible evidence of what changed as a result.",
    "Some outcome evidence and case examples exist, but evidence is fragmented and it is difficult to make confident organisation-wide claims.",
    "The organisation can demonstrate outcomes in several important areas and is developing more disciplined approaches to interpreting evidence and making impact claims.",
    "Credible outcome evidence supports most significant impact claims, with reasonable understanding of limitations, contribution and alternative explanations.",
    "The organisation can present credible evidence showing the outcomes and changes associated with its work. Claims are proportionate to the evidence, limitations are understood, and contribution is distinguished from stronger claims of causation where appropriate."
  ],
  "16": [
    "Impact is treated largely as a separate initiative, project, corporate responsibility activity or reporting requirement rather than part of how the organisation fundamentally operates.",
    "Impact is increasingly discussed as strategically important but still sits alongside rather than within the organisation's core operating model.",
    "Important parts of the organisation's model are aligned with its impact objectives, although some tensions or disconnected activities remain.",
    "Impact is strongly integrated into the organisation's main model, strategy and operating decisions across most relevant areas.",
    "Creating the intended impact is integral to the organisation’s core model, strategy and value creation. Operational and commercial success are designed to support rather than compete with its impact objectives."
  ],
  "17": [
    "Good impact may occur in individual projects or because of particular people, but there is no consistent organisation-wide approach to ensuring it happens.",
    "Examples of good impact delivery exist, but quality and approach vary considerably between teams, locations or projects.",
    "Common approaches and expectations are being introduced across key activities, although consistency remains uneven.",
    "Clear impact delivery standards and processes operate consistently across most relevant activities and variations are actively addressed.",
    "The organisation has clear standards and processes for delivering impact consistently across relevant activities. Performance is monitored and variations are identified and addressed."
  ],
  "18": [
    "Impact is largely discussed in reports, strategy documents or specialist teams and has little influence on the everyday work of most employees.",
    "Some people actively consider impact in their work, but this depends largely on individual motivation or particular roles.",
    "Impact expectations are increasingly incorporated into roles, objectives and working practices across relevant teams.",
    "Most people understand how their work contributes to impact and this is reflected in normal objectives, processes and decisions.",
    "People understand how their roles contribute to impact, and relevant impact considerations are built into objectives, processes, decisions and normal working practices."
  ],
  "19": [
    "Impact activity depends heavily on short-term funding, isolated budgets or individual initiatives, with limited understanding of how it can be sustained.",
    "The organisation recognises sustainability as an issue and has begun considering the financial requirements of maintaining its impact.",
    "Impact costs and resources are increasingly incorporated into planning, but some significant dependencies or uncertainties remain.",
    "The organisation has a credible and reasonably resilient financial model for maintaining its core impact activities over time.",
    "The financial requirements of delivering impact are understood and reflected in planning, pricing, funding or resource allocation. The organisation has a credible model for sustaining its impact over time."
  ],
  "20": [
    "There is little structured review of whether activities are creating the intended results. Lessons may be noticed informally but rarely lead to systematic changes.",
    "Some teams review lessons and make improvements, but learning is informal and inconsistent.",
    "Regular review and learning processes exist in important areas and evidence increasingly leads to changes in delivery.",
    "Evidence, feedback and learning are routinely reviewed across most relevant activities and improvements are systematically implemented.",
    "The organisation routinely reviews evidence, feedback and performance, identifies what is and is not working, tests improvements and adapts delivery accordingly. Learning is part of normal management practice."
  ],
  "21": [
    "Impact communication is unclear, generic or heavily focused on organisational activity. Different audiences may struggle to understand the change the organisation is trying to create.",
    "Some clear impact messages exist, but communication is inconsistent and largely uses the same language for all audiences.",
    "Core purpose and impact messages are becoming clearer and are increasingly adapted for important stakeholder groups.",
    "Purpose and impact are communicated clearly and consistently to most relevant audiences using appropriate language and examples.",
    "The organisation communicates its purpose, outcomes and impact clearly in language appropriate to different audiences. Stakeholders can readily understand why the organisation exists and the difference it creates."
  ],
  "22": [
    "Descriptions of purpose and impact vary significantly between reports, websites, presentations, fundraising materials or different parts of the organisation.",
    "Some common messaging exists but different teams and channels continue to use significantly different descriptions.",
    "Core messages have been defined and are used across major channels, although inconsistencies remain.",
    "Purpose and impact messaging is consistent across most channels and teams, with appropriate variation for different audiences.",
    "Core purpose and impact messages are clearly defined and consistently expressed across channels while still being appropriately adapted for different audiences and contexts."
  ],
  "23": [
    "Impact claims rely mainly on anecdotes, aspirations or broad statements, with little supporting evidence or clarity about how claims were established.",
    "Some communications include data or evidence, but supporting information is inconsistent and claims may go beyond what the evidence can confidently show.",
    "Evidence supports many important claims and the organisation is becoming more disciplined about distinguishing evidence, interpretation and aspiration.",
    "Most significant impact claims are supported by credible evidence and are reviewed for accuracy and proportionality.",
    "Material impact claims are supported by appropriate evidence. The organisation can show where figures and conclusions come from, makes proportionate claims, and avoids presenting correlation or contribution as proven causation."
  ],
  "24": [
    "External communication focuses almost entirely on positive stories and achievements. Problems, limitations, uncertainty or disappointing results are rarely acknowledged.",
    "Some challenges are acknowledged, usually when unavoidable, but communication still strongly favours positive results.",
    "The organisation increasingly communicates lessons, limitations and challenges alongside achievements, although practice varies.",
    "Balanced communication of successes, challenges, limitations and learning is normal across most major impact reporting.",
    "The organisation communicates honestly about progress, limitations, challenges and learning as well as success. Transparency strengthens rather than undermines the credibility of its impact reporting."
  ],
  "25": [
    "Purpose and impact are mainly used for reporting or communications and have limited influence on relationships with customers, funders, investors, partners, employees or suppliers.",
    "Some teams use purpose or impact evidence in stakeholder relationships, but this happens opportunistically rather than strategically.",
    "The organisation increasingly uses purpose and impact evidence in several important areas such as funding, partnerships, recruitment or customer engagement.",
    "Purpose and credible impact evidence are systematically used across most relevant stakeholder relationships and propositions.",
    "Purpose and credible impact evidence are actively used to strengthen relevant relationships, propositions and decisions across the organisation (for example with customers, funders, investors, partners, employees and suppliers) without overstating what the evidence shows."
  ]
};
