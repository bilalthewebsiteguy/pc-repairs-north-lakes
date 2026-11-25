/**
 * ============================================================================
 *  SITE CONFIG — North Lakes business details used by the header, footer,
 *  call buttons and CTA bands. Page TEXT comes from src/content/ (the
 *  WordPress export) — never put page copy here.
 *
 *  Anything marked `// CONFIRM` still needs the client's answer.
 * ============================================================================
 */

export const site = {
  // PREVIEW MODE: only the pages in `livePages` can be opened. Links to every other page on
  // this site look normal but do nothing. Phone (tel:) and external links (quote form) still work.
  // Set pageLinksEnabled to true to switch every link back on - nothing else needs changing.
  pageLinksEnabled: false,
  livePages: ['/', '/computer-repairs-north-lakes/', '/laptop-repair/', '/pc-services-2/', '/mac-repair-services/', '/about-us/', '/services/'],

  businessName: 'PC Repairs North Lakes', // CONFIRM — site also uses "Zoo Computer Repairs" / "Fix It"
  logo: 'PC Repairs Northlakes', // same wording as the current logo image
  url: 'https://www.pcrepairsnorthlakes.com.au',
  area: 'Moreton Bay and Brisbane Northside', // wording from the live homepage
  tagline: 'Affordable and reliable computer repair services across Moreton Bay and Brisbane Northside.',

  phone: {
    display: '07 3144 6766',
    tel: '+61731446766',
  },
  email: 'hello@pcrepairsnorthlakes.com.au',

  // Where every "Get a Quote" button goes. This is what the live site's main quote buttons use.
  quoteUrl: 'http://quote.zoorepairs.com.au/', // CONFIRM — keep the Zoo quote form or use a North Lakes one?

  // Brand colours, taken from the WordPress site (see src/styles/global.css for how they're used)
  colors: {
    primary: '#285A85', // steel blue - headings, call bar, links
    accent: '#F9B418', // golden - small highlights / underlines
    cta: '#E8550F', // orange - call buttons (old #FF631A, deepened so white text is readable)
    ink: '#102A43', // very dark blue - body headings on light backgrounds, footer
  },

  // Main menu — same pages (and URLs) as the WordPress menu, so internal links don't change
  nav: [
    { label: 'Home', href: '/' },
    {
      label: 'Services',
      href: '/services/',
      children: [
        // Added (not in the WordPress menu) so the North Lakes page is easy to reach
        { label: 'Computer Repairs North Lakes', href: '/computer-repairs-north-lakes/' },
        { label: 'Laptop Repair', href: '/laptop-repair/' },
        { label: 'Mac Repair Services', href: '/mac-repair-services/' },
        { label: 'PC Services', href: '/pc-services-2/' },
        { label: 'Other Services', href: '/other-services/' },
      ],
    },
    { label: 'About', href: '/about-us/' },
    { label: 'Coverage Areas', href: '/areas-we-serve/' },
    { label: 'Blog', href: '/blog/' },
  ],

  // Laptop brand pages linked from the WordPress footer
  brands: [
    { label: 'Acer', href: '/acer-laptop-common-problems/' },
    { label: 'ASUS', href: '/asus-laptop-common-problems/' },
    { label: 'Dell', href: '/dell-laptop-common-problems/' },
    { label: 'HP', href: '/hp-laptops-common-problems/' },
    { label: 'Lenovo', href: '/lenovo-laptop-common-problems/' },
    { label: 'Sony', href: '/sony-laptops-common-problems/' },
  ],

  // Suburbs shown in the footer (full list lives on /areas-we-serve/)
  featuredSuburbs: [
    { label: 'North Lakes', href: '/computer-repairs-north-lakes/' },
    { label: 'Mango Hill', href: '/computer-repairs-mango-hill/' },
    { label: 'Kallangur', href: '/computer-repairs-kallangur/' },
    { label: 'Petrie', href: '/computer-repairs-petrie/' },
    { label: 'Redcliffe', href: '/computer-repairs-redcliffe/' },
    { label: 'Deception Bay', href: '/computer-repairs-deception-bay/' },
    { label: 'Narangba', href: '/computer-repairs-narangba/' },
    { label: 'Burpengary', href: '/computer-repairs-burpengary/' },
    { label: 'Caboolture', href: '/computer-repairs-caboolture/' },
    { label: 'Strathpine', href: '/computer-repairs-strathpine/' },
    { label: 'Aspley', href: '/computer-repairs-aspley/' },
    { label: 'Chermside', href: '/computer-repairs-chermside/' },
  ],
} as const;

export type NavItem = { label: string; href: string; children?: readonly { label: string; href: string }[] };
