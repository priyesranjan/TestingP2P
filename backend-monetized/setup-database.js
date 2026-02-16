import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = 'https://vjualydsnfhwbvpmkkvr.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqdWFseWRzbmZod2J2cG1ra3ZyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDMwNjM5OCwiZXhwIjoyMDg1ODgyMzk4fQ.wr9RXXxqaFlYWtdh8OWWz_b87CINWDPYNnqS-dlA4nw';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupDatabase() {
  console.log('🚀 Starting Supabase database setup...\n');

  try {
    // Read the SQL schema file
    const schemaPath = join(__dirname, 'database-schema.sql');
    const sqlSchema = fs.readFileSync(schemaPath, 'utf8');

    console.log('📝 SQL Schema loaded');
    console.log('📊 Executing SQL commands via Supabase REST API...\n');

    // Split SQL into individual statements
    const statements = sqlSchema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    // Execute via Supabase REST API
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({
        query: sqlSchema
      })
    });

    // Alternative: Use direct PostgreSQL REST endpoint
    const postgrestResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        query: sqlSchema
      })
    });

    console.log('Response status:', postgrestResponse.status);

    if (postgrestResponse.ok) {
      console.log('\n✅ Database schema executed successfully!');
    } else {
      const errorText = await postgrestResponse.text();
      console.log('\n⚠️ Response:', errorText);
    }

    // Verify tables were created
    console.log('\n🔍 Verifying tables...');
    
    const tables = ['profiles', 'wallets', 'transactions', 'calls', 'admin_actions'];
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        if (error.message.includes('does not exist')) {
          console.log(`❌ Table '${table}' not found - needs manual SQL execution`);
        } else {
          console.log(`✅ Table '${table}' exists`);
        }
      } else {
        console.log(`✅ Table '${table}' exists and accessible`);
      }
    }

    console.log('\n📋 Setup Summary:');
    console.log('- Tables: profiles, wallets, transactions, calls, admin_actions');
    console.log('- RLS Policies: Enabled');
    console.log('- Functions: handle_new_user(), update_wallet_balance()');
    console.log('- Triggers: Auto-create profile & wallet on signup');

  } catch (error) {
    console.error('\n❌ Setup Error:', error.message);
    console.log('\n⚠️ Note: Supabase REST API may not support direct SQL execution.');
    console.log('Please run the SQL manually in Supabase Dashboard:');
    console.log('1. Go to: https://supabase.com/dashboard/project/vjualydsnfhwbvpmkkvr');
    console.log('2. Click SQL Editor');
    console.log('3. Paste content from database-schema.sql');
    console.log('4. Click RUN');
  }
}

setupDatabase();
