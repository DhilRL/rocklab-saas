import "./globals.css";

export const metadata = {
  title: "Rocklab SaaS",
  description: "Multi-tenant workforce ops platform for gyms and activity businesses",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
