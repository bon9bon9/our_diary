const conn = require('../mariadb');

const findDiaryByIdx = async (idx) => {
  const [result] = await conn.promise().query(`SELECT * FROM diary WHERE di_idx = ?`, [idx]);
  return result[0];
}

module.exports = {
  findDiaryByIdx
}