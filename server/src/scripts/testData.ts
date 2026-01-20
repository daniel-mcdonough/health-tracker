import { database } from '../database/init.js';

/**
 * Generate test data for correlation analysis
 * This creates realistic symptom and food data to test the correlation algorithms
 */
export async function generateTestData(): Promise<void> {
  const db = database.getDatabase();
  
  try {
    console.log('Generating test data...');

    // Create a test user
    await new Promise<void>((resolve, reject) => {
      db.run(
        `INSERT OR IGNORE INTO users (id, email, name, password_hash) 
         VALUES (1, 'test@example.com', 'Test User', 'hashed-password')`,
        (err) => err ? reject(err) : resolve()
      );
    });

    // Copy default categories and symptoms for the test user
    await new Promise<void>((resolve, reject) => {
      db.run(`
        INSERT OR IGNORE INTO symptom_categories (user_id, name, description, color, is_default)
        SELECT 1, name, description, color, is_default FROM symptom_categories WHERE user_id = 0
      `, (err) => err ? reject(err) : resolve());
    });

    await new Promise<void>((resolve, reject) => {
      db.run(`
        INSERT OR IGNORE INTO symptoms (user_id, category_id, name, description)
        SELECT 1, 
               (SELECT id FROM symptom_categories WHERE name = 
                (SELECT name FROM symptom_categories sc2 WHERE sc2.id = s.category_id) 
                AND user_id = 1), 
               name, description
        FROM symptoms s WHERE user_id = 0
      `, (err) => err ? reject(err) : resolve());
    });

    // Generate 60 days of test data
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 60);

    const symptoms = [
      { id: 1, name: 'Bloating', triggerFoods: [1, 6] }, // Wheat bread, cheese
      { id: 2, name: 'Nausea', triggerFoods: [5, 7] },   // Cow milk, yogurt
      { id: 3, name: 'Stomach Pain', triggerFoods: [1, 5] }, // Wheat bread, cow milk
      { id: 4, name: 'Fatigue', triggerFoods: [1], beneficialFoods: [4] }, // Wheat bread trigger, quinoa beneficial
      { id: 5, name: 'Headache', triggerFoods: [13, 20] }, // Tomatoes, oranges
    ];

    for (let day = 0; day < 60; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + day);
      const dateStr = currentDate.toISOString().split('T')[0];

      // Generate meals for this day
      const meals = [];
      
      // Breakfast
      const breakfastTime = `${currentDate.toISOString().split('T')[0]} 08:00:00`;
      const breakfastFoods = Math.random() > 0.3 ? [1, 5] : [2, 18]; // Often wheat bread + milk, sometimes rice + apple
      
      // Lunch  
      const lunchTime = `${currentDate.toISOString().split('T')[0]} 12:30:00`;
      const lunchFoods = Math.random() > 0.4 ? [8, 13, 14] : [8, 16, 15]; // Chicken + tomatoes/onions vs chicken + broccoli/garlic
      
      // Dinner
      const dinnerTime = `${currentDate.toISOString().split('T')[0]} 18:30:00`;  
      const dinnerFoods = Math.random() > 0.5 ? [9, 1, 6] : [11, 4, 17]; // Beef + bread + cheese vs salmon + quinoa + spinach

      const dayMeals = [
        { type: 'breakfast', time: breakfastTime, foods: breakfastFoods },
        { type: 'lunch', time: lunchTime, foods: lunchFoods },
        { type: 'dinner', time: dinnerTime, foods: dinnerFoods }
      ];

      // Add occasional snacks
      if (Math.random() > 0.6) {
        const snackTime = `${currentDate.toISOString().split('T')[0]} 15:00:00`;
        const snackFoods = [Math.random() > 0.5 ? 6 : 19]; // Cheese or banana
        dayMeals.push({ type: 'snack', time: snackTime, foods: snackFoods });
      }

      // Insert meals
      for (const meal of dayMeals) {
        const mealId = await new Promise<number>((resolve, reject) => {
          db.run(
            `INSERT INTO meals (user_id, meal_type, meal_time, date) VALUES (?, ?, ?, ?)`,
            [1, meal.type, meal.time, dateStr],
            function(err) {
              if (err) reject(err);
              else resolve(this.lastID);
            }
          );
        });

        // Insert meal foods
        for (const foodId of meal.foods) {
          await new Promise<void>((resolve, reject) => {
            db.run(
              `INSERT INTO meal_foods (meal_id, food_id, portion_size) VALUES (?, ?, ?)`,
              [mealId, foodId, '1 serving'],
              (err) => err ? reject(err) : resolve()
            );
          });
        }
      }

      // Generate symptoms based on food triggers
      const dayFoods = dayMeals.flatMap(m => m.foods);
      
      for (const symptom of symptoms) {
        let shouldHaveSymptom = false;
        let baseSeverity = 2;

        // Check for trigger foods
        const triggerCount = symptom.triggerFoods?.filter(foodId => dayFoods.includes(foodId)).length || 0;
        if (triggerCount > 0) {
          shouldHaveSymptom = Math.random() > (0.2 - triggerCount * 0.1); // Higher chance with more triggers
          baseSeverity = 4 + triggerCount * 2;
        }

        // Check for beneficial foods (reduce severity)
        const beneficialCount = symptom.beneficialFoods?.filter(foodId => dayFoods.includes(foodId)).length || 0;
        if (beneficialCount > 0) {
          baseSeverity = Math.max(1, baseSeverity - beneficialCount * 2);
        }

        // Add random baseline symptoms occasionally
        if (!shouldHaveSymptom && Math.random() > 0.8) {
          shouldHaveSymptom = true;
          baseSeverity = 1 + Math.floor(Math.random() * 3);
        }

        if (shouldHaveSymptom) {
          // Generate symptoms for different times of day
          const times = ['09:00', '14:00', '20:00'];
          const numSlots = Math.random() > 0.7 ? 2 : 1; // Sometimes multiple times per day
          
          for (let i = 0; i < numSlots; i++) {
            const time = times[Math.floor(Math.random() * times.length)];
            const severity = Math.min(10, Math.max(1, 
              baseSeverity + Math.floor(Math.random() * 3 - 1) // Add some randomness
            ));

            const logTime = `${dateStr} ${time}:00`;

            await new Promise<void>((resolve, reject) => {
              db.run(
                `INSERT OR IGNORE INTO symptom_logs (user_id, symptom_id, severity, time, date, logged_at) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [1, symptom.id, severity, time, dateStr, logTime],
                (err) => err ? reject(err) : resolve()
              );
            });
          }
        }
      }
    }

    console.log('Test data generated successfully!');
    console.log('- 60 days of meal and symptom data');
    console.log('- Realistic correlations between foods and symptoms');
    console.log('- Ready for correlation analysis testing');

  } catch (error) {
    console.error('Error generating test data:', error);
    throw error;
  }
}

// Run test data generation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateTestData()
    .then(() => {
      console.log('Test data generation completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test data generation failed:', error);
      process.exit(1);
    });
}