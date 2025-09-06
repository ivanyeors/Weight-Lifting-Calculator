# Fitspo — Complete Fitness Platform

A comprehensive fitness ecosystem that provides personalized exercise recommendations, intelligent workout planning, nutrition tracking, progress visualization, and multi-user management based on each user's unique body composition and fitness goals.

## 🚀 Features

### 📱 Fitspo App (Coming Soon)
- **iOS Mobile App**: Comprehensive fitness companion coming soon to iOS
- **Personalized Workout Plans**: AI-powered workout plans tailored to your fitness level and available equipment
- **Smart Progress Tracking**: Advanced analytics and visualizations for tracking your fitness journey
- **Community Features**: Connect with like-minded fitness enthusiasts and stay motivated
- **Offline Support**: Full functionality even without internet connection
- **Seamless Sync**: Automatic synchronization with your web account

### 💪 Ideal Exercise Weight Calculator
- **Personalized Calculations**: Get precise ideal weights for exercises based on your:
  - Body composition (weight, height, skeletal muscle mass, body fat percentage)
  - Experience level (beginner to elite categories)
  - Age and gender factors
  - Muscle group involvement and exercise difficulty
- **Interactive Body Visualizer**: Visual muscle group highlighting with hover effects
- **Real-time Adjustments**: Fine-tune weights with percentage adjustments
- **Progress Tracking**: Chart your exercise performance trends over time

### 🏋️ Exercise Library
- **Comprehensive Database**: Over 500 exercises with detailed muscle involvement data
- **Smart Filtering**: Search by muscle groups, workout types, or custom criteria
- **Video Tutorials**: YouTube integration for exercise demonstrations (Premium feature)
- **Custom Exercises**: Create and manage your own exercises with personalized weight factors
- **Usage Analytics**: Track which exercises you use most and view workout statistics

### 📅 Workout Planning & Calendar
- **Advanced Calendar Integration**: Full two-way sync with Google Calendar including events, reminders, and fitness tracking
- **Interactive Calendar View**: Schedule-X powered calendar with drag-and-drop workout planning
- **Smart Reminders**: Automatic fitness reminders and workout notifications in Google Calendar
- **Template System**: Create reusable workout templates with customizable sets, reps, and rest times
- **Workout Spaces**: Organize exercises by equipment availability and location (see below)
- **Progress Logging**: Comprehensive workout tracking with completion rates and performance analytics
- **Cross-Platform Sync**: Seamless synchronization across web and mobile platforms

### 🏭 Workout Spaces Management
- **Equipment Organization**: Create and manage workout spaces based on available equipment
- **Location-Based Planning**: Organize exercises by gym location, home setup, or travel equipment
- **Smart Equipment Mapping**: Associate specific exercises with available equipment in each space
- **Space Templates**: Save and reuse equipment configurations across different locations
- **Availability Tracking**: Real-time tracking of equipment availability and usage
- **Cross-Space Sync**: Automatic synchronization of spaces across devices (Premium feature)
- **Equipment Categories**: Organize equipment by type, muscle group, and exercise compatibility

### 🎯 Fitness Goal Tracking
- **Interactive Progress Visualization**: Dynamic 3D orb that changes color and intensity based on goal progress
- **Multi-Pillar Tracking**: Monitor food intake, water consumption, sleep quality, and exercise performance
- **Personalized Fitness Plans**: Create and manage comprehensive fitness goals with automatic progress calculation
- **Real-time Sync**: Automatic synchronization of fitness logs and progress data
- **Goal Achievement Milestones**: Visual progress tracking with achievement celebrations
- **Cross-Device Continuity**: Seamless progress tracking across all your devices

### 🥗 Nutrition Management
- **Comprehensive Ingredient Database**: Extensive food database with macronutrients, micronutrients, and caloric information
- **Advanced Recipe Builder**: Create custom recipes with automatic nutritional calculations and portion scaling
- **Ingredient Multi-Add System**: Efficient bulk ingredient addition for recipe creation
- **Recipe Cards Interface**: Beautiful, organized display of recipes with nutritional breakdowns
- **Meal Planning & Tracking**: Organize meals and monitor nutritional intake throughout the day
- **Macro & Micronutrient Tracking**: Detailed monitoring of protein, carbs, fat, vitamins, and minerals
- **Recipe Management**: Browse, search, and organize personal and community recipes
- **Nutritional Analytics**: Track dietary patterns and nutritional goals over time

