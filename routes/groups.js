const express = require('express');
const router = express.Router();

const {validate , authenticateJWT} = require('../middleWare');
const {body, param, query} = require('express-validator');
const conn = require('../mariadb');
const {StatusCodes} = require('http-status-codes');
const {resJson, 
  resDataJson,
  resSuccessJson, 
  getPagenateInfo,
  emogiTest,
  setValueNull,
  setUpdateSet,
} = require('../common');

const MySQLErrors = require('../mysqlErrors');
const requestDoc = require('../requests');

router.use(express.json());

router.post('/',[
    body("gr_name").notEmpty().isString(),
    body("gr_emogi").custom(emogiTest),
    body("fr_emogi").custom(emogiTest),
    body("fr_nickname").notEmpty().isString(),
    body("gr_search").notEmpty().isIn([0,1]),
    validate,
    authenticateJWT
],async (req, res) => {
  //  #swagger.summary = "GR_01 새로운 모임 생성";
  const {gr_name, gr_emogi, gr_search, fr_nickname, fr_color, fr_emogi} = req.body;
  let grColumn = [`gr_name`,`gr_emogi`,`gr_search`];
  let grValue = setValueNull(req.body, grColumn);

  let code = await generateRandomCode();
  grColumn = grColumn.concat([`gr_code`,`gr_invite`]);
  grValue = grValue.concat([code,1])

  let frColumn = [`fr_nickname`,`fr_color`,`fr_emogi`];
  let frValue = setValueNull(req.body, grColumn);

  await conn.promise().beginTransaction();
  try{
    let grInsertSql = `INSERT INTO groups(${grColumn}) VALUES (?)`;
    const [grInsert] = await conn.promise().query(grInsertSql,[grValue]);
    let gr_idx = grInsert.insertId;

    frColumn = frColumn.concat([`fr_display`,`fr_state`,`user_idx`,`groups_idx`]);
    frValue = frValue.concat([1,1,req.user,gr_idx]);
    let frInsertSql = `INSERT INTO friend(${frColumn}) VALUES (?)`;
    await conn.promise().query(frInsertSql,[frValue]);
    await conn.promise().commit();
    //  #swagger.responses[200] = {1:1}
    return res.json(resSuccessJson())
  }catch(err){
    await conn.promise().rollback();
    //  #swagger.responses[500] = {BackEnd:1}
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(resDataJson(requestDoc.BackEnd,err));
  }
});

router.put('/',[
  body("gr_emogi").custom(emogiTest),
  body("gr_search").isIn([0,1]),
  body("gr_name").isString(),
  body("groups_idx").isInt(),
  validate,
  authenticateJWT
],async (req, res) => {
  //  #swagger.summary = "GR_02 모임 정보 수정"
  const {gr_name,gr_emogi,gr_search,groups_idx} = req.body;
  const {setClause, values} = setUpdateSet(req.body, ["gr_name","gr_emogi","gr_search"]);
  try{
    if(gr_search !== undefined){
      let selectDiary = `SELECT * FROM diary AS di
      LEFT JOIN groups AS gr ON di.groups_idx = gr.gr_idx
      WHERE gr.gr_idx = ?`;
      const [selectRes] = await conn.promise().query(selectDiary,[groups_idx]);
      if(selectRes.length && parseInt(gr_search) != selectRes[0].gr_search){ // 다이어리가 존재하는데 변경할려한다면..
        //  #swagger.responses[400] = {CantUpdateGroup:1}
        return res.status(StatusCodes.BAD_REQUEST).json(requestDoc.CantUpdateGroup);

      }
    }
    let sql = `UPDATE groups SET ${setClause} WHERE gr_idx = ?`
    await conn.promise().query(sql, [values,groups_idx]);
    //  #swagger.responses[200] = {1:1}
    return res.json(resSuccessJson())
  }catch(err){
    //  #swagger.responses[500] = {BackEnd:1}
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(resDataJson(requestDoc.BackEnd,err));
  }
  
})

router.get('/:code',[
  param("code").isString()
],async(req,res) => {
  //  #swagger.summary = "GR_03 그룹 검색"
  let sql = `SELECT * FROM groups WHERE gr_code = ?`
  conn.query(sql, [req.params.code], (err,result) => {
    if(err){
      //  #swagger.responses[500] = {BackEnd:1}
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(resDataJson(requestDoc.BackEnd,err));
    }
    if(result.length === 0){
      //  #swagger.responses[400] = {NoGroup : 1}
      return res.status(StatusCodes.BAD_REQUEST).json(requestDoc.NoGroup);
    }
    return res.json(resSuccessJson(result[0]));
  })
})

async function generateRandomCode() {
  let sql = `SELECT gr_code FROM groups`; 
  const [codes] = await conn.promise().query(sql);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'; // 숫자와 알파벳
  let code = "";
  while(code == "" || codes.includes(code)){
    for (let i = 0; i < 6; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      code += chars[randomIndex];
    }
  }
  return code;
}

module.exports = router;