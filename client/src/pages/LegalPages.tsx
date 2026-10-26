// IMPORTANT: These policies are a solid starting template written for an Indian
// marketplace (DPDP Act 2023, IT Act 2000 / Intermediary Rules 2021). Have a lawyer
// review them, fill in VITE_LEGAL_NAME / VITE_SUPPORT_EMAIL / VITE_GRIEVANCE_OFFICER
// in client/.env, and update LAST_UPDATED whenever you change them.
import { useState } from 'react';
import { ChevronDown, Mail, Phone, Flag, KeyRound, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { siteConfig } from '../lib/config';

const LAST_UPDATED = '24 October 2026';

function LegalShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="container-page py-12">
      <article className="prose-sm mx-auto max-w-3xl text-ink-700 dark:text-ink-300 [&_h2]:mb-2 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-ink-900 dark:[&_h2]:text-ink-100 [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-3 [&_p]:leading-relaxed [&_ul]:mb-3 [&_ul]:space-y-1">
        <h1 className="font-display text-3xl font-bold text-ink-900 dark:text-white">{title}</h1>
        <p className="mt-1 text-xs text-ink-500">Last updated: {LAST_UPDATED}</p>
        {children}
      </article>
    </div>
  );
}

const contact = () => siteConfig.supportEmail || 'the support email shown in the website footer';

export function PrivacyPage() {
  const { legalName, grievanceOfficer } = siteConfig;
  return (
    <LegalShell title="Privacy Policy">
      <p>{legalName} ("Drisya", "we") runs a website and app that help people find and list paying-guest (PG) accommodation and hostels in India. This policy explains what personal data we collect, why, and the choices you have. It is written to comply with the Digital Personal Data Protection Act, 2023 and the Information Technology Act, 2000.</p>

      <h2>1. Data we collect</h2>
      <ul>
        <li><strong>Account data:</strong> name, email, password (stored only as a one-way hash), optional mobile number, city, gender, college/workplace, budget preferences, profile photo and bio.</li>
        <li><strong>Listing data (hosts):</strong> property details, photos, address area and map coordinates, rent, deposit and house rules.</li>
        <li><strong>Activity data:</strong> visits and booking requests, messages between users, reviews, saved listings, reports you file and notifications.</li>
        <li><strong>Technical data:</strong> IP address (used for security and rate limiting), and a login token stored in your browser's local storage to keep you signed in.</li>
      </ul>
      <p>We do not collect Aadhaar numbers, bank details or card details. Never send these to anyone through Drisya.</p>

      <h2>2. Why we use it</h2>
      <ul>
        <li>To create and secure your account, including email confirmation and password reset.</li>
        <li>To show listings, connect tenants and hosts, and run visits, booking requests, messaging and reviews.</li>
        <li>To keep the platform safe: reviewing new listings, investigating reports, preventing fraud and abuse.</li>
        <li>To send service emails and in-app notifications about your activity. We do not send marketing without your consent.</li>
      </ul>
      <p>We process your data on the basis of your consent (given at sign-up) and for the legitimate uses permitted under the DPDP Act, such as providing the service you asked for.</p>

      <h2>3. Who can see what</h2>
      <ul>
        <li>Your public profile (name, photo, bio, city, join date, reviews) is visible to other users.</li>
        <li>Your mobile number is shared with the other party only after a visit is confirmed or a booking is accepted.</li>
        <li>Your email address is never shown to other users.</li>
        <li>Reviews you post are public.</li>
      </ul>

      <h2>4. Service providers</h2>
      <p>We use trusted processors who handle data only on our instructions: MongoDB Atlas (database hosting), Cloudinary (photo storage), our email delivery provider, our web hosting provider, OpenStreetMap (map tiles) and Google Fonts. Some providers may store data outside India, subject to the safeguards required by law. We do not sell your personal data.</p>

      <h2>5. How long we keep it</h2>
      <p>We keep account data while your account is active. When you delete your account we delete your profile, wishlist, notifications and reports, and take down your listings. Reviews and messages you sent remain visible to the other party but are shown as "Former member". We may keep limited records where the law requires it (for example, to respond to legal requests) for up to 180 days.</p>

      <h2>6. Your rights</h2>
      <ul>
        <li><strong>Access & portability:</strong> download your data any time from Account settings → Download my data.</li>
        <li><strong>Correction:</strong> edit your profile in Account settings, or contact us.</li>
        <li><strong>Erasure:</strong> delete your account from Account settings → Delete my account.</li>
        <li><strong>Withdraw consent:</strong> you can stop using the service and delete your account at any time.</li>
        <li><strong>Grievance redressal and nomination:</strong> contact our Grievance Officer below.</li>
      </ul>

      <h2>7. Security</h2>
      <p>Passwords are hashed, connections are encrypted (HTTPS), access to data is restricted, and login attempts are rate-limited. No system is perfectly secure; tell us immediately if you suspect misuse of your account.</p>

      <h2>8. Children</h2>
      <p>Drisya is only for people aged 18 or over. We do not knowingly collect data from children. If you believe a child has created an account, contact us and we will delete it.</p>

      <h2>9. Grievance Officer</h2>
      <p>{grievanceOfficer ? `${grievanceOfficer}, ` : ''}{legalName}. Email: {contact()}. We acknowledge complaints within 24 hours and aim to resolve them within 15 days. If you are not satisfied, you may approach the Data Protection Board of India.</p>

      <h2>10. Changes</h2>
      <p>We will post updates here and, for significant changes, notify you by email or in the app.</p>
    </LegalShell>
  );
}

