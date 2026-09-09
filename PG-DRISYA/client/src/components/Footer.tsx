import { ShieldCheck, Mail, Phone, MapPin, Twitter, Instagram, Linkedin, Facebook } from 'lucide-react';
import { useApp } from '../context/AppContext';

export function Footer() {
  const { navigate } = useApp();

  const socialLinks = [
    {
      icon: Twitter,
      url: "https://x.com/DrisyaOfficial",
    },
    {
      icon: Instagram,
      url: "https://instagram.com/drisyaofficial",
    },
    {
      icon: Linkedin,
      url: "https://linkedin.com/company/drisya",
    },
    {
      icon: Facebook,
      url: "https://facebook.com/drisyaofficial",
    },
  ];

  const col = (title: string, links: [string, string][]) => (
    <div>
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">
        {title}
      </h4>
      <ul className="space-y-2">
        {links.map(([label, to]) => (
          <li key={label}>
            <button
              onClick={() => navigate(to)}
              className="text-sm text-ink-600 transition hover:text-coral-500 dark:text-ink-300"
            >
              {label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <footer className="border-t border-ink-100 bg-ink-50/50 dark:border-ink-800 dark:bg-ink-950">
      <div className="container-page py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-6">
          <div className="col-span-2">
            <button
              onClick={() => navigate('/')}
              className="mb-3 flex items-center gap-2"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-coral-500 text-white">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <span className="font-display text-lg font-bold">Drisya</span>
            </button>

            <p className="mb-4 max-w-xs text-sm text-ink-500 dark:text-ink-400">
              India's one of the most trusted PG & hostel marketplace.
              Verified properties, zero hidden broker fees, and a community
              built on accountability.
            </p>

            <div className="flex gap-3">
              {socialLinks.map(({ icon: Icon, url }, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Visit our ${Icon.displayName || "social"} page`}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-ink-500 shadow-soft transition-all duration-300 hover:scale-110 hover:bg-coral-500 hover:text-white dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-coral-500"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {col('Explore', [
            ['Search PGs', '/search'],
            ['Pricing', '/pricing'],
            ['Drisya Expert', '/expert'],
            ['Trust & Safety', '/trust']
          ])}

          {col('Tenants', [
            ['Sign Up', '/login?role=tenant'],
            ['My Dashboard', '/dashboard'],
            ['Messages', '/messages'],
            ['Wishlist', '/dashboard']
          ])}

          {col('Owners', [
            ['List your property', '/login?role=owner'],
            ['Owner Dashboard', '/owner'],
            ['Pricing Plans', '/pricing'],
            ['Verification', '/trust']
          ])}

          {col('Support', [
            ['Help Center', '/trust'],
            ['Report an Issue', '/trust'],
            ['Contact Us', '/trust'],
            ['Blog', '/trust']
          ])}

          {col('Company', [
            ['About Us', '/trust'],
            ['Careers', '/trust'],
            ['Privacy Policy', '/trust'],
            ['Terms', '/trust']
          ])}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-ink-100 pt-6 dark:border-ink-800 sm:flex-row">
          <p className="text-xs text-ink-400">
            &copy; 2026 Drisya Technologies. Made in India.
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs text-ink-400">
            <a
            href="mailto:samakshshrivastava02@gmail.com"
            className="flex items-center gap-1 transition-colors hover:text-coral-500"
            >
              <Mail className="h-3.5 w-3.5" />
              samakshshrivastava02@gmail.com
            </a>

            <a
            href="tel:+918815809209"
            className="flex items-center gap-1 transition-colors hover:text-coral-500"
            >
              <Phone className="h-3.5 w-3.5" />
              +91 88158 09209
            </a>

            <a
            href="https://maps.google.com/?q=Indore,India"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 transition-colors hover:text-coral-500"
            >
              <MapPin className="h-3.5 w-3.5" />
              Indore, Madhya Pradesh, India
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
