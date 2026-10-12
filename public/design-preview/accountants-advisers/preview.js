// Local visual prototype only: no APIs, accounts, analytics or writes.
const saved = new Set();
const dialog = document.querySelector('#preview-dialog');
const rows = [...document.querySelectorAll('.firm-list article')];
const query = document.querySelector('#query');
function showDialog(title, html) {
  document.querySelector('#dialog-title').textContent = title;
  document.querySelector('#dialog-content').innerHTML = html;
  dialog.showModal();
}
document.querySelector('.dialog-close').onclick = () => dialog.close();
document.querySelectorAll('.save').forEach(button => button.addEventListener('click', () => {
  const name = button.dataset.firm;
  saved.has(name) ? saved.delete(name) : saved.add(name);
  document.querySelectorAll('.save').forEach(b => {
    const active = saved.has(b.dataset.firm);
    b.classList.toggle('saved', active);
    b.textContent = active ? 'Saved ✓' : 'Save to shortlist ＋';
    b.setAttribute('aria-pressed', String(active));
    b.setAttribute('aria-label', `${active ? 'Remove' : 'Save'} ${b.dataset.firm}${active ? ' from' : ' to'} shortlist`);
  });
  document.querySelector('#shortlist-count').textContent = saved.size;
  document.querySelector('#shortlist').hidden = !saved.size;
  document.querySelector('#shortlist-hero-count').textContent = saved.size;
}));
document.querySelector('#shortlist-open').onclick = () => {
  const content = [...saved].map(name => {
    const row = rows.find(r => r.querySelector('strong').textContent === name);
    return `<div class="saved-row"><strong>${name}</strong>${row?.querySelector('small').textContent || ''}</div>`;
  }).join('');
  showDialog('Your next conversations.', `${content || '<p>Use “Save to shortlist” on any firm to start your list.</p>'}<p>Saved in this preview only. No account needed to try it.</p>`);
};
document.querySelector('#shortlist-hero').onclick = () => document.querySelector('#shortlist-open').click();
function filter(value, letter) {
  const q = value.toLowerCase().replace(/\s/g, '');
  let visible = 0;
  rows.forEach(row => {
    row.hidden = !((row.dataset.search + row.textContent).toLowerCase().replace(/\s/g, '').includes(q) && (!letter || row.querySelector('strong').textContent.startsWith(letter)));
    if (!row.hidden) visible++;
  });
  document.querySelector('#result-count').textContent = `${visible} sample ${visible === 1 ? 'firm' : 'firms'} · preview data only`;
  document.querySelector('.no-results').hidden = visible > 0;
  document.querySelectorAll('[data-map]').forEach(pin => {
    const matching = rows.filter(row => !row.hidden && (pin.classList.contains('london') ? /london/i.test(row.dataset.search) : pin.dataset.map === row.querySelector('strong').textContent));
    pin.hidden = !matching.length;
    pin.querySelector('span').textContent = matching.length;
  });
  document.querySelector('#map-card').hidden = true;
}
document.querySelector('#search-form').onsubmit = event => {
  event.preventDefault();
  document.querySelectorAll('.alphabet button').forEach(button => button.classList.toggle('active', button.textContent === 'All'));
  filter(query.value); document.querySelector('#directory').scrollIntoView();
};
document.querySelectorAll('.alphabet button').forEach(button => button.onclick = () => {
  if (button.textContent.includes('More')) return showDialog('The complete A–Z.', '<p>The approved build will use the full existing directory. This visual prototype contains six sample firms.</p>');
  document.querySelectorAll('.alphabet button').forEach(b => b.classList.toggle('active', b === button));
  filter(query.value, button.textContent === 'All' ? null : button.textContent);
});
function selectFirm(name) {
  const row = rows.find(r => r.querySelector('strong').textContent === name && !r.hidden);
  if (!row) return;
  rows.forEach(r => r.classList.toggle('selected', r === row));
  const card = document.querySelector('#map-card');
  card.hidden = false;
  card.innerHTML = `<small>Selected firm</small><strong>${name}</strong><span>${row.querySelector('small').textContent}</span><a href="#">About this firm ↗</a>`;
  card.querySelector('a').onclick = e => { e.preventDefault(); profile(name); };
}
document.querySelectorAll('[data-map]').forEach(button => {
  button.setAttribute('aria-label', `Select ${button.dataset.map}`);
  button.onclick = () => selectFirm(button.classList.contains('london') ? rows.find(r => !r.hidden && /london/i.test(r.dataset.search))?.querySelector('strong').textContent : button.dataset.map);
});
rows.forEach(row => {
  const target = row.querySelector('div');
  target.tabIndex = 0; target.setAttribute('role', 'button');
  target.setAttribute('aria-label', `Select ${row.querySelector('strong').textContent}`);
  target.onclick = () => selectFirm(row.querySelector('strong').textContent);
  target.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); target.click(); } };
});
document.querySelectorAll('.view-toggle button').forEach(button => button.onclick = () => {
  const split = button.dataset.view === 'split';
  const shell = document.querySelector('#directory-shell');
  shell.classList.toggle('list-only', !split); shell.classList.toggle('mobile-map', split);
  document.querySelectorAll('.view-toggle button').forEach(b => { b.classList.toggle('active', b === button); b.setAttribute('aria-pressed', String(b === button)); });
});
const websites = {'Burton Sweet':'https://www.burton-sweet.co.uk/','ECOVIS Wingrave Yeats':'https://www.ecovis.co.uk/','Moore Kingston Smith':'https://mooreks.co.uk/','Forvis Mazars':'https://www.forvismazars.com/uk/en','Lanham & Francis':'https://www.lanhamandfrancis.co.uk/','Shorts':'https://www.shorts.uk.com/'};
function profile(name) {
  const feature = [...document.querySelectorAll('.feature-card')].find(c => c.querySelector('.save').dataset.firm === name);
  const copy = feature ? [...feature.querySelectorAll('p')].map(p => `<p>${p.textContent}</p>`).join('') : '';
  showDialog(name, `${copy}<p><a href="${websites[name]}" target="_blank" rel="noopener">Visit the firm's website ↗</a></p><p>Sample profile presentation. Featured placement and listing claims are not live.</p>`);
}
document.querySelectorAll('.feature-card a').forEach(a => { a.href = '#'; a.onclick = e => { e.preventDefault(); profile(a.closest('.feature-card').querySelector('.save').dataset.firm); }; });
const notes = {
  offer: ['Be in the right company.', '<p><strong>Proposed founding membership: £39/month.</strong></p><p>Claim your listing, tell a richer story and gain featured visibility among charities seeking help.</p><p>Professional-tool access is planned; the exact package will be confirmed before launch. This is not a subscription checkout.</p>'],
  checks: ['A starting point. Not an endorsement.', '<p>We start with firms listed in the ICAEW directory. Marcus Warry is an ICAEW Chartered Accountant.</p><p>Evidence varies by listing. Membership and services must be checked directly before appointing a firm. This is an independent directory, not an ICAEW endorsement.</p><p>The official ICAEW logo is shown from ICAEW’s website for this design review. Publication permission for this independent directory must be confirmed before launch.</p>'],
  directory: ['The full directory stays intact.', '<p>All 111 existing records remain unchanged. This design preview demonstrates six representative profiles; full data wiring follows design approval.</p>'],
  map: ['A companion, not the whole page.', '<p>Select a sample pin to highlight its firm. On mobile, Map + list opens a compact map above the results.</p><p>This illustrative location treatment is not a live map or accurate geocoding. Provider integration follows design approval.</p>']
};
document.querySelectorAll('[data-dialog]').forEach(b => b.onclick = () => showDialog(...notes[b.dataset.dialog]));


selectFirm('Burton Sweet');

// Reuse the platform account endpoint for the header label; no new identity flow.
fetch('/api/readiness-account', { credentials: 'same-origin' }).then(response => response.ok ? response.json() : null).then(data => {
  if (data?.signedIn) { const account = document.querySelector('.account'); account.href = '/dashboard/'; account.textContent = 'My Dashboard ↗'; }
}).catch(() => {});
document.querySelectorAll('.save').forEach(button => {
  button.textContent = 'Save to shortlist ＋';
  button.setAttribute('aria-pressed', 'false');
  button.setAttribute('aria-label', 'Save ' + button.dataset.firm + ' to shortlist');
});
const initialSplit = matchMedia('(min-width: 901px)').matches;
document.querySelectorAll('.view-toggle button').forEach(button => { const active = (button.dataset.view === 'split') === initialSplit; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
const logo = document.querySelector('#icaew-logo');
function showLogoFallback() { logo.hidden = true; document.querySelector('#icaew-fallback').hidden = false; }
logo.addEventListener('error', showLogoFallback);
if (logo.complete && !logo.naturalWidth) showLogoFallback();
