"use client";

import { Loader2 } from 'lucide-react';

const MotorcycleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx="6" cy="18" r="3" />
    <circle cx="19" cy="18" r="3" />
    <path d="M6 15h13" />
    <path d="M19 15l-3-6H8.5L6 15" />
    <path d="M8 9h2" />
  </svg>
);


export default function LoadingScreen() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
      <div className="animate-ride">
        <MotorcycleIcon className="h-16 w-16" />
      </div>
      <h1 className="mt-4 font-grand-hotel text-4xl tracking-wide">Kurye Şirketi</h1>
      <Loader2 className="mt-8 h-8 w-8 animate-spin" />
    </div>
  );
}
