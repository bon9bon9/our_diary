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

const InsertPage = async (user_idx, pa_content, req, pdColumn, diaryLog ) => {
  // page insert
  pages_idx = await insertPage([['page',user_idx, null, 1, pa_content]]);

  // page_detail insert
  let pdValue = setValueNull(req.body, pdColumn);
  await insertPageDetail(diaryLog[0], pages_idx, pdColumn, pdValue);
  return pages_idx;
}

const UpdatePage = async (pa_content, pages_idx, req, pdColumn, pageDetail) => {
  // page update
  await updatePage([pa_content, 1, pages_idx]);

  // page_detail udpate
  const { setClause , values } = setUpdateSet(req.body, pdColumn);
  await updatePageDetail(setClause , values, pageDetail[0].pd_idx);
}

const CreateDiary = async (di_title, gr_idx, di_total_cycle, user_idx) => {
  const diaryValue = [di_title, gr_idx, di_total_cycle, 1];
  const diary_idx = await insertDiary(diaryValue);
  const group = await findGroupsByIdx(gr_idx);
  if(group.gr_invite == 0){
    await updateDiaryMember(diary_idx,gr_idx);
  }

  const date = getDateString(new Date());
  const dl_idx =await insertDiaryLog(diary_idx, user_idx, 'receive', date , 1, 1, 1);
  const dl_next_idx = await insertDiaryLog(diary_idx, user_idx, 'read', date , 1, 1, 1);
  return diary_idx;
}

const DeliverDiary = async (user_idx, diary_idx, receiver_idx, diary, page) => {
  let date = new Date();
  // di_total_members 가 없다면 = 더이상 그룹에 초대하지 않음음
  if(!diary.di_total_members){
    const di_total_members = await updateDiaryMember(diary_idx, diary.groups_idx);
    await updateGroupsInvite(diary.groups_idx);
    diary.di_total_members = di_total_members;
  }
  if(!diary.di_start_date){
    await updateDiaryStartDate(diary_idx, getDateString(date));
  }
  // pd_state 바꾸기
  await updatePageDetailState(page.pd_idx, receiver_idx);
  // send log 쌓기
  let page_seq = page.pd_seq;
  let curr_cycle = page.pd_curr_cycle;
  let curr_seq = page.pd_curr_seq;
  const dl_idx = await insertDiaryLog(diary_idx,user_idx,"send",getDateString(date),page_seq,curr_cycle,curr_seq);
  // receive log 쌓기
  date.setDate(date.getDate() + 1); // 하루 더하기
  page_seq += 1;
  if(diary.di_total_members == curr_seq){
    curr_cycle += 1;
    curr_seq = 1;
  }else{
    curr_seq += 1;
  }
  const dl_next_idx = await insertDiaryLog(diary_idx,receiver_idx,"receive",getDateString(date),page_seq,curr_cycle,curr_seq);
}


const ReceiveInvitition = async (body, user_idx, group, diary, last_page) => {
  // 그룹에 친구 등록
  await insertFriend(body, user_idx, group.gr_idx);
  // invite 상태 수정
  await updateInvite(user_idx, body.code);
  // di_start_date 없다면 넣기
  if(!diary.di_start_date){
    await updateDiaryStartDate(diary.di_idx, last_page.pd_date);
  }
  // pd_state 바꾸기
  await updatePageDetailState(last_page.pd_idx, user_idx);
  // send log 쌓기
  let date = getDateString(new Date());
  let page_seq = last_page.pd_seq;
  let curr_cycle = last_page.pd_curr_cycle;
  let curr_seq = last_page.pd_curr_seq;
  const dl_idx = await insertDiaryLog(diary.di_idx, diary.user_idx, "send", date, page_seq, curr_cycle, curr_seq);
  // receive log 쌓기
  const dl_next_idx = await insertDiaryLog(diary.di_idx, user_idx, "receive", date, page_seq+1 ,curr_cycle, curr_seq+1);
}

const InviteFriend = async (user_idx, diary_idx, data) => {
  if(data){
    return data.in_code;
  }
  const in_code = await generateInviteCode();
  await insertInvite(user_idx, diary_idx, in_code);
  return in_code;
}

const ReadDiary = async (receive_log, user_idx, diary_idx) => {
  await insertDiaryLog(diary_idx, user_idx, 'read', getDateString(new Date()), receive_log.dl_page_seq, receive_log.dl_curr_cycle, receive_log.dl_curr_seq);
}

