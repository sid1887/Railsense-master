import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import ToastContainer from '@/components/ToastContainer';
import AlertToastContainer from '@/components/AlertToastContainer';
import { TrainProvider } from '@/contexts/TrainContext';
import { AuthProvider } from '@/app/context/AuthContext';

export const metadata: Metadata = {
  title: 'RailSense - Intelligent Train Halt Insight System',
  description: 'Real-time train tracking and intelligent halt analysis for passenger clarity',
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      </head>
      <body className="bg-dark-bg text-text-primary antialiased">
        <AuthProvider>
          <TrainProvider>
            <Navbar />
            <main className="min-h-screen pt-16">
              {children}
            </main>
            <ToastContainer />
            <AlertToastContainer />
          </TrainProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
