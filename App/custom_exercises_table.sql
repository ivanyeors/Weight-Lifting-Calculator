-- Custom Exercises Table for Exercise Library
-- This table stores user-created custom exercises for Personal and Trainer tier users

CREATE TABLE IF NOT EXISTS custom_exercises (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  muscle_groups JSONB DEFAULT '[]'::jsonb,
  workout_types JSONB DEFAULT '[]'::jsonb,
  base_weight_factor DECIMAL(3,2) DEFAULT 1.0,
  muscle_involvement JSONB DEFAULT '{}'::jsonb,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_custom_exercises_user_id ON custom_exercises(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_exercises_name ON custom_exercises(name);
CREATE INDEX IF NOT EXISTS idx_custom_exercises_muscle_groups ON custom_exercises USING GIN(muscle_groups);
CREATE INDEX IF NOT EXISTS idx_custom_exercises_workout_types ON custom_exercises USING GIN(workout_types);

-- Enable Row Level Security (RLS)
ALTER TABLE custom_exercises ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only access their own custom exercises
CREATE POLICY "Users can view their own custom exercises" ON custom_exercises
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own custom exercises" ON custom_exercises
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own custom exercises" ON custom_exercises
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom exercises" ON custom_exercises
  FOR DELETE USING (auth.uid() = user_id);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_custom_exercises_updated_at
  BEFORE UPDATE ON custom_exercises
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON custom_exercises TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
