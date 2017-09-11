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

export const upsert = async ({ table, object, key }) => {
  const preexistingRow = await db(table)
    .where({ [key]: object[key] })
    .first();
  if (preexistingRow) {
    const objectWithoutKey = R.dissoc('key', object);
    const rowUpdateStatus = await db(table)
      .where({ [key]: object[key] })
      .update(objectWithoutKey);
    if (rowUpdateStatus) {
      const updatedRow = await db(table)
        .where({ [key]: object[key] })
        .first();
      return updatedRow;
    }
    throw Error("Didn't manage to update for whatever reason.");
  } else {
    const rowInsertStatus = await db(table).insert(object);
    if (rowInsertStatus) {
      const insertedRow = await db(table)
        .where({ [key]: object[key] })
        .first();
      return insertedRow;
    }
    throw Error("Didn't manage to insert for whatever reason.");
  }
};
