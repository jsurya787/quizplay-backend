const { MongoClient } = require('mongodb');
require('dotenv').config();

async function run() {
  const uri = process.env.MONGO_URI ?? 'mongodb://localhost:27017/quizplay';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();
    await db.collection('users').dropIndex('authProvider_1');
    console.log('✅ authProvider_1 index dropped');
  } catch (err) {
    if (err.codeName === 'IndexNotFound') {
      console.log('✅ authProvider_1 index is already dropped or does not exist');
    } else {
      console.error('❌ Error dropping index:', err);
    }
  } finally {
    await client.close();
  }
}

run().catch(console.error);
