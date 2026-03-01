import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy · Studio OS",
  description: "Privacy Policy for Studio OS — how we collect, use, and protect your data.",
};

export default function PrivacyPage() {
  const lastUpdated = "February 25, 2026";

  return (
    <main className="min-h-screen bg-[#111111] px-6 py-24">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-16 border-b border-neutral-800 pb-10">
          <p className="mb-3 text-xs font-sans uppercase tracking-[0.1em] text-neutral-500">
            Legal
          </p>
          <h1 className="mb-4 text-3xl font-medium tracking-tight text-white">
            Privacy Policy
          </h1>
          <p className="text-sm text-neutral-500">
            Last updated: {lastUpdated}
          </p>
        </div>

        {/* Content */}
        <div className="space-y-12 text-sm leading-relaxed text-neutral-400">

          <section>
            <h2 className="mb-4 text-base font-medium text-white">1. Introduction</h2>
            <p>
              Studio OS (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) operates a design workspace application at studio-os.app and related services (collectively, the &quot;Service&quot;). This Privacy Policy explains how we collect, use, disclose, and protect information about you when you use our Service.
            </p>
            <p className="mt-3">
              By using Studio OS, you agree to the collection and use of information in accordance with this policy. If you do not agree with the terms of this policy, please do not access the Service.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-base font-medium text-white">2. Information We Collect</h2>

            <h3 className="mb-2 mt-6 text-sm font-medium text-neutral-300">2.1 Information You Provide</h3>
            <ul className="mt-2 space-y-1.5 pl-5 list-disc text-neutral-400">
              <li><strong className="text-neutral-300">Account information:</strong> When you create an account, we collect your email address and any display name you choose.</li>
              <li><strong className="text-neutral-300">Project data:</strong> Design briefs, color palettes, typography choices, task lists, and other content you create within the Service.</li>
              <li><strong className="text-neutral-300">Reference images:</strong> Images you upload or save to your projects, including those imported from connected third-party services.</li>
              <li><strong className="text-neutral-300">Communications:</strong> If you contact us for support or feedback, we retain the content of that communication.</li>
            </ul>

            <h3 className="mb-2 mt-6 text-sm font-medium text-neutral-300">2.2 Information We Collect Automatically</h3>
            <ul className="mt-2 space-y-1.5 pl-5 list-disc text-neutral-400">
              <li><strong className="text-neutral-300">Usage data:</strong> Pages viewed, features used, time spent, and interaction patterns within the Service.</li>
              <li><strong className="text-neutral-300">Device information:</strong> Browser type, operating system, screen resolution, and IP address.</li>
              <li><strong className="text-neutral-300">Log data:</strong> Server logs including request times, error logs, and performance metrics.</li>
            </ul>

            <h3 className="mb-2 mt-6 text-sm font-medium text-neutral-300">2.3 Information from Third-Party Services</h3>
            <p className="mt-2">
              When you connect third-party services such as Pinterest, Are.na, or Lummi to your Studio OS account, we receive limited data from those services to provide the requested functionality. The specific data we receive depends on your privacy settings on those platforms and the permissions you grant.
            </p>
            <ul className="mt-3 space-y-1.5 pl-5 list-disc text-neutral-400">
              <li><strong className="text-neutral-300">Pinterest:</strong> When you authorize Studio OS to access your Pinterest account, we may access your public boards, pins, and associated metadata (titles, descriptions, image URLs) solely to display and import references you select. We do not post to Pinterest on your behalf without your explicit action. We do not store your Pinterest credentials.</li>
              <li><strong className="text-neutral-300">Are.na:</strong> When you connect your Are.na account, we access channel data and block content you have selected to import.</li>
              <li><strong className="text-neutral-300">Lummi:</strong> We access publicly available imagery through the Lummi API to provide curated inspiration content.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-base font-medium text-white">3. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="mt-3 space-y-1.5 pl-5 list-disc text-neutral-400">
              <li>Provide, operate, and improve the Service</li>
              <li>Personalize your experience, including curating daily inspiration based on your saved references</li>
              <li>Process and complete actions you take within the Service (importing references, exporting design specs, etc.)</li>
              <li>Send transactional communications such as account confirmations and important updates</li>
              <li>Respond to your comments, questions, and support requests</li>
              <li>Monitor and analyze usage patterns to improve the Service</li>
              <li>Detect, prevent, and address technical issues, fraud, or abuse</li>
              <li>Comply with legal obligations</li>
            </ul>
            <p className="mt-4">
              We do not use your content (project data, design briefs, reference images) to train machine learning models without your explicit consent.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-base font-medium text-white">4. How We Share Your Information</h2>
            <p>
              We do not sell, rent, or trade your personal information to third parties. We may share your information in the following limited circumstances:
            </p>
            <ul className="mt-3 space-y-1.5 pl-5 list-disc text-neutral-400">
              <li><strong className="text-neutral-300">Service providers:</strong> We work with third-party vendors who assist in operating the Service (e.g., cloud hosting via Supabase, AI inference via OpenAI). These providers are contractually bound to keep your data confidential and may only use it to provide services to us.</li>
              <li><strong className="text-neutral-300">Legal requirements:</strong> We may disclose your information if required to do so by law or in response to valid requests by public authorities.</li>
              <li><strong className="text-neutral-300">Business transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may be transferred. We will notify you before your data is transferred and becomes subject to a different privacy policy.</li>
              <li><strong className="text-neutral-300">With your consent:</strong> We may share your information with third parties when you have given us explicit consent to do so.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-base font-medium text-white">5. Pinterest API Usage</h2>
            <p>
              Studio OS integrates with the Pinterest API to allow you to import your Pinterest boards and pins as reference material within your design projects. Our use of Pinterest API data is governed by Pinterest&apos;s API terms of service and Developer Policy.
            </p>
            <ul className="mt-3 space-y-1.5 pl-5 list-disc text-neutral-400">
              <li>We only request Pinterest permissions necessary to provide the import functionality you request.</li>
              <li>Pinterest data is used solely to display and import content you have explicitly selected.</li>
              <li>We do not use Pinterest data for advertising, profiling, or any purpose unrelated to the import feature.</li>
              <li>You can revoke Studio OS access to your Pinterest account at any time through your Pinterest account settings.</li>
              <li>Upon revocation, we will stop accessing new Pinterest data. You may request deletion of previously imported Pinterest content by contacting us at privacy@studio-os.app.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-base font-medium text-white">6. Data Retention</h2>
            <p>
              We retain your personal information for as long as your account is active or as needed to provide you with the Service. If you close your account, we will delete or anonymize your personal information within 30 days, except where we are required to retain it for legal, tax, or accounting purposes.
            </p>
            <p className="mt-3">
              Content you have created in Studio OS (projects, references, briefs) will be deleted within 30 days of account closure unless you export it beforehand.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-base font-medium text-white">7. Your Rights and Choices</h2>
            <p>Depending on your location, you may have the following rights regarding your personal information:</p>
            <ul className="mt-3 space-y-1.5 pl-5 list-disc text-neutral-400">
              <li><strong className="text-neutral-300">Access:</strong> Request a copy of the personal information we hold about you.</li>
              <li><strong className="text-neutral-300">Correction:</strong> Request that we correct inaccurate or incomplete information.</li>
              <li><strong className="text-neutral-300">Deletion:</strong> Request that we delete your personal information (subject to legal requirements).</li>
              <li><strong className="text-neutral-300">Portability:</strong> Request a machine-readable export of your data.</li>
              <li><strong className="text-neutral-300">Objection:</strong> Object to certain processing of your data.</li>
              <li><strong className="text-neutral-300">Opt-out of marketing:</strong> You can opt out of promotional emails by clicking &quot;unsubscribe&quot; in any such email or by contacting us.</li>
            </ul>
            <p className="mt-4">
              To exercise any of these rights, please contact us at privacy@studio-os.app. We will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-base font-medium text-white">8. Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These include encryption of data in transit (TLS), encryption of data at rest, and restricted access controls.
            </p>
            <p className="mt-3">
              No method of transmission over the Internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your information, we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-base font-medium text-white">9. Cookies and Tracking</h2>
            <p>
              Studio OS uses cookies and similar tracking technologies to maintain your session, remember your preferences (such as light/dark mode), and analyze usage patterns.
            </p>
            <ul className="mt-3 space-y-1.5 pl-5 list-disc text-neutral-400">
              <li><strong className="text-neutral-300">Essential cookies:</strong> Required for the Service to function (authentication sessions, CSRF protection). These cannot be disabled.</li>
              <li><strong className="text-neutral-300">Preference cookies:</strong> Store your settings such as theme preference and language.</li>
              <li><strong className="text-neutral-300">Analytics cookies:</strong> Help us understand how users interact with the Service. You can opt out of analytics tracking by contacting us.</li>
            </ul>
            <p className="mt-3">
              We do not use third-party advertising cookies or sell your browsing data to advertisers.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-base font-medium text-white">10. Children&apos;s Privacy</h2>
            <p>
              Studio OS is not directed to children under the age of 13. We do not knowingly collect personal information from children under 13. If we discover that a child under 13 has provided us with personal information, we will promptly delete it. If you believe we may have collected information from a child under 13, please contact us at privacy@studio-os.app.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-base font-medium text-white">11. International Data Transfers</h2>
            <p>
              Studio OS is operated in the United States. If you access our Service from outside the United States, your information may be transferred to and processed in the United States or other countries. By using the Service, you consent to the transfer of your information to countries that may have different data protection laws than your country of residence.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-base font-medium text-white">12. California Privacy Rights (CCPA)</h2>
            <p>
              If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA), including the right to know what personal information we collect, the right to request deletion, and the right to opt out of any sale of personal information. We do not sell personal information. To exercise your CCPA rights, contact us at privacy@studio-os.app.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-base font-medium text-white">13. European Privacy Rights (GDPR)</h2>
            <p>
              If you are located in the European Economic Area (EEA), United Kingdom, or Switzerland, you have rights under the General Data Protection Regulation (GDPR) and applicable local laws. Our legal bases for processing your personal data include: performance of a contract (providing the Service), legitimate interests (improving the Service), compliance with legal obligations, and your consent where we have requested it.
            </p>
            <p className="mt-3">
              If you have concerns about our data processing that we have not addressed, you have the right to lodge a complaint with your local data protection authority.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-base font-medium text-white">14. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date. For significant changes, we will also notify you by email. We encourage you to review this Privacy Policy periodically.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-base font-medium text-white">15. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="mt-4 border border-neutral-800 bg-[#141414] p-5 rounded-lg">
              <p className="text-neutral-300">Studio OS</p>
              <p className="mt-1">
                <a href="mailto:privacy@studio-os.app" className="text-blue-400 hover:text-blue-300 transition-colors">
                  privacy@studio-os.app
                </a>
              </p>
              <p className="mt-1 text-neutral-500">studio-os.app</p>
            </div>
          </section>

        </div>

        {/* Footer note */}
        <div className="mt-16 border-t border-neutral-800 pt-8 text-xs text-neutral-600">
          <p>This privacy policy was last updated on {lastUpdated}. It applies to all users of the Studio OS Service.</p>
        </div>
      </div>
    </main>
  );
}
