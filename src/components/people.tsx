import Image from "next/image";
export function People() {
  return (
    <div className="people-grid">
      <article>
        <Image
          src="/images/marcus-warry.webp"
          alt="Marcus Warry, co-founder of My Social Impact"
          width={480}
          height={520}
        />
        <h3>Marcus Warry ACA</h3>
        <p className="person-role">Co-founder · Social Impact & Strategy</p>
        <p>
          Chartered Accountant and social impact consultant, connecting
          financial and strategic thinking with practical impact reporting.
        </p>
        <a href="https://www.linkedin.com/in/marcuswarry/">
          Marcus on LinkedIn ↗
        </a>
      </article>
      <article>
        <Image
          src="/images/chris-arnold.webp"
          alt="Dr Chris Arnold, co-founder of My Social Impact"
          width={480}
          height={520}
        />
        <h3>Dr Chris Arnold</h3>
        <p className="person-role">
          Co-founder · Brand, Purpose & Ethical Marketing
        </p>
        <p>
          Creative strategist, author and ethical marketing specialist, helping
          organisations communicate purpose credibly and build trust.
        </p>
        <a href="https://www.linkedin.com/in/dr-chris-arnold-2689004/">
          Chris on LinkedIn ↗
        </a>
      </article>
    </div>
  );
}
