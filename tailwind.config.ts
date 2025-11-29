import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'thingbeat-blue': '#2600FF',
        'thingbeat-white': '#FFFFFF',
      },
      fontFamily: {
        'silkscreen': ['Silkscreen', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
