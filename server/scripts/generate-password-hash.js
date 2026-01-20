#!/usr/bin/env node

import bcrypt from 'bcryptjs';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function generateHash() {
  rl.question('Enter the password you want to hash: ', async (password) => {
    if (!password) {
      console.log('Error: Password cannot be empty');
      rl.close();
      return;
    }

    try {
      const saltRounds = 10;
      const hash = await bcrypt.hash(password, saltRounds);
      
      console.log('\n✓ Password hash generated successfully!');
      console.log('\nAdd this to your .env file:');
      console.log(`AUTH_PASSWORD_HASH=${hash}`);
      console.log('\nFull example .env configuration:');
      console.log('AUTH_USERNAME=user');
      console.log(`AUTH_PASSWORD_HASH=${hash}`);
      console.log('AUTH_EMAIL=user@healthtracker.local');
      console.log('AUTH_DISPLAY_NAME=Health Tracker User');
      console.log('\n⚠️  Keep this hash secret and secure!');
      
    } catch (error) {
      console.error('Error generating hash:', error);
    }
    
    rl.close();
  });
}

console.log('🔐 Health Tracker Password Hash Generator');
console.log('=========================================\n');
generateHash();