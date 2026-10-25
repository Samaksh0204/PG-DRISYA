// City photos live in client/public/images/cities/. Cities not listed here (or whose
// image fails to load) show a coloured placeholder card instead of a broken image.
export const cityImages: Record<string, { image: string; state: string }> = {
  ujjain: { image: '/images/cities/Ujjain.jpg', state: 'Madhya Pradesh' },
  indore: { image: '/images/cities/Indore_Rajwada.jpg', state: 'Madhya Pradesh' },
  bhopal: { image: '/images/cities/Bhopal.jpg', state: 'Madhya Pradesh' },
  gwalior: { image: '/images/cities/Gwalior.jpg', state: 'Madhya Pradesh' },
  jabalpur: { image: '/images/cities/Jabalpur.jpg', state: 'Madhya Pradesh' },
  sagar: { image: '/images/cities/Sagar.avif', state: 'Madhya Pradesh' },
  dewas: { image: '/images/cities/Dewas.jfif', state: 'Madhya Pradesh' },
  sanchi: { image: '/images/cities/Sanchi.jpg', state: 'Madhya Pradesh' },
};
