import type { City, PropertyListing } from '../types';

export const cities: City[] = [
  { id: 'Ujjain', name: 'Ujjain', state: 'Madhya Pradesh', listingCount: 6, image: "/images/cities/Ujjain.jpg" },
  { id: 'indore', name: 'Indore', state: 'Madhya Pradesh', listingCount: 12, image:  "/images/cities/Indore_Rajwada.jpg" },
  { id: 'Bhopal', name: 'Bhopal', state: 'Madhya Pradesh', listingCount: 5, image: "/images/cities/Bhopal.jpg" },
  { id: 'Gwalior', name: 'Gwalior', state: 'Madhya Pradesh', listingCount: 4, image: "/images/cities/Gwalior.jpg" },
  { id: 'Jabalpur', name: 'Jabalpur', state: 'Madhya Pradesh', listingCount: 3, image: "/images/cities/Jabalpur.jpg" },
  { id: 'Sagar', name: 'Sagar', state: 'Madhya Pradesh', listingCount: 3, image: "/images/cities/Sagar.avif" },
  { id: 'Dewas', name: 'Dewas', state: 'Madhya Pradesh', listingCount: 4, image: "/images/cities/Dewas.jfif" },
  { id: 'Sanchi', name: 'Sanchi', state: 'Madhya Pradesh', listingCount: 2, image: "/images/cities/Sanchi.jpg" },
];

const photo = (id: number, w = 1200) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

export const testimonials = [
  { id: 't1', name: 'Priya Soni', role: 'MBA Student, Bhopal', avatar: "/images/person/Priya.jfif", text: 'As a girl moving to a new city alone, Drisya\'s verified badge gave my parents peace of mind. The PG was exactly as shown — no surprises.', rating: 5 },
  { id: 't2', name: 'Rohit Gupta', role: 'Software Engineer, Indore', avatar: "/images/person/Rohit.jfif", text: 'No broker fee, no fake listings, no back-and-forth. I found my PG in two days and moved in a week. This is how housing search should work.', rating: 5 },
  { id: 't3', name: 'Batool khan', role: 'BBA Student, Ujjain', avatar: "/images/person/Batool.jfif", text: 'The Drisya Expert concierge helped me find a place near my college within my budget when I was completely lost. Worth every rupee.', rating: 5 },
];

export const properties: PropertyListing[] = [
  {
    id: "p1",
    title: "Boys PG near Mahakal Temple",
    ownerId: "o1",
    photos: ["/images/cities/Ujjain.jpg"],
    city: "Ujjain",
    locality: "Mahakal Area",
    lat: 23.1765,
    lng: 75.7885,
    genderPreference: "male",
    occupancy: "single",
    price: 5000,
    deposit: 1000,
    amenities: ["Wifi", "Food"],
    description: "Nice PG near temple",
    rating: 4.2,
    reviewCount: 12,
    featured: true,
    instantBook: true,
    verified: true,
    moveInDate: "Immediate",
    distanceFromLandmark: "500m",
    reviews: [],
    virtualTour: false,
    views: 120,
    inquiries: 10,
    bookings: 3,
  },
];
