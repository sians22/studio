export const Logo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 250 50"
    width="150"
    height="30"
    {...props}
  >
    <defs>
      <linearGradient id="instagram-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: 'hsl(var(--accent))', stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 1 }} />
      </linearGradient>
    </defs>
    <style>
      {`.logo-text { font-family: 'Grand Hotel', cursive; font-size: 48px; fill: url(#instagram-gradient); }`}
    </style>
    <text x="0" y="42" className="logo-text">Быстрый Курьер</text>
  </svg>
);
