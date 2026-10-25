require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: SUPABASE_URL or SUPABASE_ANON_KEY is missing.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('🔄 Connecting to Supabase...');
  const { error } = await supabase.from('CUSTOMER').select('*').limit(1);
  if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
    console.error('❌ Connection Error:', error.message);
  } else {
    console.log('✅ Successfully connected to Supabase Database!');
  }
}

testConnection();