# Fitspo — Fitness Calculator

A comprehensive fitness platform that provides personalized exercise recommendations, workout planning, and nutrition tracking based on your unique body composition and fitness goals.

## 🚀 Features

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
- **Calendar Integration**: Sync workouts with Google Calendar
- **Template System**: Create reusable workout templates
- **Workout Spaces**: Organize exercises by equipment or location availability
- **Progress Logging**: Record completed workouts and track completion rates

### 🥗 Nutrition Management
- **Ingredient Database**: Track macronutrients and calories for various foods
- **Recipe Builder**: Create custom recipes with nutritional calculations
- **Meal Planning**: Organize meals and track nutritional intake
- **Macro Tracking**: Monitor protein, carbs, and fat consumption

### 👥 Multi-User Support
- **User Switching**: Manage multiple users (family members, clients)
- **Personalized Profiles**: Individual body metrics and preferences
- **Tier Management**: Different access levels for various user types

### 💳 Subscription Tiers
- **Free Tier**: Basic weight calculator and limited exercise library
- **Personal Tier**: Full access to all features, cloud sync, and Google Calendar integration
- **Trainer Tier**: Advanced analytics, client management, and priority support

## 🛠️ Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI Framework**: Tailwind CSS, shadcn/ui components
- **Backend**: Supabase (PostgreSQL, Authentication, Storage)
- **Payments**: Stripe integration
- **Charts**: Recharts for data visualization
- **3D Graphics**: React Three Fiber for body visualization
- **Calendar**: Schedule-X for workout planning
- **State Management**: React hooks and context

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
2. **Body Metrics**: Input your height, weight, body fat percentage, and skeletal muscle mass
3. **Experience Level**: Select your training experience category
4. **Calculate**: Get personalized ideal weights for any exercise
5. **Track Progress**: Log your workouts and monitor improvements

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
