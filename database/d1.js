// Gives a node:sqlite database the subset of the D1 API that cloudflare/ordersApi.js uses.
export function d1(db) {
  const prepare = sql => {
    const statement = (params) => ({
      run: async () => ({ meta: { changes: Number(db.prepare(sql).run(...params).changes) } }),
      first: async () => db.prepare(sql).get(...params) ?? null,
      all: async () => ({ results: db.prepare(sql).all(...params) }),
      execute: () => db.prepare(sql).run(...params)
    });
    return { ...statement([]), bind: (...params) => statement(params) };
  };
  return {
    prepare,
    async batch(statements) {
      db.exec('BEGIN IMMEDIATE');
      try {
        for (const statement of statements) statement.execute();
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    }
  };
}
