import type { Firm } from "@/lib/accountants";

export function ExternalRecognition({ firm }: { firm: Firm }) {
  const recognitions = firm.externalRecognitions?.filter(item => item.verified && item.sourceUrl.startsWith("https://")) || [];
  if (!recognitions.length) return null;

  return <div className="directory-external-recognitions" aria-label="Independent survey recognition">
    {recognitions.map(item => <a key={`${item.publisher}-${item.survey}-${item.year}-${item.category}`} href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="directory-external-recognition">
      <span>{item.publisher} {item.survey} {item.year}</span>
      <strong>{item.result} — {item.category}</strong>
      <span className="sr-only">View original source (opens in a new tab)</span>
    </a>)}
  </div>;
}
