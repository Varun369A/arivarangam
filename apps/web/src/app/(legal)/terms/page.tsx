import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
};

export default function TermsPage() {
  return (
    <article className="[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1.5 [&_li]:text-slate-600 [&_li]:leading-relaxed [&_p]:leading-relaxed [&_strong]:font-semibold [&_strong]:text-slate-700 [&_a]:text-indigo-600 [&_a:hover]:text-indigo-800 [&_h3]:font-semibold [&_h3]:text-slate-700">
      {/* Header */}
      <div className="not-prose mb-10">
        <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
          Legal
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-3">Terms of Service</h1>
        <p className="text-slate-500 text-sm">
          Effective date: 1 January 2025 · Last updated: 26 March 2025
        </p>
      </div>

      <p className="text-[15px] text-slate-600 leading-relaxed mb-8">
        These Terms of Service (&quot;Terms&quot;) govern your access to and use of the Arrivarangam platform
        (&quot;Platform&quot;, &quot;we&quot;, &quot;us&quot; or &quot;our&quot;). By creating an account or using the Platform you agree to
        be bound by these Terms. If you do not agree, please do not use the Platform.
      </p>

      <Section title="1. Service Description">
        <p>
          Arrivarangam is an AI-powered platform that enables users to run tasks including code generation,
          research, image generation, and voice synthesis. Tasks are executed by AI models selected by our
          orchestration system based on category and context. Results are delivered asynchronously and made
          available through the user dashboard.
        </p>
        <p>
          The Platform operates on a <strong>credit-based prepaid model</strong>. Users purchase credits
          and consume them when running tasks. There are no monthly subscription fees.
        </p>
      </Section>

      <Section title="2. Accounts">
        <p>
          You must be at least 13 years old (or the age of digital consent in your jurisdiction) to use the
          Platform. You are responsible for maintaining the confidentiality of your account credentials.
          You must notify us immediately at{' '}
          <a href="mailto:support@arivarangam.com" className="text-indigo-600 hover:text-indigo-800">
            support@arivarangam.com
          </a>{' '}
          of any unauthorised access to your account.
        </p>
        <p>
          Each user may maintain only one account. Creating multiple accounts to circumvent credit limits
          or free-credit policies is a violation of these Terms and may result in permanent suspension.
        </p>
      </Section>

      <Section title="3. Credit System">
        <ul>
          <li>
            <strong>Free credits:</strong> New users receive 100 complimentary credits upon account
            creation. These credits do not expire but may not be transferred or redeemed for cash.
          </li>
          <li>
            <strong>Paid credits:</strong> Credits purchased via credit packs are valid indefinitely and
            do not expire. Credits are deducted when a task is completed. If a task fails, credits are
            either not deducted or refunded to your balance.
          </li>
          <li>
            <strong>Refund policy:</strong> Unused credit packs (where no credits have been consumed)
            are eligible for a full refund within <strong>7 days</strong> of purchase. Once any credits
            from a pack have been used, the pack is non-refundable. We do not offer partial refunds on
            partially used credit balances.
          </li>
          <li>
            <strong>Credit transfers:</strong> Credits cannot be transferred between accounts under any
            circumstances.
          </li>
          <li>
            <strong>Pricing:</strong> We reserve the right to change credit pricing at any time.
            Pre-purchased credits will always be honoured at the rate they were purchased.
          </li>
        </ul>
      </Section>

      <Section title="4. Acceptable Use">
        <p>You agree <strong>not</strong> to use the Platform to:</p>
        <ul>
          <li>Generate, distribute or facilitate illegal content of any kind.</li>
          <li>Create content that infringes third-party intellectual property rights.</li>
          <li>Produce harmful, abusive, defamatory, obscene or harassing content.</li>
          <li>Attempt to generate malware, exploit code, or other malicious software.</li>
          <li>
            Reverse-engineer, scrape, or abuse the Platform&apos;s APIs beyond your personal
            authorised usage.
          </li>
          <li>
            Resell or sublicense access to the Platform without our express written consent.
          </li>
          <li>Circumvent rate limits, access controls, or any security measures.</li>
          <li>
            Engage in bulk automated usage that degrades service quality for other users.
          </li>
        </ul>
        <p>
          We monitor usage for compliance and reserve the right to terminate accounts that violate this
          policy without refund.
        </p>
      </Section>

      <Section title="5. AI-Generated Content Disclaimer">
        <p>
          The Platform uses third-party AI models (including but not limited to Claude by Anthropic,
          GPT-4o by OpenAI, Perplexity Sonar, and ElevenLabs). We do not guarantee the accuracy,
          completeness, fitness for purpose or legality of any AI-generated output.
        </p>
        <p>
          You are solely responsible for reviewing, validating, and any use you make of AI-generated
          content. We expressly disclaim all liability for outcomes arising from your reliance on
          AI-generated results.
        </p>
        <p>
          AI outputs may contain factual errors, hallucinations, or outdated information.
          Do not use AI-generated content for critical decisions (medical, legal, financial) without
          independent professional verification.
        </p>
      </Section>

      <Section title="6. Intellectual Property">
        <p>
          Subject to compliance with these Terms, you own the outputs generated by the Platform as a
          result of your prompts and credit usage. You grant us a limited licence to process your inputs
          and prompts solely to provide the service.
        </p>
        <p>
          The Platform itself — including its code, design, trademarks, and branding — is our
          intellectual property. Nothing in these Terms transfers any ownership of the Platform to you.
        </p>
      </Section>

      <Section title="7. Account Termination">
        <p>We may suspend or terminate your account at our sole discretion if you:</p>
        <ul>
          <li>Violate these Terms or our Acceptable Use Policy.</li>
          <li>Engage in fraud, chargebacks, or payment disputes made in bad faith.</li>
          <li>Attempt to harm other users or the Platform infrastructure.</li>
          <li>Remain inactive for more than 24 months (you will be notified first).</li>
        </ul>
        <p>
          You may terminate your account at any time by contacting{' '}
          <a href="mailto:support@arivarangam.com" className="text-indigo-600 hover:text-indigo-800">
            support@arivarangam.com
          </a>
          . Upon termination, unused credits are subject to the refund policy in Section 3.
        </p>
      </Section>

      <Section title="8. Limitation of Liability">
        <p>
          To the maximum extent permitted by applicable law, Arrivarangam and its officers, employees,
          and agents shall not be liable for any indirect, incidental, special, consequential, or
          punitive damages, or any loss of profits or data, arising from your use of or inability to
          use the Platform.
        </p>
        <p>
          Our total aggregate liability to you for any claims arising under or related to these Terms
          shall not exceed the amount you paid us in the twelve (12) months preceding the claim.
        </p>
      </Section>

      <Section title="9. Disclaimer of Warranties">
        <p>
          The Platform is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, either
          express or implied, including but not limited to implied warranties of merchantability,
          fitness for a particular purpose, or non-infringement.
        </p>
        <p>
          We do not warrant that the Platform will be uninterrupted, error-free, or free of viruses
          or other harmful components.
        </p>
      </Section>

      <Section title="10. Governing Law & Dispute Resolution">
        <p>
          These Terms are governed by the laws of <strong>India</strong>, without regard to conflict
          of law principles. Any disputes shall be subject to the exclusive jurisdiction of courts
          in Chennai, Tamil Nadu, India.
        </p>
        <p>
          For minor disputes, we encourage you to first contact us at{' '}
          <a href="mailto:legal@arivarangam.com" className="text-indigo-600 hover:text-indigo-800">
            legal@arivarangam.com
          </a>{' '}
          so we can resolve the matter amicably.
        </p>
      </Section>

      <Section title="11. Changes to Terms">
        <p>
          We may update these Terms from time to time. We will notify you of material changes via
          email or a prominent notice on the Platform at least 14 days before they take effect.
          Continued use of the Platform after the effective date constitutes acceptance of the
          revised Terms.
        </p>
      </Section>

      <Section title="12. Contact">
        <p>
          For questions about these Terms, please contact us at{' '}
          <a href="mailto:legal@arivarangam.com" className="text-indigo-600 hover:text-indigo-800">
            legal@arivarangam.com
          </a>
          .
        </p>
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-bold text-slate-800 mb-3 pb-2 border-b border-slate-100">{title}</h2>
      <div className="space-y-3 text-slate-600 leading-relaxed text-[15px]">{children}</div>
    </section>
  );
}
