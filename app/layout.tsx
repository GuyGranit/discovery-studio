import type { ReactNode } from "react";

export const metadata = {
  title: "Discovery Studio",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