export function TermsPage() {
  const { legalName } = siteConfig;
  return (
    <LegalShell title="Terms of Service">
      <p>These terms are an agreement between you and {legalName} ("Drisya"). By creating an account or using the platform you agree to them. If you don't agree, please don't use Drisya.</p>

      <h2>1. What Drisya is</h2>
      <p>Drisya is an online marketplace that lets property owners ("hosts") list PG and hostel accommodation and lets people looking for accommodation ("tenants") find, visit and request to book it. Drisya is an intermediary: we are not the owner, landlord, broker or agent of any property, and we are not a party to the rental arrangement between a host and a tenant.</p>

      <h2>2. Eligibility and accounts</h2>
      <ul>
        <li>You must be at least 18 and able to enter a binding contract.</li>
        <li>Give accurate information and keep your password secret. You are responsible for activity on your account.</li>
        <li>One person, one account. We may refuse, suspend or close accounts that break these terms.</li>
      </ul>

      <h2>3. Hosts</h2>
      <ul>
        <li>You must own the property or be authorised to let it, and comply with all applicable laws, local rules and police-verification requirements.</li>
        <li>Listings must be accurate: real photos, correct rent, deposit, amenities and rules. We review new listings and may reject, edit, pause or remove any listing.</li>
        <li>Respond to visit and booking requests promptly. Do not discriminate against tenants on the basis of religion, caste, region or similar grounds.</li>
        <li>The "Verified" badge means our team inspected the property at a point in time. It is not a guarantee of its condition.</li>
      </ul>

      <h2>4. Tenants</h2>
      <ul>
        <li>Visit a property before paying. Pay rent and deposits only against a written agreement and receipt.</li>
        <li>A booking request is not a contract until the host accepts it. The rental agreement, payment, refunds and house rules are between you and the host.</li>
        <li>Reviews must be honest and based on your own visit or stay.</li>
      </ul>

      <h2>5. Payments and fees</h2>
      <p>Drisya currently charges no fees to tenants or hosts and does not collect rent or deposits. Any money is paid directly between tenant and host. Drisya is not responsible for payments, refunds or disputes between users, but we will investigate reports of fraud and may suspend accounts involved.</p>

      <h2>6. Things you must not do</h2>
      <ul>
        <li>Post fake, misleading, offensive or illegal content, or someone else's photos.</li>
        <li>Harass, threaten or scam other users, or ask for advance payment to "hold" a room before a visit.</li>
        <li>Collect other users' data, spam, or use bots or scrapers.</li>
        <li>Try to break, overload or bypass the security of the platform.</li>
      </ul>

      <h2>7. Content</h2>
      <p>You keep ownership of content you post (photos, descriptions, reviews) and give Drisya a non-exclusive, royalty-free licence to display it on the platform and in promoting it. We may remove content that breaks these terms or the law.</p>

      <h2>8. Reporting and takedown</h2>
      <p>Report listings, profiles, reviews or messages using the Report buttons, or contact us at {contact()}. We act on valid complaints as required by the Information Technology (Intermediary Guidelines) Rules, 2021.</p>

      <h2>9. Liability</h2>
      <p>The platform is provided "as is". To the extent the law allows, Drisya is not liable for the condition of any property, the conduct of any user, or losses arising from arrangements between users. Our total liability for any claim is limited to ₹1,000.</p>

      <h2>10. Ending your use</h2>
      <p>You can delete your account at any time in Account settings. We may suspend or end access for violations of these terms, with notice where practical.</p>

      <h2>11. Governing law</h2>
      <p>These terms are governed by the laws of India. Courts at Indore, Madhya Pradesh have exclusive jurisdiction, subject to any consumer-protection rights you have.</p>

      <h2>12. Changes</h2>
      <p>We may update these terms. If changes are significant we'll notify you; continuing to use Drisya after that means you accept them.</p>
    </LegalShell>
  );
}

