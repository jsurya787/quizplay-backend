import { connect } from 'mongoose';
import { config } from 'dotenv';

config(); // load .env if present

async function run() {
  const uri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/quizplay';
  const connection = await connect(uri);
  const db = connection.connection.db!;
  try {
    await db.collection('users').dropIndex('authProvider_1');
    console.log('✅ authProvider_1 index dropped');
  } catch (err) {
    console.error('❌ Error dropping index (maybe it does not exist):', err);
  }
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
