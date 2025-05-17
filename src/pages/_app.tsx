import '@/styles/globals.css';
import '@/lib/polyfills';
import type { AppProps } from 'next/app';
import '@/lib/init-renderer';

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
} 