import { Container } from '@/components/ui/Container';

export default function PrivacyPage() {
    return (
        <div className="pt-40 pb-24 bg-background">
            <Container className="max-w-3xl">
                <h1 className="text-4xl md:text-5xl font-heading mb-12 text-foreground">Privacy Policy</h1>
                <div className="prose prose-sm max-w-none space-y-12">
                    <section>
                        <h2 className="text-xl font-bold text-secondary mb-4 uppercase tracking-[0.2em]">Introduction</h2>
                        <p className="text-foreground/80 leading-relaxed">At Kusturiss Jewelers, we respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our website.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-secondary mb-4 uppercase tracking-[0.2em]">The Data We Collect</h2>
                        <p className="text-foreground/80 leading-relaxed">Personal data, or personal information, means any information about an individual from which that person can be identified. We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:</p>
                        <ul className="list-disc pl-5 mt-4 space-y-4 text-foreground/70 italic">
                            <li><strong className="text-foreground not-italic uppercase tracking-tighter mr-2">Identity Data:</strong> includes first name, last name, username or similar identifier.</li>
                            <li><strong className="text-foreground not-italic uppercase tracking-tighter mr-2">Contact Data:</strong> includes billing address, delivery address, email address and telephone numbers.</li>
                            <li><strong className="text-foreground not-italic uppercase tracking-tighter mr-2">Financial Data:</strong> includes bank account and payment card details.</li>
                            <li><strong className="text-foreground not-italic uppercase tracking-tighter mr-2">Transaction Data:</strong> includes details about payments to and from you and other details of products and services you have purchased from us.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-secondary mb-4 uppercase tracking-[0.2em]">How We Use Your Data</h2>
                        <p className="text-foreground/80 leading-relaxed">We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:</p>
                        <ul className="list-disc pl-5 mt-4 space-y-4 text-foreground/70 italic">
                            <li>Where we need to perform the contract we are about to enter into or have entered into with you.</li>
                            <li>Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.</li>
                            <li>Where we need to comply with a legal or regulatory obligation.</li>
                        </ul>
                    </section>
                </div>
            </Container>
        </div>
    );
}
