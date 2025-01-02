const express = require('express');
const router = express.Router();

const { validate, authenticateJWT } = require('../middleWare');
const { body, param, query } = require('express-validator');
const conn = require('../mariadb');
const { StatusCodes } = require('http-status-codes');
const { resJson,
  resDataJson,
  resSuccessJson,
  emogiTest,
  setValueNull,
  setUpdateSet,
  getPaginateInfo,
  getPageInfo,
} = require('../common');

const MySQLErrors = require('../mysqlErrors');
const requestDoc = require('../requests');
const { insertFriend } = require('../service/friendService');

router.use(express.json());
  
router.post('/', [
  body("gr_name").notEmpty().isString(),
  body("gr_emogi").custom(emogiTest),
  body("fr_emogi").custom(emogiTest),
  body("fr_nickname").notEmpty().isString(),
  // #swagger.parameters['body'] = {"required" : ['gr_name','fr_nickname'],"in":"body"}
  validate,
  authenticateJWT
], async (req, res) => {
  //  #swagger.summary = "GR_01 새로운 모임 생성";
  const { gr_name, gr_emogi, fr_nickname, fr_color, fr_emogi } = req.body;
  let grColumn = [`gr_name`, `gr_emogi`];
  let grValue = setValueNull(req.body, grColumn);

  let code = await generateRandomCode();
  grColumn = grColumn.concat([`gr_code`, `gr_invite`]);
  grValue = grValue.concat([code, 1]);

  await conn.promise().beginTransaction();
  try {
    let grInsertSql = `INSERT INTO groups(${grColumn}) VALUES (?)`;
    const [grInsert] = await conn.promise().query(grInsertSql, [grValue]);
    let gr_idx = grInsert.insertId;
    await insertFriend(req.body, req.user, gr_idx);
    await conn.promise().commit();
    //  #swagger.responses[200] = {1:1}
    return res.json(resSuccessJson(gr_idx))
  } catch (err) {
    await conn.promise().rollback();
    //  #swagger.responses[500] = {BackEnd:1}
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(resDataJson(requestDoc.BackEnd, err));
  }
});

router.put('/', [
  body("gr_emogi").custom(emogiTest),
  body("gr_name").optional().isString(),
  body("groups_idx").notEmpty().isInt(),
  //  #swagger.parameters['body'] = {"required" : ['groups_idx'],"in":"body"}
  validate,
  authenticateJWT
], async (req, res) => {
  //  #swagger.summary = "GR_02 모임 정보 수정"
  const { gr_name, gr_emogi, groups_idx } = req.body;
  const { setClause, values } = setUpdateSet(req.body, ["gr_name", "gr_emogi"]);
  try {
    if (gr_search !== undefined) {
      let selectDiary = `SELECT * FROM diary AS di
      LEFT JOIN groups AS gr ON di.groups_idx = gr.gr_idx
      WHERE gr.gr_idx = ?`;
      const [selectRes] = await conn.promise().query(selectDiary, [groups_idx]);
      if (selectRes.length && parseInt(gr_search) != selectRes[0].gr_search) { // 다이어리가 존재하는데 변경할려한다면..
        //  #swagger.responses[409] = {CantUpdateGroup:1}
        return res.status(StatusCodes.CONFLICT).json(requestDoc.CantUpdateGroup);

      }
    }
    let sql = `UPDATE groups SET ${setClause} WHERE gr_idx = ?`
    await conn.promise().query(sql, [values, groups_idx]);
    //  #swagger.responses[200] = {1:1}
    return res.json(resSuccessJson())
  } catch (err) {
    //  #swagger.responses[500] = {BackEnd:1}
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(resDataJson(requestDoc.BackEnd, err));
  }

});

// 내가 가입한 모임 목록 - 일기 읽은 시간 or 가입 시간 최대값값  순순
router.get('/',[
  query("page").isInt(),
  query("size").isInt(),
  // query("dir").isIn(['DESC','ASC']).isString(),
  validate,
  authenticateJWT
], async (req, res) => {
  const user_idx = req.user;
  const {page, size} = req.query;
  const paginateInfo = getPaginateInfo(page,size);
  let listSql =`SELECT gr.*, MAX(dl.created_at) AS read_date, MAX(fr.created_at) AS friend_date,
    GREATEST(COALESCE(MAX(fr.created_at),0),COALESCE(MAX(dl.created_at),0)) AS order_date 
    FROM friend AS fr
    INNER JOIN groups AS gr ON fr.groups_idx = gr.gr_idx
    LEFT JOIN diary AS di ON fr.groups_idx = di.groups_idx
    LEFT JOIN diary_log AS dl ON di.di_idx = dl.diary_idx AND dl.user_idx = ${user_idx} AND dl.dl_type = 'read'
    WHERE fr.user_idx = ${user_idx} AND fr.fr_state = 1 AND fr.fr_display = 1
    GROUP BY gr.gr_idx
    ORDER BY order_date DESC
    ${paginateInfo.paginateSql}
    `;
  let countSql = `SELECT COUNT(*) AS cnt FROM friend AS fr
  WHERE fr.user_idx = ${user_idx} AND fr.fr_state = 1 AND fr.fr_display = 1`;
  const [list] = await conn.promise().query(listSql);
  const [totalCnt] = await conn.promise().query(countSql);
  return res.json(resSuccessJson(list,getPageInfo(paginateInfo, totalCnt)));
});

async function generateRandomCode() {
  let sql = `SELECT gr_code FROM groups`;
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