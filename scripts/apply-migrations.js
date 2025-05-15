#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Applying custom migrations...');
  
  // Get all migration SQL files
  const migrationsDir = path.join(__dirname, '..', 'prisma', 'migrations');
  
  // Read the add_ollama_model_details.sql file
  const filePath = path.join(__dirname, '..', 'prisma', 'migrations', 'add_ollama_model_details.sql');
  if (fs.existsSync(filePath)) {
    console.log(`Applying migration from ${filePath}`);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // Split into statements and execute them
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      try {
        await prisma.$executeRawUnsafe(statement);
        console.log('Statement executed successfully');
      } catch (error) {
        // Ignore errors about table already existing
        if (error.message.includes('already exists')) {
          console.log('Table already exists, skipping...');
        } else {
          console.error('Error executing statement:', error);
          throw error;
        }
      }
    }
  } else {
    console.log('No migration file found');
  }
  
  console.log('Custom migrations applied successfully');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('Error during migration:', e);
    await prisma.$disconnect();
    process.exit(1);
  }); 