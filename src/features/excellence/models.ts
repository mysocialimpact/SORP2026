export type PillarKey = "purpose" | "leadership" | "data" | "delivery" | "communication";

export type Question = {
  id: number;
  pillar: PillarKey;
  statement: string;
  meaning: string;
};

export type PillarScore = {
  pillar: PillarKey;
  score: number;
};

export type ScoredAssessment = {
  overall: number;
  maturity: string;
  pillarScores: PillarScore[];
  strengths: Question[];
  opportunities: Question[];
};

export type OrganisationSummary = {
  id: string;
  slug: string;
  name: string;
  country: string;
  city: string;
  bcorpStatus: string;
  contactName: string;
  contactEmail: string;
  assessmentCount: number;
  latestAssessmentId: string;
  latestDate: string;
  overall: number;
  maturity: string;
  dataStatus: "active" | "demo" | "quarantined";
  stage: string;
  dateJoined: string;
  lastActivity: string;
  activePillars: PillarKey[];
  purposeStatus: string;
  purposeProgress: number;
};

export type ReportDetail = {
  id: string;
  title: string;
  organisationName: string;
  contactName: string;
  generatedAt: string;
  source: string;
  overall: number;
  maturity: string;
  pillarScores: PillarScore[];
  strengths: Question[];
  opportunities: Question[];
  commentary: string;
  recommendation: string;
};
