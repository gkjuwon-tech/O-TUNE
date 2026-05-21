import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { PageHeader } from "@/components/PageHeader";
import { Pricing } from "@/components/Pricing";
import { FAQ } from "@/components/FAQ";

export const metadata = { title: "Pricing — O'Tune" };

export default function PricingPage() {
  return (
    <>
      <Nav />
      <main>
        <PageHeader
          kicker="Pricing"
          title="One number on one PDF."
          sub="We don't bill per token, per seat, or per anything. Fixed-quote engagements, billed in two halves — half on start, half when the finished model earns it."
        />
        <Pricing />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
