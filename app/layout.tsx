import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nhà Gần - Bàn điều phối",
  description: "Bàn điều phối chăm nom người cao tuổi và dịch vụ hỗ trợ đời sống thường ngày",
  openGraph: {
    title: "Nhà Gần - Bàn điều phối",
    description: "Bàn điều phối chăm nom người cao tuổi và dịch vụ hỗ trợ đời sống thường ngày",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>{children}</body>
    </html>
  );
}
