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
const { updateGroupsInvite, findGroupsByIdx } = require('../model/groupsModel');
const { findDiaryByIdx } = require('../model/diaryModel');
const { getFriendCnt } = require('../model/friendModel');
const { insertFriend } = require('./friendService');
const { getLastPageDetail } = require('../model/pagesDetailModel');
const { StatusCodes } = require('http-status-codes');
const requestDoc = require('../requests');

const getADoneButBYetDiary = async (A, B, user_idx, groups_idx = undefined) => {
  let addSql = '';
  let addWhereSql = '';
  if(A != 'end'){
    addSql = `AND done_log.user_idx = ${user_idx}`;
  }
  if(groups_idx){
    addWhereSql = `AND gr.gr_idx = ${groups_idx}`;
  }
  let listSql = `SELECT gr.*, fr.*, di.*, done_log.dl_idx, done_log.dl_date as done_log_date, sender.user_idx AS sender_idx, sender.fr_nickname AS sender_nickname FROM groups AS gr
    INNER JOIN friend AS fr ON gr.gr_idx = fr.groups_idx AND fr.user_idx = ${user_idx}
    INNER JOIN diary AS di ON gr.gr_idx = di.groups_idx
    INNER JOIN diary_log AS done_log ON di.di_idx = done_log.diary_idx AND done_log.dl_type = '${A}' ${addSql}
    LEFT JOIN diary_log AS yet_log ON di.di_idx = yet_log.diary_idx AND yet_log.dl_type = '${B}' AND yet_log.user_idx = ${user_idx} AND done_log.dl_page_seq = yet_log.dl_page_seq
    LEFT JOIN diary_log AS send_log ON di.di_idx = send_log.diary_idx AND send_log.dl_type = 'send' AND send_log.dl_page_seq = done_log.dl_page_seq - 1
    LEFT JOIN friend AS sender ON send_log.user_idx = sender.user_idx AND sender.groups_idx = di.groups_idx
    WHERE yet_log.dl_idx IS NULL ${addWhereSql}
    `;
  const [list] = await conn.promise().query(listSql);
  return list;
}


module.exports = {
  getADoneButBYetDiary
}


