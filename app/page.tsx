import { redirect } from 'next/navigation';

export default function HomePage() {
  // Automatically bounce anyone visiting the base URL straight to the login page
  redirect('/login');
}