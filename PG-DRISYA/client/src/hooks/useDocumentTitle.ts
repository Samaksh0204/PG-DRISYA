import { useEffect } from 'react';

const BASE_TITLE = 'Drisya — Verified PG & Hostel Marketplace';

/**
 * Sets the document title and optionally a meta description.
 * Resets to the base title on unmount.
 */
export function useDocumentTitle(title?: string, description?: string) {
  useEffect(() => {
    if (title) {
      document.title = `${title} | Drisya`;
    } else {
      document.title = BASE_TITLE;
    }

    if (description) {
      let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'description';
        document.head.appendChild(meta);
      }
      meta.content = description;
    }

    return () => {
      document.title = BASE_TITLE;
    };
  }, [title, description]);
}
