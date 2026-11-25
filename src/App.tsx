import App from './app/App';
import { Analytics } from '@vercel/analytics/react';

export default function RootApp() {
  return (
    <>
      <App />
      <Analytics />
    </>
  );
}
