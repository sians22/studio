export const Logo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 250 50"
    width="150"
    height="30"
    {...props}
  >
    <style>
      {`.logo-text { font-family: 'Inter', sans-serif; font-size: 38px; font-weight: 700; fill: hsl(var(--primary)); }`}
    </style>
    <text x="0" y="38" className="logo-text">Быстрый Курьер</text>
  </svg>
);