### 👥 Multi-User Support
- **Managed User System**: Comprehensive client and family member management for trainers and households
- **Individual Body Profiles**: Separate body metrics, fitness goals, and progress tracking for each user
- **Seamless User Switching**: Instant switching between user profiles with preserved data integrity
- **Role-Based Access**: Different permission levels for personal users, clients, and managed family members
- **Personalized Recommendations**: AI-powered suggestions tailored to each user's unique profile
- **Progress Analytics**: Individual progress tracking and comparative analytics across multiple users
- **Data Privacy**: Secure isolation of user data with proper access controls

### 🚀 Smart Onboarding System
- **Guided Setup Process**: Step-by-step onboarding with visual progress tracking
- **Dependency Management**: Intelligent step ordering based on feature dependencies
- **Real-time Validation**: Automatic completion detection and status updates
- **Interactive Visualizations**: Animated beams connecting related setup steps
- **Progress Persistence**: Resume onboarding from where you left off
- **Completion Rewards**: Achievement celebrations when setup is complete

### 💳 Subscription Tiers
- **Free Tier**: Basic weight calculator and limited exercise library
- **Personal Tier**: Full access to all features, cloud sync, and Google Calendar integration
- **Trainer Tier**: Advanced analytics, client management, and priority support

## 🛠️ Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI Framework**: Tailwind CSS, shadcn/ui components, Radix UI primitives
- **Backend**: Supabase (PostgreSQL, Authentication, Storage, Real-time subscriptions)
- **Payments**: Stripe integration with webhooks
- **Charts & Visualization**: Recharts for analytics, React Three Fiber for 3D graphics
- **Calendar System**: Schedule-X with drag-and-drop, Google Calendar API integration
- **State Management**: React hooks, context, and custom state management
- **Animation & Motion**: Motion library for smooth animations and transitions
- **Data Tables**: TanStack Table for advanced data manipulation
- **Drag & Drop**: @dnd-kit for interactive workout planning
- **Form Handling**: React Hook Form with Zod validation
- **Authentication**: Supabase Auth with social login providers
- **Real-time Sync**: Custom sync service for cross-device data synchronization
- **Video Integration**: YouTube API for exercise tutorials

## 🎯 Core Algorithm

The platform uses a sophisticated algorithm to calculate ideal exercise weights:

```
Ideal Weight = Skeletal Muscle Mass × Gender Factor × Age Factor × Experience Factor × Body Fat Factor × Height Factor × Exercise Difficulty Factor
```

**Factors considered:**
- Gender differences in muscle distribution
- Age-related strength decline
- Experience progression (Cat I-V)
- Body fat impact on performance
- Height variations in leverage
- Exercise-specific muscle involvement

## 📊 Data Sources

- **Exercise Database**: Curated from fitness research and expert recommendations
- **Muscle Involvement**: Based on biomechanical studies and expert consensus
- **Nutritional Data**: Comprehensive food composition databases
- **Video Content**: YouTube API integration for tutorial videos

## 🔒 Privacy & Security

- End-to-end encrypted data storage
- Secure authentication via Supabase Auth
- GDPR compliant data handling
- Optional local storage for offline use

## 🚀 Getting Started

1. **Sign Up**: Create your account and select your subscription tier
2. **Guided Onboarding**: Follow our intelligent setup wizard that guides you through:
   - Creating your user profile with body metrics
   - Setting up workout spaces and equipment
   - Building your first workout template
   - Connecting Google Calendar (optional)
   - Creating personalized fitness goals
3. **Start Training**: Begin with personalized workout recommendations and progress tracking
4. **Monitor Progress**: Use the interactive fitness orb and detailed analytics to track your journey

## 💡 Use Cases

- **Individual Fitness**: Personal training and progress tracking
- **Gym Owners**: Equipment planning and member management
- **Personal Trainers**: Client progress monitoring and workout customization
- **Athletes**: Performance optimization and training periodization
- **Fitness Enthusiasts**: Evidence-based workout planning

## 🎨 User Experience

- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Dark/Light Themes**: Automatic system theme detection
- **Intuitive Navigation**: Clean, modern interface with collapsible sidebars
- **Real-time Feedback**: Instant calculations and visual feedback
- **Progressive Enhancement**: Works offline with local storage fallback

---

**Fitspo** empowers users to make data-driven fitness decisions, combining scientific research with modern technology to optimize workout effectiveness and track meaningful progress.
