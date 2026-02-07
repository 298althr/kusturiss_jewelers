import { Hero } from "@/components/sections/Hero";
import { FeaturedProducts } from "@/components/sections/FeaturedProducts";
import { TrustSection } from "@/components/sections/TrustSection";
import { Container } from "@/components/ui/Container";
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <>
      <Hero />
      <TrustSection />
      <FeaturedProducts />

      {/* Brand Story Section */}
      <section className="py-24 overflow-hidden">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="relative aspect-square">
              <div className="absolute -inset-4 border border-secondary/30 z-0" />
              <Image
                src="https://images.unsplash.com/photo-1573408302355-4e0b7cb39697?auto=format&fit=crop&q=80&w=1000"
                alt="Jewelry Craftsmanship"
                fill
                className="object-cover z-10"
              />
            </div>
            <div className="space-y-8">
              <span className="text-secondary font-bold uppercase tracking-[0.3em] text-xs block">Our Heritage</span>
              <h2 className="text-5xl font-heading text-[#8f8f8f] leading-tight">A Century of <br /><span className="italic">Excellence</span> on Sansom Street.</h2>
              <p className="text-gray-600 leading-relaxed text-lg">
                For over ten years, Kusturiss Jewelers has been a cornerstone of Philadelphia's historic Jewelers' Row. We don't just sell jewelry; we craft legacies. Every diamond is hand-selected, and every setting is designed with the precision of a master artisan.
              </p>
              <div className="grid grid-cols-2 gap-12 pt-6">
                <div>
                  <h4 className="text-3xl font-heading text-secondary mb-2">Bespoke</h4>
                  <p className="text-xs text-gray-400 uppercase tracking-widest leading-loose">One-of-a-kind designs for unique stories.</p>
                </div>
                <div>
                  <h4 className="text-3xl font-heading text-secondary mb-2">Quality</h4>
                  <p className="text-xs text-gray-400 uppercase tracking-widest leading-loose">Highest grade diamonds and metals.</p>
                </div>
              </div>
              <Link
                href="/about"
                className="inline-block pt-8 text-xs font-bold uppercase tracking-widest border-b border-primary hover:text-secondary hover:border-secondary transition-all pb-1"
              >
                Discover Our Story
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-primary text-white text-center">
        <Container>
          <div className="max-w-2xl mx-auto space-y-8">
            <h2 className="text-4xl md:text-5xl font-heading leading-tight">Begin Your <br /><span className="italic text-secondary">Custom Journey</span> Today.</h2>
            <p className="text-gray-400 text-sm tracking-wide leading-relaxed">
              Schedule a private consultation with our master jewelers and transform your vision into an eternal masterpiece.
            </p>
            <Link
              href="/contact"
              className="inline-block bg-secondary text-primary px-12 py-5 text-xs font-bold uppercase tracking-widest hover:bg-white transition-all transform hover:-translate-y-1"
            >
              Book an Appointment
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}
