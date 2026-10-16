// Complete user scripts, not expected assistant prose. Each answer is chosen for
// the actual controller objective, so every run reaches an ending or explicit exit.
const trustee = "I'm Marcus Warry, a trustee of Interim Spaces. My email is marcus.warry@example.invalid.";
const person = (name, work) => `I'm ${name}, ${work}. My email is ${name.toLowerCase().replaceAll(' ', '.')}@example.invalid.`;
export const socialJourneys = [
  { id: 'C01', opening: trustee, responsibility: 'Finance.', discovery: 'My pal told me.', concern: 'Frogs.', reflection: 'Actual frogs in the pond next door. The charity finances are fine, thankfully.', expect: 'frogs' },
  { id: 'C02', opening: person('Helen Price', 'CEO of the charity Interim Spaces'), responsibility: 'Keeping our services going while we try to grow our team.', discovery: 'A fellow chief executive sent me the link.', concern: 'Running out of money.', reflection: 'Our grants run out in March, so we need a clearer view of what services we can sustain.', workReflection: 'Recruitment has to wait until we know whether the next grant is coming through.', expect: 'serious' },
  { id: 'C03', opening: person('Priya Shah', 'finance director at the charity Brainstrust'), charity: 'Brainstrust', responsibility: 'I lead budgeting and prepare the year-end accounts.', discovery: 'An ICAEW webinar.', concern: 'Our next audit.' },
  { id: 'C04', opening: person('Sarah Jones', 'a chartered accountant at Burton Sweet working with about 30 charities, including Brainstrust') + ' They are all worried about the new reporting requirements.', charity: 'Brainstrust', responsibility: 'Accounts preparation and trustee training.', discovery: 'LinkedIn.', concern: 'Getting thirty clients ready at once.' },
  { id: 'C05', opening: person('Owen Reed', 'an accountant at Cedar Advisory with one charity client, Interim Spaces'), responsibility: 'I prepare their annual accounts.', discovery: 'A colleague recommended you.', concern: 'Deadlines.' },
  { id: 'C06', opening: person('Nadia Cole', 'an auditor at Cedar Advisory; I audit Brainstrust'), charity: 'Brainstrust', responsibility: 'Audit planning and reviewing charity disclosures.', discovery: 'I searched for charity reporting guidance.', concern: 'Whether we have enough evidence for the disclosures.' },
  { id: 'C07', opening: person('Ben Shaw', 'an independent professional adviser to Interim Spaces'), responsibility: 'I help boards make decisions about strategy.', discovery: 'Someone mentioned you at a conference.', concern: 'My children.', reflection: 'Literally, a toddler who is not a fan of sleeping.' },
  { id: 'C08', opening: person('Lara West', 'a new trustee at Interim Spaces'), responsibility: "I'm very new to charity reporting and still learning what the board needs from me.", discovery: 'Our treasurer pointed me here.', concern: 'Knowing whether I have missed something obvious.' },
  { id: 'C09', opening: person('Dan Hart', 'a finance trustee at Interim Spaces') + " I handle budgets and found you on LinkedIn. I'm worried our reserves won't cover the winter.", concern: 'Our reserves.' },
  { id: 'C10', opening: person('Asha Patel', 'a trustee at Interim Spaces') + " I oversee governance, a friend sent me your website, and I'm struggling to get reliable impact data.", concern: 'Impact data.' },
  { id: 'C11', opening: "Hello, I'm David.", registration: "My full name is David Evans. I'm a trustee at Interim Spaces and my email is david.evans@example.invalid.", responsibility: 'Finance.', discovery: 'Dunno.', concern: 'Nothing, actually.' },
  { id: 'C12', opening: person('Alex Rowan', 'an accountant at Cedar Advisory working with Interim Spaces'), correction: "Actually, I meant auditor, not accountant. I'm still at Cedar Advisory.", responsibility: 'Charity audits.', discovery: 'A colleague.', concern: 'Review deadlines.' },
  { id: 'C13', opening: 'My name is Marcus Worrey, and I used to work on a charity client called The Blue Cross, or Blue Cross, I think it was. My email is marcus.worrey@gmail.com.', edit: {name:'Marcus Warry'}, resume: true, registration: "I'm now an independent consultant, advising charity boards.", charity:'Blue Cross', discovery:'LinkedIn.', concern:'Helping boards make sense of their impact.', reflection:'They collect activity numbers, but struggle to decide which outcomes really matter.' },
  { id: 'C14', mentioned:['Interim Spaces','Brainstrust','Blue Cross'], opening: person('Tom Lane', 'an accountant at Cedar Advisory working with Interim Spaces, Brainstrust and Blue Cross'), charity:'Brainstrust', responsibility:'Accounts and advice for all three.', discovery:'A client sent me the link.', concern:'Getting good information from clients on time.' },
  { id: 'C15', opening: trustee, responsibility:'Finance.', discovery:'A friend recommended you over a pint.', concern:'The spreadsheet has developed a personality and refuses to cooperate.', reflection:'Mostly a joke, but reconciling three different sets of figures really is a pain.' },
  { id: 'C16', opening: person('Ruth Bell', 'a trustee at Interim Spaces'), responsibility:'Finance and fundraising.', discovery:'Through our charity network.', concern:"I'd rather not say.", expect:'decline' },
  { id: 'C17', opening: person('Sam Green', 'a trustee at Interim Spaces'), responsibility:'Finance.', discovery:'My pal told me.', concern:"That's a strange question.", expect:'question' },
  { id: 'C18', opening: person('Eva Fox', 'a trustee at Interim Spaces'), responsibility:'Finance.', discovery:'A search engine.', concern:'Nothing, actually.', expect:'no-concern' },
  { id: 'C19', opening: trustee, responsibility:"I'm in a hurry. Can I just get into the platform now?", early:true },
  { id: 'C20', opening: person('Jon King', 'a trustee at Interim Spaces'), responsibility:'I oversee governance. Please skip the optional questions and let me continue.', early:true },
  { id: 'C21', opening: person('Maya Wood', 'a trustee at Interim Spaces'), responsibility:'Finance. Does this replace our accountant?', clarification:'Understood. I oversee budgets and cash flow.', discovery:'A fellow trustee.', concern:'Keeping our reporting manageable.' },
  { id: 'C22', opening: trustee, reminder:'I already told you Interim Spaces.', responsibility:'Finance.', discovery:'My pal told me.', concern:'Deadlines.' },
  { id: 'C23', opening: person('Gareth Hill', 'a trustee at Interim Spaces'), changeCharity:'Actually, let’s use Brainstrust instead.', charity:'Brainstrust', responsibility:'Financial oversight.', discovery:'A friend sent a link.', concern:'Knowing our reports are accurate.' },
  { id: 'C24', opening: person('Leah Stone', 'a trustee at Interim Spaces'), responsibility:'I look after the accounts, although I used to run fundraising at Blue Cross.', discovery:'A former colleague.', concern:'Frogs. We run a wetland project and disease is wiping out the local population.', reflection:'We need to understand the disease and explain the conservation work to our funders, without pretending we have answers yet.', expect:'literal' },
  { id: 'C25', opening: 'I’m worried our charity may have to close. I’m Kelly.', registration:'My full name is Kelly White. My email is kelly.white@example.invalid. I’m the CEO of Interim Spaces.', responsibility:'I lead the team and funding applications.', discovery:'Our finance adviser sent me here.', concern:'Having to close.' },
  { id: 'C26', opening: person('Theo Wells', 'a trustee at Interim Spaces'), edit:{email:'theo.corrected@example.invalid'}, resume:true, responsibility:'Budgets. Also, can I use this on my phone?', clarification:'Good to know. I handle the budgets.', discovery:'An email from another trustee.', concern:'My ability to persuade people to send their figures before the deadline.' },
];

