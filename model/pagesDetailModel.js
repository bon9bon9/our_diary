const conn = require('../mariadb');

const getLastPageDetail = async (diary_idx) => {
  let sql = `SELECT pd.*, pa.user_idx, di.di_total_members, di.di_total_cycle FROM pages_detail AS pd
  INNER JOIN pages AS pa ON pd.pages_idx = pa.pa_idx
  INNER JOIN diary AS di ON pd.diary_idx = di.di_idx
  WHERE diary_idx = ? AND pd_state = 0 ORDER BY pd_seq DESC LIMIT 1`;
  const [page_detail] = await conn.promise().query(sql, [diary_idx]);
  return page_detail[0];
}


module.exports = {
  getLastPageDetail
}