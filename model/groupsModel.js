const conn = require('../mariadb');

const updateGroupsInvite = async (idx) => {
  await conn.promise().query(`UPDATE groups SET gr_invite = 0 WHERE gr_idx = ?`, [idx]);
}

const findGroupsByIdx = async (idx) => {
  const [result] = await conn.promise().query(`SELECT * FROM groups WHERE gr_idx = ?`, [idx]);
  return result[0];
}

module.exports = {
  updateGroupsInvite,
  findGroupsByIdx
}