import pg from 'pg';

const { Client } = pg;

// Quick setup script with common passwords
const commonPasswords = ['postgres', 'admin', '123456', 'password', ''];

const testConnection = async (password) => {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: password,
    database: 'postgres'
  });

  try {
    await client.connect();
    console.log(`✅ Connection successful with password: "${password}"`);
    await client.end();
    return true;
  } catch (error) {
    console.log(`❌ Failed with password: "${password}"`);
    return false;
  }
};

const quickSetup = async () => {
  console.log('🔍 Testing common PostgreSQL passwords...\n');
  
  for (const password of commonPasswords) {
    const success = await testConnection(password);
    if (success) {
      console.log(`\n🎉 Found working password: "${password}"`);
      console.log('\n📝 Update your .env file:');
      console.log(`DB_PASSWORD=${password}`);
      console.log('\n🚀 Then run: npm run setup-db');
      return;
    }
  }
  
  console.log('\n❌ None of the common passwords worked.');
  console.log('\n💡 Please check the reset-postgres-password.md file for detailed instructions.');
  console.log('\n🔧 Or try these commands:');
  console.log('1. Open Services.msc');
  console.log('2. Find "PostgreSQL" service');
  console.log('3. Right-click → Restart');
  console.log('4. Try running this script again');
};

quickSetup();