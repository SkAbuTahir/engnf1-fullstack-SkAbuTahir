/* Usage: node scripts/indexes.js drop|sync
   drop = remove the secondary ticket indexes (for the "before" latency run); sync = rebuild them (for "after"). */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Ticket = require('../models/Ticket');

(async () => {
  const mode = process.argv[2];
  await mongoose.connect(process.env.MONGODB_URI);
  if (mode === 'drop') {
    for (const idx of await Ticket.collection.indexes()) {
      if (idx.name !== '_id_' && !idx.unique) { await Ticket.collection.dropIndex(idx.name); console.log('dropped', idx.name); }
    }
  } else if (mode === 'sync') {
    await Ticket.createIndexes();
    console.log('indexes:', (await Ticket.collection.indexes()).map((i) => i.name).join(', '));
  } else {
    console.log('usage: node scripts/indexes.js drop|sync');
  }
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
