-- Apply after migration 012. Extend only the existing server runtime role.
GRANT SELECT, INSERT, UPDATE ON
  research_console.onboarding_sessions,
  research_console.onboarding_profiles,
  research_console.onboarding_usage,
  research_console.onboarding_operations,
  research_console.charity_intelligence,
  research_console.charity_documents
TO sorp_console_runtime;
GRANT DELETE ON research_console.onboarding_sessions TO sorp_console_runtime;
GRANT USAGE, SELECT ON SEQUENCE
  research_console.onboarding_usage_id_seq,
  research_console.onboarding_operations_id_seq
TO sorp_console_runtime;
