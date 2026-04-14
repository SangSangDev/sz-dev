const mysql = require('mysql2/promise');
async function run() {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'szdev_user',
      password: 'szdev_password',
      database: 'szdev'
    });
    await conn.query(`UPDATE T_MENU m JOIN T_USER u ON m.created_by = u.user_id SET m.created_by = u.user_no;`);
    console.log('Success');
    await conn.end();
  } catch (e) {
    console.error(e);
  }
}
run();
