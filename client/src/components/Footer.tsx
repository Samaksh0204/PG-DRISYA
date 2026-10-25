import { ShieldCheck, Mail, Phone, MapPin, Twitter, Instagram, Linkedin, Facebook } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { siteConfig } from '../lib/config';

export function Footer() {
  const { navigate } = useApp();
  const { social } = siteConfig;
  const socialLinks = [
    { icon: Twitter, url: social.twitter, label: 'X (Twitter)' },
    { icon: Instagram, url: social.instagram, label: 'Instagram' },
    { icon: Linkedin, url: social.linkedin, label: 'LinkedIn' },
    { icon: Facebook, url: social.facebook, label: 'Facebook' },
  ].filter((s) => s.url);

  const col = (title: string, links: [string, string][]) => (
    <div>
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-white">{title}</h4>
      <ul className="space-y-2">
        {links.map(([label, to]) => (
          <li key={label}>
            <button onClick={() => navigate(to)} className="text-sm text-ink-300 transition hover:text-brand-400">{label}</button>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <footer className="bg-ink-900 text-ink-300 dark:bg-ink-950">
      <div className="container-page py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          <div className="col-span-2">
            <button onClick={() => navigate('/')} className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white"><ShieldCheck className="h-5 w-5" /></div>
              <span className="font-display text-lg font-bold text-white">Drisya</span>
            </button>
            <p className="mb-4 max-w-xs text-sm text-ink-300">
              Find PGs and hostels, talk to owners directly, visit before you pay. No brokerage.
            </p>
            {socialLinks.length > 0 && (
              <div className="flex gap-3">
                {socialLinks.map(({ icon: Icon, url, label }) => (
                  <a key={label} href={url} target="_blank" rel="noopener noreferrer" aria-label={label}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-brand-300 transition hover:-translate-y-0.5 hover:bg-brand-500 hover:text-white">
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}
          </div>
          {col('Tenants', [['Search PGs', '/search'], ['Drisya Expert', '/expert'], ['My trips', '/dashboard'], ['Messages', '/messages']])}
          {col('Owners', [['List your PG', '/owner'], ['Host dashboard', '/owner'], ['Pricing', '/pricing']])}
          {col('Help & legal', [['Help centre', '/help'], ['Trust & Safety', '/trust'], ['Privacy policy', '/privacy'], ['Terms of service', '/terms']])}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
          <p className="text-xs text-ink-300">&copy; {new Date().getFullYear()} {siteConfig.legalName}. Made in India.</p>
          <div className="flex flex-wrap items-center gap-4 text-xs text-ink-300">
            {siteConfig.supportEmail && (
              <a href={`mailto:${siteConfig.supportEmail}`} className="flex items-center gap-1 hover:text-brand-400"><Mail className="h-3.5 w-3.5" /> {siteConfig.supportEmail}</a>
            )}
            {siteConfig.supportPhone && (
              <a href={`tel:${siteConfig.supportPhone.replace(/\s/g, '')}`} className="flex items-center gap-1 hover:text-brand-400"><Phone className="h-3.5 w-3.5" /> {siteConfig.supportPhone}</a>
            )}
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {siteConfig.city}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
