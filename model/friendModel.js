const conn = require('../mariadb');

const checkFriend = async (user_idx, groups_idx) => {
  let friendSql = `SELECT * FROM friend AS fr WHERE user_idx = ? AND groups_idx = ?`;
  const [friendRes] = await conn.promise().query(friendSql, [user_idx, groups_idx]);
  return friendRes.length > 0;
}

const getFriendCnt = async (groups_idx) => {
  let cntSql = `SELECT COUNT(*) AS CNT FROM friend AS fr WHERE groups_idx = ? AND fr_state = 1`;
  const [cntRes] = await conn.promise().query(cntSql, [groups_idx]);
  return cntRes[0].CNT;
}


module.exports = {
  checkFriend,
  getFriendCnt
}