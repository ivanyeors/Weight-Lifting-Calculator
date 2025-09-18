import { redirect } from 'next/navigation'

export default function RootPage() {
  // Root always shows the landing experience
  redirect('/platform')
}
