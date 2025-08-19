# Exercise Library Feature Documentation

## Overview

The Exercise Library is a comprehensive feature that allows users to browse existing exercises and create/manage their own custom exercises. The system supports different user tiers with varying levels of functionality.

## Features

### 1. Exercise Categorization and Display
- **Exercise Grid**: Displays exercises in a responsive card layout
- **Search Functionality**: Real-time search across exercise names, descriptions, and muscle groups
- **Category Filtering**: Filter exercises by muscle groups and workout types using tabs
- **Exercise Details**: Each exercise card shows:
  - Name and description
  - Muscle groups targeted
  - Workout types
  - Weight factor for calculations
  - Custom badge for user-created exercises

### 2. User Tier-Based Exercise Management

#### Free Tier Users
- View all built-in exercises from the exercise database
- Create custom exercises saved locally in browser localStorage
- Edit and delete their local custom exercises
- Data persists only on the current device/browser

#### Personal & Trainer Tier Users
- All Free tier features
- Custom exercises automatically synced to Supabase database
- Access custom exercises across multiple devices
- Fallback to local storage if Supabase is unavailable

### 3. Exercise Data Structure

The system combines data from three JSON files:
- `exercises_meta.json`: Basic exercise information (name, description)
- `exercises_training_data.json`: Training-specific data (muscle groups, weight factors, muscle involvement)
- `exercises_workout_types.json`: Workout categorization data

## Technical Implementation

### Components Used
- **UI Components**: Card, Button, Badge, Input, Tabs, Dialog from the design system
- **Icons**: Lucide React icons (Plus, Search, Edit2, Trash2, Dumbbell, Target, Activity)
- **State Management**: React hooks (useState, useEffect, useMemo, useCallback)

### Key Functions

#### Exercise Loading
```typescript
loadExercises() // Loads and combines built-in exercise data
loadCustomExercisesFromLocal() // Loads custom exercises from localStorage
loadCustomExercisesFromSupabase() // Loads custom exercises from database
```

#### Exercise Management
```typescript
handleSaveExercise() // Saves new or edited custom exercise
handleDeleteExercise() // Deletes custom exercise
handleEditExercise() // Opens edit dialog with exercise data
```

#### Data Persistence
- **Local Storage**: Uses `custom-exercises` key in localStorage
- **Database**: Uses `custom_exercises` table in Supabase with RLS policies

### Database Schema

The `custom_exercises` table includes:
- `id`: Unique identifier
- `user_id`: Foreign key to auth.users
- `name`: Exercise name
- `description`: Exercise description
- `muscle_groups`: JSONB array of targeted muscle groups
- `workout_types`: JSONB array of workout categories
- `base_weight_factor`: Decimal for weight calculations
- `muscle_involvement`: JSONB object for detailed muscle involvement
- Timestamps and RLS policies for security

## User Experience

### Stats Dashboard
Three key metrics displayed at the top:
- Total Exercises: Count of built-in exercises
- Custom Exercises: Count of user's custom exercises
- Muscle Groups: Number of unique muscle groups covered

### Search and Filter
- **Real-time Search**: Searches across name, description, and muscle groups
- **Category Tabs**: Dynamic tabs generated from actual exercise data
- **Responsive Design**: Works across desktop, tablet, and mobile devices

### Exercise Creation/Editing
- **Modal Dialog**: Clean, focused interface for exercise creation
- **Form Validation**: Ensures required fields are filled
- **Tier-Aware Messaging**: Different save behavior messaging based on user tier
- **Error Handling**: Graceful fallback to local storage if database fails

## Error Handling

### Network Issues
- Automatic fallback to localStorage for paid users if Supabase is unavailable
- Console logging for debugging database connection issues

### Data Validation
- Client-side validation for required fields
- Type safety with TypeScript interfaces
- Graceful handling of malformed data

### User Feedback
- Loading states with skeleton UI
- Clear messaging about data persistence (local vs. synced)
- Empty states with helpful call-to-action buttons

## Setup Instructions

### 1. Database Setup
Run the SQL script in `custom_exercises_table.sql` to create the necessary table and policies:

```sql
-- Execute the SQL file in your Supabase SQL editor
-- This creates the table, indexes, RLS policies, and triggers
```

### 2. Environment Variables
Ensure these environment variables are set:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. User Tier Detection
The system relies on the `useUserTier` hook which checks:
- User authentication status
- Plan information from user metadata
- Fallback to localStorage for plan detection

## Future Enhancements

### Potential Features
1. **Exercise Import/Export**: Allow users to share custom exercises
2. **Exercise Templates**: Pre-built exercise collections for specific goals
3. **Advanced Filtering**: Filter by equipment, difficulty level, etc.
4. **Exercise Videos**: Integration with YouTube API for demonstration videos
5. **Muscle Group Visualization**: Interactive body diagram for exercise selection
6. **Exercise Analytics**: Track most used exercises, muscle group balance
7. **Community Sharing**: Allow trainers to share exercises with clients

### Performance Optimizations
1. **Lazy Loading**: Load exercises as user scrolls
2. **Search Debouncing**: Reduce search API calls
3. **Data Caching**: Cache exercise data for faster subsequent loads
4. **Image Optimization**: Add exercise images with Next.js Image component

## Troubleshooting

### Common Issues

**Custom exercises not saving**
- Check browser localStorage quota
- Verify Supabase connection for paid users
- Check console for error messages

**Search not working**
- Ensure search term is properly trimmed
- Check if exercises data has loaded completely

**Categories not showing**
- Verify exercise data includes muscle groups and workout types
- Check if data files are accessible in public folder

### Debug Mode
Enable debug logging by setting:
```javascript
localStorage.setItem('debug-exercise-library', 'true')
```

This will provide additional console logging for troubleshooting.
