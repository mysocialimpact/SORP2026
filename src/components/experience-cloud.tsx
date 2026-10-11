"use client";

import type { CSSProperties } from "react";

const organisations = [
  "ActionAid", "STOP THE TRAFFIK", "Great Ormond Street Hospital", "Blue Cross", "Farm Africa",
  "CARE International", "Friends of the Earth", "Greenpeace", "Interim Spaces",
  "Traidcraft", "Forum for the Future", "RSPB", "RSPCA", "National Asthma Campaign",
  "St John Ambulance", "Family Planning Association", "International Planned Parenthood Federation",
  "Médecins Sans Frontières", "Brook", "National AIDS Trust", "Stroke Association",
  "Royal National Institute for Deaf People", "British Deaf Association", "National Deaf Children’s Society",
  "YMCA", "Ideas Foundation", "Campaign for Nuclear Disarmament", "Comic Relief", "Alcohol Concern",
  "Dyslexia Institute", "Dyslexia Action", "Xtraordinary People", "Action for ME",
  "Royal Hospital for Neuro-disability", "National Blood Service", "Age Concern", "Age UK",
  "Action for Kids", "Sing London", "GASP", "Joint Council for the Welfare of Immigrants",
  "London Community Arts", "Crouch End Festival", "South Asian Arts Festival", "CIDA",
  "Hackney Council", "Westminster Council", "The Learning Trust", "Greenwich", "Docklands Light Railway",
  "National Union of Students", "Haringey Council", "Diageo", "Starbucks", "Sainsbury’s",
  "Brewers Decorating Centres", "Responsible drinking programmes", "Community engagement programmes",
  "AgriEvolve", "Ashima", "Tonight Change", "The Wild Ones Kampala",
];

export function ExperienceCloud() {
  return (
    <section className="experience-cloud" aria-labelledby="experience-title">
      <div className="gateway-width experience-cloud-head">
        <p className="gateway-kicker">Collective experience · charities · communities · campaigns</p>
        <h2 id="experience-title">Experience across our team</h2>
        <p>Organisation names reflect work and experience across our team; they are not presented as endorsements of this platform.</p>
      </div>
      <div className="experience-cloud-stage" aria-label={`Experience includes ${organisations.join(", ")}`}>
        <div className="experience-cloud-track">
          {organisations.map((name, index) => (
            <span
              key={name}
              className={`experience-name experience-name-${(index % 7) + 1}`}
              style={{ "--experience-delay": `${index * -1.7}s` } as CSSProperties}
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