const FAQ: [string, string][] = [
  ['Does Drisya charge brokerage?', 'No. Drisya does not charge tenants or hosts any fee at the moment. You pay rent and deposit directly to the host at move-in.'],
  ['How does booking work?', 'Pick a move-in date and length of stay and send a request. The host accepts or declines, usually within 24 hours. PGs with Instant Book are confirmed immediately while rooms are free. Nothing is charged online.'],
  ['Can I get the owner\'s phone number?', 'No. To keep everyone safe, host phone numbers are never shown. Message the host on Drisya — before and after your visit or booking — so there is always a record.'],
  ['Who can write reviews?', 'Only tenants whose visit was marked completed, or who stayed there through a booking. Reviews from stays are labelled "Stayed here".'],
  ['What does "Verified" mean?', 'Our team physically inspected the property. Every new listing is also reviewed online before it goes live.'],
  ['How do I cancel?', 'Open My trips → Bookings or Visits and choose Cancel. The other person is notified straight away.'],
  ['I forgot my password', 'Use "Forgot password?" on the log-in page. We\'ll email you a link that works for one hour.'],
  ['How do I delete my account or download my data?', 'Go to Account settings → Privacy & data.'],
  ['How do I list my PG?', 'Sign up (or choose "List your PG" from the menu), add details and real photos, and submit. Our team reviews it within 1–2 working days.'],
];

export function HelpPage() {
  const { navigate } = useApp();
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-3xl font-bold text-ink-900 dark:text-white">Help centre</h1>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <button onClick={() => navigate('/forgot-password')} className="card flex items-center gap-2 p-4 text-sm font-medium"><KeyRound className="h-4 w-4 text-brand-500" /> Reset password</button>
          <button onClick={() => navigate('/trust')} className="card flex items-center gap-2 p-4 text-sm font-medium"><Flag className="h-4 w-4 text-brand-500" /> Report a problem</button>
          <button onClick={() => navigate('/profile/edit')} className="card flex items-center gap-2 p-4 text-sm font-medium"><Trash2 className="h-4 w-4 text-brand-500" /> Delete account</button>
        </div>
        <div className="mt-8 divide-y divide-ink-100 rounded-2xl border border-ink-100 dark:divide-ink-800 dark:border-ink-800">
          {FAQ.map(([q, a], i) => (
            <div key={q}>
              <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-ink-900 dark:text-ink-100" aria-expanded={open === i}>
                {q} <ChevronDown className={`h-4 w-4 shrink-0 transition ${open === i ? 'rotate-180' : ''}`} />
              </button>
              {open === i && <p className="px-5 pb-4 text-sm leading-relaxed text-ink-600 dark:text-ink-300">{a}</p>}
            </div>
          ))}
        </div>
        {(siteConfig.supportEmail || siteConfig.supportPhone) && (
          <div className="mt-8 rounded-2xl bg-ink-50 p-6 dark:bg-ink-900">
            <h2 className="font-semibold text-ink-900 dark:text-ink-100">Still need help?</h2>
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              {siteConfig.supportEmail && <a href={`mailto:${siteConfig.supportEmail}`} className="flex items-center gap-2 text-brand-600"><Mail className="h-4 w-4" /> {siteConfig.supportEmail}</a>}
              {siteConfig.supportPhone && <a href={`tel:${siteConfig.supportPhone.replace(/\s/g, '')}`} className="flex items-center gap-2 text-brand-600"><Phone className="h-4 w-4" /> {siteConfig.supportPhone}</a>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
