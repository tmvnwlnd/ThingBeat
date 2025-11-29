import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ThingBeat",
  description: "Turn everyday objects into playable sounds",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Silkscreen:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-silkscreen bg-thingbeat-white text-thingbeat-blue">
        {children}
      </body>
    </html>
  );
}
