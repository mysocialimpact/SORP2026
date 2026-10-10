import { Button } from "@/components/ui";
export default function NotFound() {
  return (
    <main id="main" className="shell not-found">
      <p className="eyebrow">A SMALL DETOUR</p>
      <h1>Let’s find your way back.</h1>
      <p>That page could not be found. Your next chapter starts here.</p>
      <Button href="/">Back to the homepage</Button>
    </main>
  );
}