const EndDiary = async (user_idx, diary_idx) => {
  const last_page = await getLastPageDetail(diary_idx);
  let res = {data:undefined};
  // 마지막 일기쓴 애가 맞는지 검사
  if(!last_page || last_page.user_idx != user_idx){
    res.data = {code: StatusCodes.BAD_REQUEST, json:requestDoc.BadRequest};
    return res;
  }
  if(last_page.di_total_cycle != last_page.pd_curr_cycle || last_page.di_total_members != last_page.pd_curr_seq){
    res.data = {code:StatusCodes.BAD_REQUEST, json:requestDoc.BadRequest};
    return res;
  }
  let date = getDateString(new Date());
  // di_end_date 갱신, di_state 2로 갱신
  await updateDiaryEnd(diary_idx, date);
  // diary_log end insert
  await insertDiaryLog(diary_idx, user_idx, 'end', date, last_page.pd_seq, last_page.pd_curr_cycle, last_page.pd_curr_seq);
  // pd_state 1 로 갱신
  await updatePageDetailState(last_page.pd_idx, null);
  return res;
}

const insertInvite = async (user_idx, diary_idx, in_code) => {
  let insertSql = `INSERT INTO invite(user_idx, diary_idx, in_code, in_state) VALUES (?)`;
  const [insertRes] = await conn.promise().query(insertSql, [[user_idx, diary_idx, in_code, 0]]);
  return insertRes.insertId;
}

const updateInvite = async (user_idx, code) => {
  let updateSql = `UPDATE invite SET in_state = 1, in_user_idx = ? WHERE in_code = ?`;
  await conn.promise().query(updateSql, [user_idx, code]);
}

// diary 추가
const insertDiary = async (values) => {
  let insertSql = `INSERT INTO diary(di_title, groups_idx, di_total_cycle, di_state) VALUES (?)`;
  const [insertRes] = await conn.promise().query(insertSql, [values]);
  return insertRes.insertId;
}

const updateDiaryMember = async (di_idx, gr_idx) => {
  const di_total_members = await getFriendCnt(gr_idx);
  let updateSql = `UPDATE diary SET di_total_members = ? WHERE di_idx = ? AND di_total_members IS NULL`;
  await conn.promise().query(updateSql, [di_total_members, di_idx]);
  return di_total_members;
}

const updateDiaryStartDate = async (di_idx, di_start_date) => {
  let updateSql = `UPDATE diary SET di_start_date = ? WHERE di_idx = ? AND di_start_date IS NULL`;
  await conn.promise().query(updateSql, [di_start_date, di_idx]);
}

const updateDiaryEnd = async (di_idx, di_end_date) => {
  let updateSql = `UPDATE diary SET di_end_date = ? , di_state = 2 WHERE di_idx = ? AND di_end_date IS NULL`;
  await conn.promise().query(updateSql, [di_end_date, di_idx]);}

// diary_log 추가
const insertDiaryLog = async (diary_idx, user_idx, dl_type, dl_date, dl_page_seq, dl_curr_cycle, dl_curr_seq) => {
  let insertLogSql = `INSERT INTO diary_log(diary_idx, user_idx, dl_type, dl_date, dl_page_seq, dl_curr_cycle, dl_curr_seq) VALUES(?)`;
  const [insertLogRes] = await conn.promise().query(insertLogSql, [[diary_idx, user_idx, dl_type, dl_date, dl_page_seq, dl_curr_cycle, dl_curr_seq]]);
  return insertLogRes.insertId;z``
}

// pages 추가
const insertPage = async (values) => {
  let sql = `INSERT INTO pages(pa_type, user_idx, pa_parent_idx, pa_nickname_open, pa_content) VALUES (?)`;
  const [result] = await conn.promise().query(sql, values);
  return result.insertId;
}

// pages 갱신
const updatePage = async (values) => {
  let sql = `UPDATE pages SET pa_content = ?, pa_nickname_open = ? WHERE pa_idx = ?`;
  const [result] = await conn.promise().query(sql,values);
  return result;
}

// pages_detail 추가
const insertPageDetail = async (diaryLog, pages_idx, pdColumn, pdValue) => {
  pdColumn = pdColumn.concat([`diary_idx`, `pages_idx`,`pd_seq`, `pd_curr_cycle`, `pd_curr_seq`, `pd_state`]);
  pdValue = pdValue.concat([diaryLog.diary_idx, pages_idx, diaryLog.dl_page_seq, diaryLog.dl_curr_cycle, diaryLog.dl_curr_seq, 0]);

  let pdInsertSql = `INSERT INTO pages_detail(${pdColumn}) VALUES (?)`;
  await conn.promise().query(pdInsertSql, [pdValue]);
}

const updatePageDetail = async (setClause, values, pd_idx) => {
  let updateSql = `UPDATE pages_detail SET ${setClause} WHERE pd_idx = ?`;
  await conn.promise().query(updateSql, [...values, pd_idx]);
}

const updatePageDetailState = async (pd_idx, user_idx) => {
  let updateSql = `UPDATE pages_detail SET pd_state = 1, pd_next_idx = ? WHERE pd_idx = ? AND pd_state = 0`;
  await conn.promise().query(updateSql, [user_idx,pd_idx]);
}

const generateInviteCode = async () => {
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

module.exports = {
  CreateDiary,
  InsertPage,
  UpdatePage,
  DeliverDiary,
  InviteFriend,
  ReceiveInvitition,
  ReadDiary,
  EndDiary,
}