export const Logo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 200 50"
    width="120"
    height="30"
    {...props}
  >
    <style>
      {`.logo-text { font-family: 'Inter', sans-serif; font-size: 38px; font-weight: 700; fill: hsl(var(--primary)); }`}
    </style>
    <text x="0" y="38" className="logo-text">Hızlı Kurye</text>
  </svg>
);
