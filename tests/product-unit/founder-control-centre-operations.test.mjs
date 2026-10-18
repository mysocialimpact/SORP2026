import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const centre = await readFile(new URL("../../src/components/founder/founder-control-centre.tsx", import.meta.url), "utf8");
const products = await readFile(new URL("../../src/components/founder/product-dashboard.tsx", import.meta.url), "utf8");
const productTabs = await readFile(new URL("../../src/components/product-folder-tabs.tsx", import.meta.url), "utf8");
const productDefinitions = await readFile(new URL("../../src/lib/products.ts", import.meta.url), "utf8");
const founderNavigation = await readFile(new URL("../../src/lib/founder-navigation.ts", import.meta.url), "utf8");
const founderAdminNavigation = await readFile(new URL("../../src/components/founder/founder-admin-navigation.tsx", import.meta.url), "utf8");
const layout = await readFile(new URL("../../src/app/layout.tsx", import.meta.url), "utf8");
const header = await readFile(new URL("../../src/components/header.tsx", import.meta.url), "utf8");
const footer = await readFile(new URL("../../src/components/footer.tsx", import.meta.url), "utf8");
const sayHello = await readFile(new URL("../../src/components/say-hello.tsx", import.meta.url), "utf8");
const actionBar = await readFile(new URL("../../src/components/product-action-bar.tsx", import.meta.url), "utf8");
const route = await readFile(new URL("../../src/app/api/founder/[...path]/route.ts", import.meta.url), "utf8");
const auth = await readFile(new URL("../../src/lib/founder/auth.ts", import.meta.url), "utf8");
const drawers = await readFile(new URL("../../src/components/founder/account-drawers.tsx", import.meta.url), "utf8");
const independentFounder = await readFile(new URL("../../src/lib/sorp-auth/founder-console.ts", import.meta.url), "utf8");
const independentIdentity = await readFile(new URL("../../src/lib/sorp-auth/identity.ts", import.meta.url), "utf8");

test("founder home uses the requested operational identity and the one shared set of six product tabs", () => {
  assert.match(header, /FOUNDER CONTROL CENTRE/);
  assert.doesNotMatch(centre, /<h1>FOUNDER CONTROL CENTRE<\/h1>/);
  for (const label of ["Home", "Are You SORP Ready?", "Ask SORP", "Charity Impact Reports", "Social Impact Excellence", "My Impact Director"]) assert.match(productDefinitions, new RegExp(label.replace(/[?]/g, "\\?")));
  assert.equal((layout.match(/<ProductFolderTabs\b/g) || []).length, 1);
  assert.match(productTabs, /founderNavigation \? `\/founder\/#\$\{founderTarget\}`/);
  assert.match(productTabs, /founderMode \? folderTabs : \[folderTabs\[0\], accountFolder, \.\.\.folderTabs\.slice\(1\)\]/);
  assert.doesNotMatch(centre, /founder-product-nav|founder-admin-nav/);
  assert.match(centre, /Search organisations or users/);
  assert.doesNotMatch(centre, /Continue your assessment|Where you are|Recommended next step/);
});

test("founder administration navigation is persistent, complete and hash-synchronised", () => {
  for (const label of ["Organisations & Users", "Accounts & Billing", "Accountants & Advisers", "Feedback & Enquiries", "Platform Management"]) assert.match(founderNavigation, new RegExp(label.replace(/[&]/g, "&")));
  assert.match(layout, /<PlatformNavigation><Header \/><ProductFolderTabs \/><FounderAdminNavigation \/><\/PlatformNavigation>/);
  assert.match(founderAdminNavigation, /aria-current=\{active === item\.key \? "page" : undefined\}/);
  assert.match(founderAdminNavigation, /FOUNDER_VIEW_EVENT/);
  assert.match(centre, /FOUNDER_VIEW_EVENT/);
});

test("founder shell removes customer chrome while public shell remains intact", () => {
  assert.match(header, /founder-mode-header/);
  assert.match(header, /founder-control-title/);
  assert.doesNotMatch(header, /View My Dashboard|founder-mode-indicator/);
  for (const publicLabel of ["Our Mission", "Find Accountants", "Talk to Us"]) assert.match(header, new RegExp(publicLabel));
  assert.match(footer, /startsWith\("\/founder\/"\)\) return null/);
  assert.match(sayHello, /if \(founderMode\) return null/);
  assert.match(actionBar, /if \(founderMode\) return null/);
});

test("product dashboards use recorded rows and state truthful empty analytics", () => {
  assert.match(products, /data\.products\.readiness/);
  assert.match(products, /data\.products\.askSorp/);
  assert.match(products, /data\.products\.impactReports/);
  assert.match(products, /data\.products\.excellence/);
  assert.match(products, /data\.products\.impactDirector/);
  assert.match(products, /Topic analytics are not currently collected/);
  assert.match(products, /Conversation content is not shown/);
  assert.match(products, /Search organisation, user or status/);
  assert.match(products, /founder-sort/);
  assert.match(centre, /aria-sort/);
});

test("founder organisation and user data remain server-authorised", () => {
  assert.match(route, /protectFounderRequest\(request\)/);
  assert.match(route, /action:"founder-account-detail"/);
  assert.match(route, /action: "founder-overview"/);
  assert.match(auth, /platformAccess\?\.founder !== true/);
  assert.doesNotMatch(auth, /FOUNDER_EMAIL/);
});

test("founder can grant any plan free for a chosen number of days, weeks or months", () => {
  assert.match(drawers, /value="period">Fixed period/);
  assert.match(drawers, /name="durationAmount"/);
  for (const unit of ["days", "weeks", "months"]) assert.match(drawers, new RegExp(`value="${unit}"`));
  assert.match(route, /complimentaryAccessEnd\(body\)/);
  assert.match(independentFounder, /complimentaryAccessEnd\(body\)/);
  assert.match(independentFounder, /e\.complimentary_end<=now\(\).*THEN 'Free'/s);
  assert.match(independentIdentity, /e\.complimentary_end<=now\(\).*THEN 'Free'/s);
  assert.match(independentIdentity, /THEN 'expired'/);
  assert.match(route, /complimentaryEnd: row\.complimentary_end \|\| null/);
});
