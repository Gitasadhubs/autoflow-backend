import postgres from 'postgres';
import fs from 'fs';

// This script will run from within Railway where it has access to the internal database
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable not set');
  process.exit(1);
}

console.log('🚀 Starting database dump...');
console.log('DATABASE_URL:', DATABASE_URL.replace(/:[^:@]+@/, ':***@')); // Hide password

try {
  const sql = postgres(DATABASE_URL);

  console.log('✅ Connected to database successfully!');

  // Get all table names
  const tables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `;

  let dump = '';

  for (const { table_name } of tables) {
    console.log(`📄 Dumping table: ${table_name}`);

    // Get CREATE TABLE statement
    const createTable = await sql`
      SELECT
        'CREATE TABLE ' || quote_ident(table_name) || ' (' || string_agg(
          quote_ident(column_name) || ' ' || data_type ||
          CASE
            WHEN character_maximum_length IS NOT NULL THEN '(' || character_maximum_length || ')'
            WHEN numeric_precision IS NOT NULL THEN '(' || numeric_precision || ',' || numeric_scale || ')'
            ELSE ''
          END ||
          CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
          CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END,
          ', '
        ) || ');' as create_stmt
      FROM information_schema.columns
      WHERE table_name = ${table_name} AND table_schema = 'public'
      GROUP BY table_name;
    `;

    if (createTable[0]) {
      dump += createTable[0].create_stmt + '\n\n';
    }

    // Get data
    const data = await sql.unsafe(`SELECT * FROM ${table_name};`);

    if (data.length > 0) {
      const columns = Object.keys(data[0]);
      const values = data.map(row => '(' + columns.map(col => {
        const val = row[col];
        if (val === null) return 'NULL';
        if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
        if (typeof val === 'boolean') return val ? 'true' : 'false';
        return val.toString();
      }).join(', ') + ')').join(',\n');

      dump += `INSERT INTO ${table_name} (${columns.map(c => `"${c}"`).join(', ')}) VALUES\n${values};\n\n`;
    }
  }

  // Write to file
  fs.writeFileSync('database_dump.sql', dump);
  console.log('✅ Database dump created: database_dump.sql');

  await sql.end();

} catch (error) {
  console.error('❌ Dump failed:', error.message);
  process.exit(1);
}
