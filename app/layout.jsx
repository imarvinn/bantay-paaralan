import './globals.css';

export const metadata = {
  title: "Bantay Paaralan",
  description: "Talisay CDRRMO Emergency Alert System",
  manifest: "/manifest.json",
  themeColor: "#b91c1c",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Bantay",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white">
        {children}
        
        {/* 🆕 Manually registers the offline worker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}