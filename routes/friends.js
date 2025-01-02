const express = require('express');
const router = express.Router();

const { body, param, query } = require('express-validator');
const conn = require('../mariadb');
const {StatusCodes} = require("http-status-codes");
const requestDoc = require("../requests");

router.use(express.json());

const { resJson,
  resDataJson,
  resSuccessJson,
  getPaginateInfo,
  emogiTest,
  setValueNull,
  setUpdateSet,
} = require('../common');
const { validate, authenticateJWT } = require('../middleWare');
const { findDiaryByIdx } = require('../model/diaryModel');
const { getLastPageDetail } = require('../model/pagesDetailModel');

router.get('/deliver',[
  query("diary_idx").notEmpty().isString(),
  validate,
  authenticateJWT
],async (req,res) => {
  const user_idx = req.user;
  const {diary_idx} = req.query;
  // 1. user가 일기를 적고 전달하는건지 확인
  const page = await getLastPageDetail(diary_idx);
  if(!page || page.user_idx != user_idx){
    //  #swagger.responses[400] = {BadRequest:1}
    return res.status(StatusCodes.BAD_REQUEST).json(resDataJson(requestDoc.BadRequest));
  }
  // 2. 턴 유지인지 다음턴인지 확인 
  // - 다음 턴이면 끝난애 아닌지 확인인
  // - 유지면 이번턴에 아직 안쓴 receiver 인지 확인
  const diary = await findDiaryByIdx(diary_idx);
  let next_turn = true;
  if(!diary.di_total_members) {
    if(page.pd_curr_seq == 1){ // 본인밖에 없을 땐 전달이 아니라 초대해야지
      return res.status(StatusCodes.BAD_REQUEST).json(resDataJson(requestDoc.BadRequest));
    }
  }else{
    if(diary.di_total_members == page.pd_curr_seq){ // 다음 턴
      if(diary.di_total_cycle == page.pd_curr_cycle){ // 전달이 아니라 완료했어야지지
        res.data = {code:StatusCodes.BAD_REQUEST, json:requestDoc.BadRequest};
        return res;
      }
    }else{ // 유지
      next_turn = false;
    }
  }
  let sql = '';
  let value = [];
  if(next_turn){
    // 다음턴이니깐 본인 제외 모든 친구 select
    sql = `SELECT * FROM friend AS fr WHERE fr.groups_idx = ? AND fr.user_idx <> ? and fr.fr_state = 1`;
    value = [diary.groups_idx, user_idx]
  }else{
    // 유지니깐 아직 안한 친구들만 select
    let receivedFriendsSql = `SELECT GROUP_CONCAT(user_idx) AS idxs FROM diary_log AS dl WHERE diary_idx = ? AND dl_type = 'receive' AND dl_curr_cycle = ?`;
    const [receivedFriends] = await conn.promise().query(receivedFriendsSql, [diary.di_idx, page.pd_curr_cycle]);
    sql = `SELECT * FROM friend AS fr WHERE fr.groups_idx = ? AND fr.user_idx NOT IN (${receivedFriends[0].idxs}) AND fr.fr_state = 1`;
    value = [diary.groups_idx]
  }
  const [friends] = await conn.promise().query(sql, value);
  return res.json(resSuccessJson(friends));
});

// 그룹 안에서 나의 정보보
router.get('/my',[
  query("groups_idx").notEmpty().isInt(),
  validate,
  authenticateJWT
],async (req,res) => {
  const user_idx = req.user;
  const {groups_idx} = req.query;
  // 1. user가 일기를 적고 전달하는건지 확인
  let sql = `SELECT * FROM friend AS fr
    INNER JOIN groups AS gr ON fr.groups_idx = gr.gr_idx
    WHERE fr.user_idx = ? AND fr.groups_idx = ?`
  const [result] = await conn.promise().query(sql,[user_idx, groups_idx]);
  return res.json(resSuccessJson(result));
})


router.get('/',[
  query("dir").isIn(['DESC','ASC']).isString(),
  validate,
  authenticateJWT
],(req,res) => {
  req.query.us_idx = req.user;
  const whereClause = friendFilters(inputs);
  let sql = `
  SELECT fr.*,gr.*,CASE
        WHEN MAX(dl.dl_read_date) IS NULL THEN fr.created_at
        ELSE MAX(dl.dl_read_date) END AS order_date
  FROM friend AS fr
  INNER JOIN groups AS gr ON fr.groups_idx = gr.gr_idx
  LEFT JOIN diary AS di on fr.groups_idx = di.groups_idx
  LEFT JOIN diary_log AS dl on di.di_idx = dl.diary_idx AND dl_receiver = fr.user_idx
  ${whereClause}
  GROUP BY gr.gr_idx
  ${orderClause}`
  })

function friendFilters(inputs){
  let whereClauses = [];

  if (inputs.name !== undefined) {
      whereClauses.push(`gr.gr_name LIKE '%${inputs.name}%'`);
  }
  
  if (inputs.gr_idx !== undefined) {
      whereClauses.push(`gr.gr_idx = ${inputs.gr_idx}`);
  }
  
  if(inputs.display !== undefined) {
      whereClauses.push(`fr.fr_display IN(${$inputs.display})`);
  }else whereClauses.push('fr.fr_display = 1');

  whereClauses.push(`fr.fr_state = 1`)
  whereClauses.push(`fr.user_idx = ${inputs.us_idx}`)
  
  return whereClauses.length > 0 ? " WHERE " + whereClauses.join(" AND ") : "";

}

function friendOrder(inputs){
  let orderType = "order_date";
  if(inputs.order == "create") orderType = "fr.created_at";
  else if(inputs.order == "basic") orderType = "order_date";
  else if(inputs.order !== undefined) orderType = inputs.order;

  let dirType = inputs.dir === undefined ? "DESC" : inputs.dir;
  return ` ORDER BY ${orderType} ${dirType}`
}

async function generateRandomCode() {
  let sql = `SELECT in_code FROM invite`;
  const [codes] = await conn.promise().query(sql);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'; // 숫자와 알파벳
  let code = "";
  while (code == "" || codes.includes(code)) {
    for (let i = 0; i < 6; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      code += chars[randomIndex];
    }
  }
  return code;
}

module.exports = router;
