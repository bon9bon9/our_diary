const express = require('express');
const router = express.Router();

const conn = require('../mariadb');
const {StatusCodes} = require("http-status-codes");
const requestDoc = require("../requests");
const {ValidateSavePage, ValidateCreateDiary, ValidateInviteFriend, ValidateReceiveInvitition, ValidateReadDiary, ValidateDeliverDiary} = require("../service/diaryValidateService")
const {InsertPage, UpdatePage, CreateDiary, DeliverDiary, InviteFriend, ReceiveInvitition, ReadDiary, EndDiary} = require("../service/diaryService")
const {resJson, 
  resDataJson,
  resSuccessJson, 
  encodePassword, 
  getPaginateInfo,
  getPageInfo
} = require('../common');
const { getLastPageDetail } = require('../model/pagesDetailModel');
const { getADoneButBYetDiary } = require('../service/diaryListService');

const createDiary = async (req, res) => {
  //  #swagger.summary = "DI_01 일기장 생성"
  const {di_title, gr_idx, di_total_cycle} = req.body;
  const user_idx = req.user;
  try{
    await conn.promise().beginTransaction();
    // 유효성 검사
    const {status, data} = await ValidateCreateDiary(user_idx, gr_idx);
    if(!status){
      return res.status(data.code).json(resDataJson(data.json));
    }
    // diary 추가!
    const diaryIdx = await CreateDiary(di_title, gr_idx, di_total_cycle,user_idx);
    await conn.promise().commit();
    //  #swagger.responses[200] = {1:{data:1}}
    return res.json(resSuccessJson(diaryIdx));
  }catch(err){
    await conn.promise().rollback();
    //  #swagger.responses[500] = {BackEnd:1}
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(resDataJson(requestDoc.BackEnd, err));
  }
}

const saveDiaryPages = async (req,res) => {
  //  #swagger.summary = "DI_02 일기 저장"
  let { pa_content, diary_idx, pd_date, pd_title, pd_weather, pd_tmi, pd_lunch, pd_question, pages_idx} = req.body;
  const user_idx = req.user;
  try{
    await conn.promise().beginTransaction();
    //validate
    const {status, data} = await ValidateSavePage(diary_idx, user_idx, pages_idx, pd_date);
    if(!status){
      return res.status(data.code).json(resDataJson(data.json));
    }
    // 작성중인 일기가 있었다면 update, 아니면 insert
    const [diaryLog, pageDetail] = data;
    let pdColumn = [`pd_date`, `pd_title`, `pd_weather`, `pd_tmi`, `pd_lunch`, `pd_question`];
    if(!pageDetail.length){
      pages_idx = await InsertPage(user_idx, pa_content, req, pdColumn, diaryLog );
    }else{
      await UpdatePage(pa_content, pages_idx, req, pdColumn, pageDetail);
    }
    await conn.promise().commit();
    return res.json(resSuccessJson(pages_idx))
  }catch(err){
    await conn.promise().rollback();
    //  #swagger.responses[500] = {BackEnd:1}
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(resDataJson(requestDoc.BackEnd, err));
  }
}

const getWritingPage = async (req,res) => {
  const {diary_idx} = req.query;
  const user_idx = req.user;
  const last_page = await getLastPageDetail(diary_idx);
  if(!last_page || last_page.user_idx != user_idx){
    return res.json(resSuccessJson(null));
  }
  return res.json(resSuccessJson(last_page))
}

const deliverDiary = async (req,res) => {
  const {diary_idx, receiver_idx} = req.body;
  const user_idx = req.user;
  try{
    await conn.promise().beginTransaction();
    //validate
    const {status, data} = await ValidateDeliverDiary(user_idx, diary_idx, receiver_idx);
    if(!status){
      return res.status(data.code).json(resDataJson(data.json));
    }
    // 전달..
    const {diary, page} = data;
    await DeliverDiary(user_idx, diary_idx, receiver_idx, diary, page);

    await conn.promise().commit();
    return res.json(resSuccessJson())
  }catch(err){
    await conn.promise().rollback();
    //  #swagger.responses[500] = {BackEnd:1}
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(resDataJson(requestDoc.BackEnd, err));
  }
}

const inviteFriend = async (req, res) => {
  const {diary_idx} = req.body;
  const user_idx = req.user;
  try{
    await conn.promise().beginTransaction();
    //validate
    const {status, data} = await ValidateInviteFriend(user_idx, diary_idx);
    if(!status){
      return res.status(data.code).json(resDataJson(data.json));
    }
    // 초대 코드 생성
    const code = await InviteFriend(user_idx, diary_idx, data);
    await conn.promise().commit();
    return res.json(resSuccessJson(code));
  }catch(err){
    await conn.promise().rollback();
    //  #swagger.responses[500] = {BackEnd:1}
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(resDataJson(requestDoc.BackEnd, err));
  }
}

