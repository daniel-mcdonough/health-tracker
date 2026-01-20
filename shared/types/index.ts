// Shared types for the Health Tracker application

export interface User {
  id: number;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface SymptomCategory {
  id: number;
  userId: number;
  name: string;
  description?: string;
  color: string;
  isDefault: boolean;
  createdAt: string;
}

export interface Symptom {
  id: number;
  userId: number;
  categoryId: number;
  name: string;
  description?: string;
  createdAt: string;
  category?: SymptomCategory;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface SymptomLog {
  id: number;
  userId: number;
  symptomId: number;
  severity: number; // 1-10
  time: string; // HH:MM format
  notes?: string;
  loggedAt: string;
  date: string;
  symptom?: Symptom;
}

export interface Food {
  id: number;
  userId?: number;
  name: string;
  category?: string;
  commonAllergens?: string[];
  description?: string;
  isCustom: boolean;
  createdAt: string;
}

export interface Meal {
  id: number;
  userId: number;
  mealType: MealType;
  mealTime: string;
  notes?: string;
  date: string;
  createdAt: string;
  foods?: MealFood[];
}

export interface MealFood {
  id: number;
  mealId: number;
  foodId: number;
  portionSize?: string;
  portionGrams?: number;
  preparationMethod?: string;
  food?: Food;
}

export interface FoodSymptomCorrelation {
  id: number;
  userId: number;
  foodId: number;
  symptomId: number;
  correlationScore: number; // -1 to 1
  confidenceLevel: number; // 0 to 1
  sampleSize: number;
  timeWindowHours: number;
  lastCalculated: string;
  food?: Food;
  symptom?: Symptom;
}

export interface UserSettings {
  id: number;
  userId: number;
  timezone: string;
  reminderEnabled: boolean;
  reminderTimes: string[];
  correlationSensitivity: number;
  dataRetentionDays: number;
  createdAt: string;
  updatedAt: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Request types
export interface CreateSymptomLogRequest {
  symptomId: number;
  severity: number;
  time: string; // HH:MM format
  notes?: string;
  date: string;
}

export interface CreateMealRequest {
  mealType: MealType;
  mealTime: string;
  notes?: string;
  date: string;
  foods: {
    foodId: number;
    portionSize?: string;
    portionGrams?: number;
    preparationMethod?: string;
  }[];
}

export interface CreateSymptomRequest {
  categoryId: number;
  name: string;
  description?: string;
}

export interface CreateFoodRequest {
  name: string;
  category?: string;
  commonAllergens?: string[];
  description?: string;
}

// Chart/Analytics types
export interface SymptomTrendData {
  date: string;
  symptomName: string;
  averageSeverity: number;
  logCount: number;
}

export interface CorrelationChartData {
  foodName: string;
  symptomName: string;
  correlationScore: number;
  confidenceLevel: number;
  sampleSize: number;
}

export interface BowelMovement {
  id: number;
  userId: number;
  date: string;
  time: string;
  bristolScale: number; // 1-7 Bristol Stool Scale
  color: 'brown' | 'yellow' | 'green' | 'black' | 'red' | 'pale' | 'clay';
  size: 'small' | 'medium' | 'large';
  urgency?: number; // 1-5 scale
  easeOfPassage?: number; // 1-5 scale
  bloodPresent: boolean;
  mucusPresent: boolean;
  notes?: string;
  loggedAt: string;
}

export interface CreateBowelMovementRequest {
  date: string;
  time: string;
  bristolScale: number;
  color: 'brown' | 'yellow' | 'green' | 'black' | 'red' | 'pale' | 'clay';
  size: 'small' | 'medium' | 'large';
  urgency?: number;
  easeOfPassage?: number;
  bloodPresent: boolean;
  mucusPresent: boolean;
  notes?: string;
}

export interface DailyLogSummary {
  date: string;
  symptomsLogged: number;
  mealsLogged: number;
  bowelMovements: number;
  averageSeverity: number;
  totalSymptoms: number;
}