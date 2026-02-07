import { Container } from '@/components/ui/Container';

export function TrustSection() {
    const logos = ['VOGUE', 'BAZAAR', 'FORBES', 'BRIDES', 'PHILLY MAG'];

    return (
        <section className="py-12 border-y border-gray-100">
            <Container>
                <div className="flex flex-col items-center">
                    <div className="flex items-center space-x-1 mb-8">
                        {[...Array(5)].map((_, i) => (
                            <span key={i} className="text-secondary text-lg">★</span>
                        ))}
                        <span className="ml-4 text-xs font-bold uppercase tracking-widest text-primary">
                            4.9/5 from 800+ Clients
                        </span>
                    </div>

                    <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-30 grayscale hover:grayscale-0 transition-all duration-500">
                        {logos.map((logo) => (
                            <span key={logo} className="text-xl md:text-2xl font-bold tracking-[0.3em] font-heading">{logo}</span>
                        ))}
                    </div>
                </div>
            </Container>
        </section>
    );
}