const receiveInvitition = async (req,res) => {
  const {code, fr_nickname} = req.body;
  const user_idx = req.user;
  try{
    await conn.promise().beginTransaction();
    //validate
    const {status, data} = await ValidateReceiveInvitition(code,user_idx);
    if(!status){
      return res.status(data.code).json(resDataJson(data.json));
    }
    const {group, diary, last_page} = data;
    // 초대 수락
    await ReceiveInvitition(req.body, user_idx, group, diary, last_page);

    await conn.promise().commit();
    return res.json(resSuccessJson(diary.di_idx));
  }catch(err){
    await conn.promise().rollback();
    //  #swagger.responses[500] = {BackEnd:1}
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(resDataJson(requestDoc.BackEnd, err));
  }
}

const readDiary = async (req,res) => {
  const {diary_idx} = req.body;
  const user_idx = req.user;
  try{
    await conn.promise().beginTransaction();
    //validate
    // receive 한 앤지 확인
    const {status, data} = await ValidateReadDiary(user_idx, diary_idx);
    if(!status){
      return res.status(data.code).json(resDataJson(data.json));
    }
    // 일기 읽기
    await ReadDiary(data, user_idx, diary_idx);
    await conn.promise().commit();
    return res.json(resSuccessJson());
  }catch(err){
    await conn.promise().rollback();
    //  #swagger.responses[500] = {BackEnd:1}
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(resDataJson(requestDoc.BackEnd, err));
  }
}

const endDiary = async (req, res) => {
  const {diary_idx} = req.body;
  const user_idx = req.user;
  try{
    await conn.promise().beginTransaction();
    // 일기 읽기
    const {data} = await EndDiary(user_idx, diary_idx);
    if(data){
      return res.status(data.code).json(resDataJson(data.json));
    }
    await conn.promise().commit();
    return res.json(resSuccessJson());
  }catch(err){
    await conn.promise().rollback();
    //  #swagger.responses[500] = {BackEnd:1}
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(resDataJson(requestDoc.BackEnd, err));
  }
}

const diaryUserState = async (req,res) => {
  const user_idx = req.user;
  const {groups_idx} = req.query
  const receiveList = await getADoneButBYetDiary('receive','read',user_idx, groups_idx);
  const readList = await getADoneButBYetDiary('read','send',user_idx, groups_idx);
  const endList = await getADoneButBYetDiary('end','read',user_idx, groups_idx);

  return res.json(resSuccessJson({receive:receiveList, read:readList, end:endList}));
}

const getDoneDiaryList = async (req,res) => {
  const user_idx = req.user;
  const {page, size, groups_idx} = req.query;
  const paginateInfo = getPaginateInfo(page,size);

  let listSql = `SELECT di.* FROM diary AS di
    INNER JOIN friend AS fr ON di.groups_idx AND fr.groups_idx
    WHERE di.di_state = 2 AND fr.user_idx = ? AND fr.groups_idx = ?
    ORDER BY di.di_end_date DESC
    ${paginateInfo.paginateSql}`;
  let countSql = `SELECT di.* FROM diary AS di
    INNER JOIN friend AS fr ON di.groups_idx AND fr.groups_idx
    WHERE di.di_state = 2 AND fr.user_idx = ? AND fr.groups_idx = ?`;
  const value = [user_idx, groups_idx];
  const [list] = await conn.promise().query(listSql, value);
  const [totalCnt] = await conn.promise().query(countSql, value);
  return res.json(resSuccessJson(list,getPageInfo(paginateInfo, totalCnt)));
}

const getDiaryPageList = async (req,res) => {
  const user_idx = req.user;
  const {diary_idx} = req.query;
  // todo - 일기 볼 자격 있는 user_idx인지 검사

  let listSql = `SELECT pa.*, pd.*, pd.created_at as writed_at, di.*, 
    writer.user_idx AS writer_idx, writer.fr_nickname AS writer_nickname, 
    next.user_idx AS next_idx, next.fr_nickname AS next_nickname
    FROM pages AS pa
    INNER JOIN pages_detail AS pd ON pa.pa_idx = pd.pages_idx
    INNER JOIN diary AS di ON pd.diary_idx = di.di_idx
    INNER JOIN friend AS writer ON pa.user_idx = writer.user_idx AND writer.groups_idx = di.groups_idx
    INNER JOIN friend AS next ON pd.pd_next_idx = next.user_idx AND next.groups_idx = di.groups_idx
    WHERE pd.diary_idx = ?
    ORDER BY pd_seq ASC`;
  const value = [diary_idx];
  const [list] = await conn.promise().query(listSql, value);
  return res.json(resSuccessJson(list));
}

module.exports = {
  createDiary,
  saveDiaryPages,
  deliverDiary,
  inviteFriend,
  receiveInvitition,
  readDiary,
  endDiary,
  getWritingPage,
  diaryUserState,
  getDoneDiaryList,
  getDiaryPageList
}