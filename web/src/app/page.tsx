import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { Pipeline } from "@/components/Pipeline";
import { Features } from "@/components/Features";
import { Pricing } from "@/components/Pricing";
import { Security } from "@/components/Security";
import { FAQ } from "@/components/FAQ";
import { CTA } from "@/components/CTA";
import { Footer } from "@/components/Footer";

export default function HomePage() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Pipeline />
        <Features />
        <Pricing />
        <Security />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
