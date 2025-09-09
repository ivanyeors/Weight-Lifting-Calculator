import { redirect } from 'next/navigation'

export default function RootPage() {
  redirect('/home')
}

export const dynamic = 'force-static'
