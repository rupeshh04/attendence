import "./globals.css";

export const metadata = {
  title: "Attendance Management System",
  description: "Track employee attendance with geo-fencing and photo verification",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