// Replies to an optional, model-chosen professional follow-up. These are synthetic
// persona facts, not expected assistant language or model mocks.
const additional = {
 C03:'The audit team needs evidence for our disclosures, and I want to get that ready earlier.',
 C04:'The main difficulty is getting usable information back from all the charities on time.',
 C05:'Our year-end timetable is tight and I am the only person preparing the accounts.',
 C06:'It is the connection between reported outcomes and the underlying evidence.',
 C08:'I would like to know which questions a new trustee should be asking the finance team.',
 C09:'The budget shows just four months of unrestricted reserves.',
 C10:'We have lots of activity counts but no consistent outcome measures.',
 C11:'There is nothing particular I need to discuss right now.',
 C12:'The review dates bunch together and the evidence often arrives late.',
 C14:'They all use different systems, so we spend ages reconciling information.',
 C18:'Work is going well and I do not have a particular worry to discuss.',
 C21:'We need our reporting to help the board understand what is happening, without too much extra admin.',
 C22:'It is having several reporting dates land in the same week.',
 C23:'We want to be clear about what we know and where there are gaps in the figures.',
 C25:'One major grant is ending and we have not secured a replacement.',
 C26:'People send different formats and some of it arrives after the board papers are due.',
};
for (const j of socialJourneys) {
 j.reflection ||= additional[j.id] || 'It is mainly about giving the board useful information without adding unnecessary work.';
 j.workReflection ||= 'I spend much of my time helping the board understand the figures and agree what to do next.';
}
