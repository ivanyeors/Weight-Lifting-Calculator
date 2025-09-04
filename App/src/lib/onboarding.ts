import { supabase } from './supabaseClient'

export interface OnboardingStatus {
  isComplete: boolean
  steps: {
    userProfile: boolean
    workoutSpaces: boolean
    workoutTemplates: boolean
    googleCalendar: boolean
  }
}

export async function checkOnboardingStatus(): Promise<OnboardingStatus> {
  try {
    const status: OnboardingStatus = {
      isComplete: false,
      steps: {
        userProfile: false,
        workoutSpaces: false,
        workoutTemplates: false,
        googleCalendar: false
      }
    }

    // Check users
    const { data: users } = await supabase
      .from('managed_users')
      .select('id')
      .limit(1)
    status.steps.userProfile = (users?.length || 0) > 0

    // Check workout spaces
    const { data: spaces } = await supabase
      .from('workout_spaces')
      .select('id')
      .limit(1)
    status.steps.workoutSpaces = (spaces?.length || 0) > 0

    // Check workout templates
    const { data: templates } = await supabase
      .from('workout_templates')
      .select('id')
      .limit(1)
    status.steps.workoutTemplates = (templates?.length || 0) > 0

    // Check Google Calendar connection (this is stored in localStorage)
    if (typeof window !== 'undefined') {
      const connectedAccounts = localStorage.getItem('fitspo:google_accounts')
      status.steps.googleCalendar = Boolean(connectedAccounts && JSON.parse(connectedAccounts).length > 0)
    }

    // Onboarding is complete if all required steps are done (Google Calendar is optional)
    status.isComplete = status.steps.userProfile && status.steps.workoutSpaces && status.steps.workoutTemplates

    return status
  } catch (error) {
    console.error('Error checking onboarding status:', error)
    return {
      isComplete: false,
      steps: {
        userProfile: false,
        workoutSpaces: false,
        workoutTemplates: false,
        googleCalendar: false
      }
    }
  }
}

export function markOnboardingComplete(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('fitspo:onboarding_complete', 'true')
    localStorage.setItem('fitspo:onboarding_completed_at', new Date().toISOString())
  }
}

export function isOnboardingComplete(): boolean {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('fitspo:onboarding_complete') === 'true'
  }
  return false
}
