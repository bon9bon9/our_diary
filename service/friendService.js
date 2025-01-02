const conn = require('../mariadb');
const { resJson,
  resDataJson,
  resSuccessJson,
  getPaginateInfo,
  emogiTest,
  setValueNull,
  setUpdateSet,
  resBadRequest,
  getDateString
} = require('../common');

const insertFriend = async (body, user_idx, gr_idx ) => {
  let frColumn = [`fr_nickname`, `fr_color`, `fr_emogi`];
  let frValue = setValueNull(body, frColumn);
  frColumn = frColumn.concat([`fr_display`, `fr_state`, `user_idx`, `groups_idx`]);
  frValue = frValue.concat([1, 1, user_idx , gr_idx]);
  let frInsertSql = `INSERT INTO friend(${frColumn}) VALUES (?)`;
  await conn.promise().query(frInsertSql, [frValue]);
}

module.exports = {
  insertFriend
}