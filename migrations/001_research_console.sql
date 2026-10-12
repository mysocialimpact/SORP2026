BEGIN;
CREATE SCHEMA IF NOT EXISTS research_console;
REVOKE ALL ON SCHEMA research_console FROM PUBLIC;
CREATE TABLE IF NOT EXISTS research_console.migrations(version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS research_console.methodologies(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text NOT NULL,categories jsonb NOT NULL,boundaries jsonb NOT NULL,rules text NOT NULL,notes text NOT NULL DEFAULT '',created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS research_console.firms(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text NOT NULL CHECK(length(name) BETWEEN 2 AND 200),name_key text NOT NULL,aliases text[] NOT NULL DEFAULT '{}',website text,domain text,icaew_url text,icaew_tag boolean,credentials jsonb NOT NULL DEFAULT '{}',contact jsonb NOT NULL DEFAULT '{}',
 status text NOT NULL DEFAULT 'Not researched' CHECK(status IN ('Not researched','Researching','Needs more evidence','Ready for Marcus','Approved','Not qualified','Recheck later')),
 review_status text NOT NULL DEFAULT 'Unreviewed',priority integer NOT NULL DEFAULT 0,recheck_at date,research_completed_at timestamptz,approved_at timestamptz,merged_into uuid REFERENCES research_console.firms(id),created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS firms_name_idx ON research_console.firms(name_key);
CREATE INDEX IF NOT EXISTS firms_domain_idx ON research_console.firms(domain);
CREATE UNIQUE INDEX IF NOT EXISTS firms_icaew_unique ON research_console.firms(icaew_url) WHERE icaew_url IS NOT NULL AND merged_into IS NULL;
CREATE INDEX IF NOT EXISTS firms_queue_idx ON research_console.firms(status,priority DESC,created_at) WHERE merged_into IS NULL;
CREATE TABLE IF NOT EXISTS research_console.offices(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),firm_id uuid NOT NULL REFERENCES research_console.firms(id),address text,town text,region text,country text,postcode text,telephone text,source_url text,verification text NOT NULL DEFAULT 'Unverified');
CREATE INDEX IF NOT EXISTS offices_firm_idx ON research_console.offices(firm_id);
CREATE TABLE IF NOT EXISTS research_console.people(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),firm_id uuid NOT NULL REFERENCES research_console.firms(id),name text NOT NULL,role text,office text,qualifications text[],dcha boolean,responsibilities text,profile_url text,notes text);
CREATE INDEX IF NOT EXISTS people_firm_idx ON research_console.people(firm_id);
CREATE TABLE IF NOT EXISTS research_console.runs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),firm_id uuid NOT NULL REFERENCES research_console.firms(id),status text NOT NULL DEFAULT 'running',stage text NOT NULL DEFAULT 'Starting',started_at timestamptz NOT NULL DEFAULT now(),completed_at timestamptz,limitations text[] NOT NULL DEFAULT '{}',actor text NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS runs_active_unique ON research_console.runs(firm_id) WHERE status='running';
CREATE INDEX IF NOT EXISTS runs_firm_idx ON research_console.runs(firm_id,started_at DESC);
CREATE TABLE IF NOT EXISTS research_console.sources(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),run_id uuid NOT NULL REFERENCES research_console.runs(id),url text NOT NULL,title text,status text NOT NULL,http_status integer,error text,accessed_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS sources_run_idx ON research_console.sources(run_id);
CREATE TABLE IF NOT EXISTS research_console.evidence(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),firm_id uuid NOT NULL REFERENCES research_console.firms(id),run_id uuid REFERENCES research_console.runs(id),source_type text NOT NULL,category text CHECK(category IN ('services','people','sorp','clients','recognition')),title text NOT NULL,summary text NOT NULL,url text,accessed_at timestamptz,published_at date,people text[] NOT NULL DEFAULT '{}',sorp text NOT NULL DEFAULT 'Not assessed',confidence text NOT NULL DEFAULT 'Needs review',state text NOT NULL DEFAULT 'Current',notes text NOT NULL DEFAULT '',created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS evidence_firm_idx ON research_console.evidence(firm_id,category);
CREATE TABLE IF NOT EXISTS research_console.assessments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),firm_id uuid NOT NULL REFERENCES research_console.firms(id),run_id uuid REFERENCES research_console.runs(id),methodology_id uuid NOT NULL REFERENCES research_console.methodologies(id),scores jsonb NOT NULL,total integer NOT NULL CHECK(total BETWEEN 0 AND 100),reasons jsonb NOT NULL,evidence_ids jsonb NOT NULL,gaps text[] NOT NULL DEFAULT '{}',confidence text NOT NULL,sorp text NOT NULL,origin text NOT NULL,previous_id uuid REFERENCES research_console.assessments(id),actor text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS assessments_firm_idx ON research_console.assessments(firm_id,created_at DESC);
CREATE TABLE IF NOT EXISTS research_console.reviews(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),firm_id uuid NOT NULL REFERENCES research_console.firms(id),assessment_id uuid REFERENCES research_console.assessments(id),decision text NOT NULL,notes text NOT NULL DEFAULT '',actor text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS reviews_firm_idx ON research_console.reviews(firm_id,created_at DESC);
CREATE TABLE IF NOT EXISTS research_console.imports(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),filename text NOT NULL,fingerprint text NOT NULL UNIQUE,raw_rows jsonb NOT NULL,status text NOT NULL DEFAULT 'preview',summary jsonb NOT NULL DEFAULT '{}',actor text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS research_console.history(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),firm_id uuid REFERENCES research_console.firms(id),entity text NOT NULL,entity_id text NOT NULL,previous jsonb,next jsonb,reason text NOT NULL,actor text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS history_firm_idx ON research_console.history(firm_id,created_at DESC);
CREATE TABLE IF NOT EXISTS research_console.baselines(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),total integer NOT NULL CHECK(total>0),source_url text NOT NULL,established_at date NOT NULL,method text NOT NULL,limitations text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS research_console.visits(actor text PRIMARY KEY,visited_at timestamptz NOT NULL DEFAULT now(),researched integer NOT NULL DEFAULT 0);
INSERT INTO research_console.methodologies(name,categories,boundaries,rules,notes)
SELECT 'Charity Accountant Evidence Methodology v1.0','[{"id":"services","name":"Dedicated charity services","max":25},{"id":"people","name":"Specialist people and qualifications","max":20},{"id":"sorp","name":"SORP knowledge and publications","max":20},{"id":"clients","name":"Clients, case studies and testimonials","max":20},{"id":"recognition","name":"External talks and recognition","max":15}]','[0,20,40,60,80,100]',
'Category descriptions and maxima are agreed. Detailed point-by-point thresholds have not been provided. Automatic scoring is disabled until the pilot rubric is supplied or detailed rules are agreed. Manual assessments require a rationale for every category and source references for every positive award. Do not infer qualifications, capabilities or service quality.',
'Initial brief. No detailed rubric invented. Boundary revisions create new versions; raw evidence and historical assessments remain unchanged.'
WHERE NOT EXISTS(SELECT 1 FROM research_console.methodologies);
INSERT INTO research_console.migrations(version) VALUES('001') ON CONFLICT DO NOTHING;
COMMIT;
