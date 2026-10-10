const checkedAreas = [
  "what change your charity is trying to create",
  "aims and objectives",
  "achievements and performance",
  "outputs, outcomes and impact",
  "how you measure success",
  "evidence supporting impact claims",
  "learning and factors affecting results",
  "longer-term impact",
  "how learning informs future plans",
  "sustainability reporting",
];

const otherSorpAreas = [
  "accounting treatments and disclosures",
  "financial statements",
  "reserves",
  "governance",
  "trustee and administrative disclosures",
  "fundraising",
  "volunteers",
  "investments",
  "specialist SORP modules",
];

export function SorpScopeGuide() {
  return <div className="scr-scope-guide">
    <p className="scr-kicker">A FOCUSED SORP 2026 REVIEW</p>
    <h2>Impact &amp;<br />Sustainability<br />Reporting</h2>
    <div className="scr-scope-guide-rule" aria-hidden="true" />
    <p>My Social Impact focuses on the difference charities make and the evidence behind it.</p>
  </div>;
}

export function SorpScopeIntro() {
  return <div className="scr-scope-intro">
    <p className="scr-kicker">SORP 2026</p>
    <h1>ARE YOU SORP READY?</h1>
    <p className="scr-scope-subtitle">Impact &amp; Sustainability Reporting Readiness for SORP 2026</p>
    <p className="scr-scope-lead">This free review helps you understand how ready your charity is for the impact and sustainability reporting elements of SORP 2026.</p>
    <p className="scr-scope-boundary">This is not a full SORP 2026 compliance review.</p>
    <div className="scr-scope-sections">
      <section>
        <h2>WHAT THIS CHECKS</h2>
        <p>This review focuses on areas including:</p>
        <ul>{checkedAreas.map(area => <li key={area}>{area}</li>)}</ul>
      </section>
      <section>
        <h2>WHAT THIS DOES NOT CHECK</h2>
        <p>It does not assess all of the accounting, financial-statement or wider Trustees’ Annual Report requirements contained in SORP 2026.</p>
        <p>SORP 2026 also includes areas such as:</p>
        <ul>{otherSorpAreas.map(area => <li key={area}>{area}</li>)}</ul>
      </section>
    </div>
    <section className="scr-scope-why">
      <h2>WHY THIS FOCUS?</h2>
      <p>My Social Impact specialises in helping organisations understand, evidence, improve and communicate the difference they make. That is why this tool focuses specifically on impact and sustainability reporting.</p>
    </section>
    <section className="scr-scope-future">
      <h2>NEED THE FULL SORP PICTURE?</h2>
      <p>We’re also developing a full SORP 2026 readiness tool covering the wider narrative, financial and accounting requirements.</p>
      <p>If you’d like access when it’s ready, <a href="mailto:marcus@mysocialimpact.org?subject=Full%20SORP%202026%20tool%20early%20access">let us know ↗</a></p>
    </section>
  </div>;
}
