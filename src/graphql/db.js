import knex from 'knex';

import R from 'ramda';

const db = knex({
  dialect: 'sqlite3',
  connection: { filename: './db.sqlite3' },
});
db.schema
  .createTableIfNotExists('gallery', table => {
    table.integer('id').primary();
    table.boolean('dismissed');
  })
  .then();

export default db;

export const upsert = ({ table, object, key }) =>
  db.transaction(async trx => {
    const selector = { [key]: object[key] };
    const query = trx(table).where(selector);
    if (await query.clone().first()) {
      const objectWithoutKey = R.dissoc('key', object);
      if (await query.clone().update(objectWithoutKey)) {
        return query.clone().first();
      }
    }
    if (await trx(table).insert(object)) {
      return query.clone().first();
    }
    return new Error('???');
  });
