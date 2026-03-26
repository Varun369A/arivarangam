import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
};

export default function PrivacyPage() {
  return (
    <article className="[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1.5 [&_li]:text-slate-600 [&_li]:leading-relaxed [&_p]:leading-relaxed [&_strong]:font-semibold [&_strong]:text-slate-700 [&_a]:text-indigo-600 [&_a:hover]:text-indigo-800 [&_h3]:font-semibold [&_h3]:text-slate-700">
      {/* Header */}
      <div className="not-prose mb-10">
        <div className="inline-flex items-center gap-2 bg-green-50 border border-green-100 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
          Legal
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-3">Privacy Policy</h1>
        <p className="text-slate-500 text-sm">
          Effective date: 1 January 2025 · Last updated: 26 March 2025
        </p>
      </div>

      <p className="text-[15px] text-slate-600 leading-relaxed mb-8">
        Arrivarangam (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is committed to protecting your privacy. This Privacy Policy
        explains how we collect, use, store, and share your personal information when you use our
        platform. By using Arrivarangam, you agree to the practices described here.
      </p>

      <Section title="1. Information We Collect">
        <h3 className="font-semibold text-slate-700 text-[15px] mt-2 mb-1">a. Account Information</h3>
        <ul>
          <li><strong>Name</strong> and <strong>email address</strong> — provided when you register.</li>
          <li><strong>Password</strong> — stored as a bcrypt hash; never in plain text.</li>
          <li><strong>Avatar</strong> — optional profile picture you upload.</li>
        </ul>

        <h3 className="font-semibold text-slate-700 text-[15px] mt-4 mb-1">b. Usage Information</h3>
        <ul>
          <li>Tasks submitted (prompts, category, model used, timestamps).</li>
          <li>Credit balance, transactions, and purchase history.</li>
          <li>Session activity (login timestamps, IP addresses).</li>
          <li>Device and browser metadata (user-agent, screen resolution) for security monitoring.</li>
        </ul>

        <h3 className="font-semibold text-slate-700 text-[15px] mt-4 mb-1">c. Payment Information</h3>
        <ul>
          <li>
            We use <strong>Razorpay</strong> (PCI-DSS Level 1 compliant) to process payments.
            We do <strong>not</strong> store full card numbers or CVV codes. Razorpay provides us
            with a tokenised transaction reference, payment ID, and order details.
          </li>
          <li>UPI ID or last 4 digits of card (stored by Razorpay, not us).</li>
        </ul>

        <h3 className="font-semibold text-slate-700 text-[15px] mt-4 mb-1">d. AI Prompts & Outputs</h3>
        <ul>
          <li>
            Prompts you submit to the Platform are sent to AI providers (Anthropic, OpenAI, Perplexity,
            ElevenLabs) to fulfil your task. These providers have their own privacy policies governing
            how they handle data.
          </li>
          <li>Task outputs are stored on our servers and associated with your account.</li>
        </ul>
      </Section>

      <Section title="2. How We Use Your Information">
        <ul>
          <li>To provide, operate, and improve the Platform.</li>
          <li>To process payments and manage credit balances.</li>
          <li>To send transactional emails (account verification, password reset, purchase receipts).</li>
          <li>To detect and prevent fraud, abuse, and security threats.</li>
          <li>To comply with legal obligations.</li>
          <li>
            To send product updates and announcements (you may unsubscribe at any time via the
            link in each email).
          </li>
        </ul>
        <p>
          We do <strong>not</strong> use your personal data or prompts to train our AI models.
        </p>
      </Section>

      <Section title="3. Data Sharing">
        <p>
          We do <strong>not sell</strong> your personal data to third parties.
          We share data only as follows:
        </p>
        <ul>
          <li>
            <strong>AI providers</strong> (Anthropic, OpenAI, Perplexity, ElevenLabs): prompts are
            sent to execute your tasks. Each provider&apos;s data handling is governed by their own
            privacy policy and API terms.
          </li>
          <li>
            <strong>Razorpay</strong>: payment data is shared to process transactions. Razorpay&apos;s
            privacy policy applies to payment data.
          </li>
          <li>
            <strong>Infrastructure providers</strong> (e.g., AWS, Redis hosting): data is stored
            on servers hosted by cloud providers under data processing agreements.
          </li>
          <li>
            <strong>Legal requirements</strong>: we may disclose data when required by law, court
            order, or lawful government request.
          </li>
        </ul>
      </Section>

      <Section title="4. Cookies & Tracking">
        <p>We use the following cookies:</p>
        <ul>
          <li>
            <strong>Authentication cookie</strong> (HttpOnly, Secure): maintains your session.
            Required for the Platform to function.
          </li>
          <li>
            <strong>CSRF token</strong>: prevents cross-site request forgery attacks.
          </li>
        </ul>
        <p>
          We do not use third-party advertising or tracking cookies. We do not serve ads.
        </p>
      </Section>

      <Section title="5. Data Retention">
        <ul>
          <li>
            <strong>Account data</strong>: retained while your account is active and for 90 days
            after deletion.
          </li>
          <li>
            <strong>Task data and outputs</strong>: retained for 12 months from task creation,
            after which they may be purged.
          </li>
          <li>
            <strong>Payment records</strong>: retained for 7 years to comply with financial
            regulations.
          </li>
          <li>
            <strong>Security logs</strong>: retained for 90 days.
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
          <li>HTTPS encryption in transit (TLS 1.2+).</li>
          <li>Passwords hashed with bcrypt (cost factor 12).</li>
          <li>Authentication tokens stored in HttpOnly, Secure cookies.</li>
          <li>Access controls: only authorised personnel can access production data.</li>
          <li>PCI-compliant payment processing via Razorpay.</li>
        </ul>
        <p>
          No system is perfectly secure. In the event of a data breach affecting your personal
          information, we will notify you as required by applicable law.
        </p>
      </Section>

      <Section title="7. Your Rights">
        <p>Subject to applicable law, you have the right to:</p>
        <ul>
          <li><strong>Access</strong>: request a copy of the personal data we hold about you.</li>
          <li><strong>Correction</strong>: update inaccurate or incomplete data via your account settings.</li>
          <li><strong>Deletion</strong>: request deletion of your account and personal data.</li>
          <li><strong>Portability</strong>: receive your task data in a machine-readable format.</li>
          <li>
            <strong>Objection</strong>: object to processing of your data for direct marketing.
          </li>
          <li>
            <strong>Withdraw consent</strong>: unsubscribe from marketing emails at any time.
          </li>
        </ul>
        <p>
          To exercise any of these rights, email{' '}
          <a href="mailto:legal@arivarangam.com" className="text-indigo-600 hover:text-indigo-800">
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
          <li>
            Email:{' '}
            <a href="mailto:legal@arivarangam.com" className="text-indigo-600 hover:text-indigo-800">
              legal@arivarangam.com
            </a>
          </li>
          <li>Response time: within 30 business days.</li>
        </ul>
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
