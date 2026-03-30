import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
};

export default function PrivacyPage() {
  return (
    <article className="[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1.5 [&_li]:leading-relaxed [&_p]:leading-relaxed [&_strong]:font-semibold [&_a]:underline [&_a]:underline-offset-2">
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
          Privacy Policy
        </h1>
        <p className="text-sm" style={{ color: '#6B7280' }}>
          Effective date: 1 January 2025 · Last updated: 26 March 2025
        </p>
      </div>

      <p className="mb-8" style={{ fontSize: '15px', color: '#374151', lineHeight: 1.7 }}>
        Arivarangam (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is committed to protecting your privacy. This Privacy Policy
        explains how we collect, use, store, and share your personal information when you use our
        platform. By using Arivarangam, you agree to the practices described here.
      </p>

      <Section title="1. Information We Collect">
        <h3 className="font-semibold text-[15px] mt-2 mb-1" style={{ color: '#0A0D14' }}>a. Account Information</h3>
        <ul>
          <li style={{ color: '#374151' }}><strong style={{ color: '#0A0D14' }}>Name</strong> and <strong style={{ color: '#0A0D14' }}>email address</strong> — provided when you register.</li>
          <li style={{ color: '#374151' }}><strong style={{ color: '#0A0D14' }}>Password</strong> — stored as a bcrypt hash; never in plain text.</li>
          <li style={{ color: '#374151' }}><strong style={{ color: '#0A0D14' }}>Avatar</strong> — optional profile picture you upload.</li>
        </ul>

        <h3 className="font-semibold text-[15px] mt-4 mb-1" style={{ color: '#0A0D14' }}>b. Usage Information</h3>
        <ul>
          <li style={{ color: '#374151' }}>Tasks submitted (prompts, category, model used, timestamps).</li>
          <li style={{ color: '#374151' }}>Credit balance, transactions, and purchase history.</li>
          <li style={{ color: '#374151' }}>Session activity (login timestamps, IP addresses).</li>
          <li style={{ color: '#374151' }}>Device and browser metadata (user-agent, screen resolution) for security monitoring.</li>
        </ul>

        <h3 className="font-semibold text-[15px] mt-4 mb-1" style={{ color: '#0A0D14' }}>c. Payment Information</h3>
        <ul>
          <li style={{ color: '#374151' }}>
            We use <strong style={{ color: '#0A0D14' }}>Razorpay</strong> (PCI-DSS Level 1 compliant) to process payments.
            We do <strong style={{ color: '#0A0D14' }}>not</strong> store full card numbers or CVV codes. Razorpay provides us
            with a tokenised transaction reference, payment ID, and order details.
          </li>
          <li style={{ color: '#374151' }}>UPI ID or last 4 digits of card (stored by Razorpay, not us).</li>
        </ul>

        <h3 className="font-semibold text-[15px] mt-4 mb-1" style={{ color: '#0A0D14' }}>d. AI Prompts &amp; Outputs</h3>
        <ul>
          <li style={{ color: '#374151' }}>
            Prompts you submit to the Platform are sent to AI providers (Anthropic, OpenAI, Perplexity,
            ElevenLabs) to fulfil your task. These providers have their own privacy policies governing
            how they handle data.
          </li>
          <li style={{ color: '#374151' }}>Task outputs are stored on our servers and associated with your account.</li>
        </ul>
      </Section>

      <Section title="2. How We Use Your Information">
        <ul>
          <li style={{ color: '#374151' }}>To provide, operate, and improve the Platform.</li>
          <li style={{ color: '#374151' }}>To process payments and manage credit balances.</li>
          <li style={{ color: '#374151' }}>To send transactional emails (account verification, password reset, purchase receipts).</li>
          <li style={{ color: '#374151' }}>To detect and prevent fraud, abuse, and security threats.</li>
          <li style={{ color: '#374151' }}>To comply with legal obligations.</li>
          <li style={{ color: '#374151' }}>
            To send product updates and announcements (you may unsubscribe at any time via the
            link in each email).
          </li>
        </ul>
        <p>
          We do <strong style={{ color: '#0A0D14' }}>not</strong> use your personal data or prompts to train our AI models.
        </p>
      </Section>

      <Section title="3. Data Sharing">
        <p>
          We do <strong style={{ color: '#0A0D14' }}>not sell</strong> your personal data to third parties.
          We share data only as follows:
        </p>
        <ul>
          <li style={{ color: '#374151' }}>
            <strong style={{ color: '#0A0D14' }}>AI providers</strong> (Anthropic, OpenAI, Perplexity, ElevenLabs): prompts are
            sent to execute your tasks. Each provider&apos;s data handling is governed by their own
            privacy policy and API terms.
          </li>
          <li style={{ color: '#374151' }}>
            <strong style={{ color: '#0A0D14' }}>Razorpay</strong>: payment data is shared to process transactions. Razorpay&apos;s
            privacy policy applies to payment data.
          </li>
          <li style={{ color: '#374151' }}>
            <strong style={{ color: '#0A0D14' }}>Infrastructure providers</strong> (e.g., AWS, Redis hosting): data is stored
            on servers hosted by cloud providers under data processing agreements.
          </li>
          <li style={{ color: '#374151' }}>
            <strong style={{ color: '#0A0D14' }}>Legal requirements</strong>: we may disclose data when required by law, court
            order, or lawful government request.
          </li>
        </ul>
      </Section>

      <Section title="4. Cookies & Tracking">
        <p>We use the following cookies:</p>
        <ul>
          <li style={{ color: '#374151' }}>
            <strong style={{ color: '#0A0D14' }}>Authentication cookie</strong> (HttpOnly, Secure): maintains your session.
            Required for the Platform to function.
          </li>
          <li style={{ color: '#374151' }}>
            <strong style={{ color: '#0A0D14' }}>CSRF token</strong>: prevents cross-site request forgery attacks.
          </li>
        </ul>
        <p>
          We do not use third-party advertising or tracking cookies. We do not serve ads.
        </p>
      </Section>

      <Section title="5. Data Retention">
        <ul>
          <li style={{ color: '#374151' }}>
            <strong style={{ color: '#0A0D14' }}>Account data</strong>: retained while your account is active and for 90 days
            after deletion.
          </li>
          <li style={{ color: '#374151' }}>
            <strong style={{ color: '#0A0D14' }}>Task data and outputs</strong>: retained for 12 months from task creation,
            after which they may be purged.
          </li>
          <li style={{ color: '#374151' }}>
            <strong style={{ color: '#0A0D14' }}>Payment records</strong>: retained for 7 years to comply with financial
            regulations.
          </li>
          <li style={{ color: '#374151' }}>
            <strong style={{ color: '#0A0D14' }}>Security logs</strong>: retained for 90 days.
          </li>
        </ul>
        <p>
          You may request earlier deletion of your data by contacting us (see Section 9).
          Some data must be retained for legal compliance even after account deletion.
        </p>
      </Section>

      <Section title="6. Data Security">
        <p>
          We take reasonable technical and organisational measures to protect your data:
        </p>
        <ul>
          <li style={{ color: '#374151' }}>HTTPS encryption in transit (TLS 1.2+).</li>
          <li style={{ color: '#374151' }}>Passwords hashed with bcrypt (cost factor 12).</li>
          <li style={{ color: '#374151' }}>Authentication tokens stored in HttpOnly, Secure cookies.</li>
          <li style={{ color: '#374151' }}>Access controls: only authorised personnel can access production data.</li>
          <li style={{ color: '#374151' }}>PCI-compliant payment processing via Razorpay.</li>
        </ul>
        <p>
          No system is perfectly secure. In the event of a data breach affecting your personal
          information, we will notify you as required by applicable law.
        </p>
      </Section>

      <Section title="7. Your Rights">
        <p>Subject to applicable law, you have the right to:</p>
        <ul>
          <li style={{ color: '#374151' }}><strong style={{ color: '#0A0D14' }}>Access</strong>: request a copy of the personal data we hold about you.</li>
          <li style={{ color: '#374151' }}><strong style={{ color: '#0A0D14' }}>Correction</strong>: update inaccurate or incomplete data via your account settings.</li>
          <li style={{ color: '#374151' }}><strong style={{ color: '#0A0D14' }}>Deletion</strong>: request deletion of your account and personal data.</li>
          <li style={{ color: '#374151' }}><strong style={{ color: '#0A0D14' }}>Portability</strong>: receive your task data in a machine-readable format.</li>
          <li style={{ color: '#374151' }}>
            <strong style={{ color: '#0A0D14' }}>Objection</strong>: object to processing of your data for direct marketing.
          </li>
          <li style={{ color: '#374151' }}>
            <strong style={{ color: '#0A0D14' }}>Withdraw consent</strong>: unsubscribe from marketing emails at any time.
          </li>
        </ul>
        <p>
          To exercise any of these rights, email{' '}
          <a href="mailto:legal@arivarangam.com" style={{ color: '#4F46E5' }}>
            legal@arivarangam.com
          </a>
          . We will respond within 30 days.
        </p>
      </Section>

      <Section title="8. Children's Privacy">
        <p>
          The Platform is not directed to children under 13 years of age. We do not knowingly
          collect personal information from children under 13. If you believe a child under 13 has
          provided us with personal information, please contact us to have it removed.
        </p>
      </Section>

      <Section title="9. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. We will notify you of material
          changes via email or a prominent notice on the Platform. The &quot;Last updated&quot; date at the
          top reflects the most recent revision.
        </p>
      </Section>

      <Section title="10. Contact Us">
        <p>
          For any privacy-related questions or requests, please contact our Data Protection team:
        </p>
        <ul>
          <li style={{ color: '#374151' }}>
            Email:{' '}
            <a href="mailto:legal@arivarangam.com" style={{ color: '#4F46E5' }}>
              legal@arivarangam.com
            </a>
          </li>
          <li style={{ color: '#374151' }}>Response time: within 30 business days.</li>
        </ul>
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
