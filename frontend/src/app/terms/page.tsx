import { Container } from '@/components/ui/Container';

export default function TermsPage() {
    return (
        <div className="pt-40 pb-24 bg-background">
            <Container className="max-w-3xl">
                <h1 className="text-4xl md:text-5xl font-heading mb-12 text-foreground">Terms of Service</h1>
                <div className="prose prose-sm max-w-none space-y-12">
                    <section>
                        <h2 className="text-xl font-bold text-secondary mb-4 uppercase tracking-[0.2em]">Agreement to Terms</h2>
                        <p className="text-foreground/80 leading-relaxed">By accessing our website at kusturiss.com, you are agreeing to be bound by these terms of service, all applicable laws and regulations, and agree that you are responsible for compliance with any applicable local laws.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-secondary mb-4 uppercase tracking-[0.2em]">Use License</h2>
                        <p className="text-foreground/80 leading-relaxed">Permission is granted to temporarily download one copy of the materials (information or software) on Kusturiss Jewelers' website for personal, non-commercial transitory viewing only.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-secondary mb-4 uppercase tracking-[0.2em]">Disclaimer</h2>
                        <p className="text-foreground/80 leading-relaxed">The materials on Kusturiss Jewelers' website are provided on an 'as is' basis. Kusturiss Jewelers makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-secondary mb-4 uppercase tracking-[0.2em]">Accuracy of Materials</h2>
                        <p className="text-foreground/80 leading-relaxed">The materials appearing on Kusturiss Jewelers' website could include technical, typographical, or photographic errors. Kusturiss Jewelers does not warrant that any of the materials on its website are accurate, complete or current.</p>
                    </section>
                </div>
            </Container>
        </div>
    );
}
