import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
};

export default function TermsPage() {
  return (
    <article
      style={{
        ['--link-color' as string]: '#1E3461',
        ['--link-hover' as string]: '#16284D',
      }}
      className="[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1.5 [&_li]:leading-relaxed [&_p]:leading-relaxed [&_strong]:font-semibold [&_a]:underline [&_a]:underline-offset-2"
    >
      {/* Header */}
      <div className="not-prose mb-12">
        <div
          className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-5"
          style={{
            background: '#FEF3C7',
            border: '1px solid #C4882A40',
            color: '#C4882A',
          }}
        >
          Legal Document
        </div>
        <h1
          className="mb-3"
          style={{
            fontSize: '40px',
            fontWeight: 800,
            color: '#0A0D14',
            letterSpacing: '-0.02em',
            lineHeight: 1.15,
          }}
        >
          Terms of Service
        </h1>
        <p className="text-sm" style={{ color: '#6B7280' }}>
          Effective date: 1 January 2025 · Last updated: 26 March 2025
        </p>
      </div>

      <p className="mb-8" style={{ fontSize: '15px', color: '#374151', lineHeight: 1.7 }}>
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
          <a href="mailto:support@arivarangam.com" style={{ color: '#1E3461' }}>
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
          <li style={{ color: '#374151' }}>
            <strong style={{ color: '#0A0D14' }}>Free credits:</strong> New users receive 100 complimentary credits upon account
            creation. These credits do not expire but may not be transferred or redeemed for cash.
          </li>
          <li style={{ color: '#374151' }}>
            <strong style={{ color: '#0A0D14' }}>Paid credits:</strong> Credits purchased via credit packs are valid indefinitely and
            do not expire. Credits are deducted when a task is completed. If a task fails, credits are
            either not deducted or refunded to your balance.
          </li>
          <li style={{ color: '#374151' }}>
            <strong style={{ color: '#0A0D14' }}>Refund policy:</strong> Unused credit packs (where no credits have been consumed)
            are eligible for a full refund within <strong style={{ color: '#0A0D14' }}>7 days</strong> of purchase. Once any credits
            from a pack have been used, the pack is non-refundable. We do not offer partial refunds on
            partially used credit balances.
          </li>
          <li style={{ color: '#374151' }}>
            <strong style={{ color: '#0A0D14' }}>Credit transfers:</strong> Credits cannot be transferred between accounts under any
            circumstances.
          </li>
          <li style={{ color: '#374151' }}>
            <strong style={{ color: '#0A0D14' }}>Pricing:</strong> We reserve the right to change credit pricing at any time.
            Pre-purchased credits will always be honoured at the rate they were purchased.
          </li>
        </ul>
      </Section>

      <Section title="4. Acceptable Use">
        <p>You agree <strong style={{ color: '#0A0D14' }}>not</strong> to use the Platform to:</p>
        <ul>
          <li style={{ color: '#374151' }}>Generate, distribute or facilitate illegal content of any kind.</li>
          <li style={{ color: '#374151' }}>Create content that infringes third-party intellectual property rights.</li>
          <li style={{ color: '#374151' }}>Produce harmful, abusive, defamatory, obscene or harassing content.</li>
          <li style={{ color: '#374151' }}>Attempt to generate malware, exploit code, or other malicious software.</li>
          <li style={{ color: '#374151' }}>
            Reverse-engineer, scrape, or abuse the Platform&apos;s APIs beyond your personal
            authorised usage.
          </li>
          <li style={{ color: '#374151' }}>
            Resell or sublicense access to the Platform without our express written consent.
          </li>
          <li style={{ color: '#374151' }}>Circumvent rate limits, access controls, or any security measures.</li>
          <li style={{ color: '#374151' }}>
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
          <li style={{ color: '#374151' }}>Violate these Terms or our Acceptable Use Policy.</li>
          <li style={{ color: '#374151' }}>Engage in fraud, chargebacks, or payment disputes made in bad faith.</li>
          <li style={{ color: '#374151' }}>Attempt to harm other users or the Platform infrastructure.</li>
          <li style={{ color: '#374151' }}>Remain inactive for more than 24 months (you will be notified first).</li>
        </ul>
        <p>
          You may terminate your account at any time by contacting{' '}
          <a href="mailto:support@arivarangam.com" style={{ color: '#1E3461' }}>
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
          These Terms are governed by the laws of <strong style={{ color: '#0A0D14' }}>India</strong>, without regard to conflict
          of law principles. Any disputes shall be subject to the exclusive jurisdiction of courts
          in Chennai, Tamil Nadu, India.
        </p>
        <p>
          For minor disputes, we encourage you to first contact us at{' '}
          <a href="mailto:legal@arivarangam.com" style={{ color: '#1E3461' }}>
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
          <a href="mailto:legal@arivarangam.com" style={{ color: '#1E3461' }}>
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
      <h2
        className="mb-3 pb-2"
        style={{
          fontSize: '18px',
          fontWeight: 700,
          color: '#0A0D14',
          borderBottom: '1px solid #E8E5DF',
        }}
      >
        {title}
      </h2>
      <div className="space-y-3" style={{ color: '#374151', lineHeight: 1.7, fontSize: '15px' }}>
        {children}
      </div>
    </section>
  );
}
