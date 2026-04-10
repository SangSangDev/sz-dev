const mysql = require('mysql2/promise');
async function run() {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'szdev_user',
      password: 'szdev_password',
      database: 'szdev'
    });
    await conn.query('ALTER TABLE T_MENU ADD COLUMN board_sort INT DEFAULT 0;');
    console.log('Success');
    await conn.end();
  } catch (e) {
    console.error(e);
  }
}
run();
