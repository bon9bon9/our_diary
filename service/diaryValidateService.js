const conn = require('../mariadb');
const { findDiaryByIdx } = require('../model/diaryModel');
const { checkFriend } = require('../model/friendModel');
const { findGroupsByIdx } = require('../model/groupsModel');
const { getLastPageDetail } = require('../model/pagesDetailModel');
const requestDoc = require("../requests");
const {StatusCodes} = require("http-status-codes");


const ValidateSavePage = async (diary_idx, user_idx, pages_idx, pd_date) => {
  const res = {
    status : false,
    data : undefined
  }
  // 유효성 검사 1. 일기 쓰는애 맞남
  const diaryLog = await ValidateDiaryWriter(diary_idx, user_idx);
  if(!diaryLog.length || diaryLog[0].user_idx != user_idx){
    //  #swagger.responses[400] = {BadRequest:1}
    res.data = {code:StatusCodes.BAD_REQUEST, json:requestDoc.BadRequest};
    return res;
  }
  // 유효성 검사 2. 전달받은 pages_idx 가 맞는가
  const pageDetail = await ValidateHaveWritingPage(user_idx, diary_idx);
  if(pageDetail.length && pageDetail[0].pages_idx != pages_idx){
    res.data = {code:StatusCodes.BAD_REQUEST, json:requestDoc.BadRequest};
    return res;
  }
  // 유효성 검사 3. 적절한 pd_date인가
  const read_date = new Date(`${diaryLog[0].dl_date}T00:00:00`);
  const today = new Date();
  const diary_date = new Date(`${pd_date}T00:00:00`);
  if(diary_date < read_date || diary_date > today){
    //  #swagger.responses[409] = {WrongDiaryDate:1}
    res.data = {code:StatusCodes.CONFLICT, json:requestDoc.WrongDiaryDate};
    return res;
  }
  res.status = true;
  res.data = [diaryLog, pageDetail]
  return res;
}

const ValidateCreateDiary = async (user_idx, groups_idx) => {
  const res = {
    status : false,
    data : undefined
  }
  // 유효성 검사 1. 올바른 gr_idx인지 확인
  const isFriend = await checkFriend(user_idx, groups_idx);
  if(!isFriend){
    //  #swagger.responses[400] = {BadRequest:1}
    res.data = {code:StatusCodes.BAD_REQUEST, json:requestDoc.BadRequest};
    return res;
  }
  // 유효성 검사 2. 그룹에 진행중인 일기가 없는지 확인
  const diaryRes = await ValidateAlreadyWritingDiary(groups_idx);
  if(diaryRes.length){
    //  #swagger.responses[409] = {AlreadyWritingDiary:1}
    res.data = {code:StatusCodes.CONFLICT, json:requestDoc.AlreadyWritingDiary};
    return res;
  }
  res.status = true;
  return res;
}

const ValidateDeliverDiary = async (user_idx, diary_idx, receiver_idx)=> {
  const res = {
    status : false,
    data : undefined
  }
  if(receiver_idx == user_idx){
    res.data = {code:StatusCodes.BAD_REQUEST, json:requestDoc.BadRequest};
    return res;
  }
  // 1. user가 일기를 적고 전달하는건지 확인
  const page = await getLastPageDetail(diary_idx);
  if(!page || page.user_idx != user_idx){
    //  #swagger.responses[400] = {BadRequest:1}
    res.data = {code:StatusCodes.BAD_REQUEST, json:requestDoc.BadRequest};
    return res;
  }
  // 2. 턴 유지인지 다음턴인지 확인 
  // - 다음 턴이면 끝난애 아닌지 확인인
  // - 유지면 이번턴에 아직 안쓴 receiver 인지 확인
  const diary = await findDiaryByIdx(diary_idx);
  if(!diary.di_total_members) {
    if(page.pd_curr_seq == 1){ // 본인밖에 없을 땐 전달이 아니라 초대해야지
      res.data = {code:StatusCodes.BAD_REQUEST, json:requestDoc.BadRequest};
      return res;
    }
  }else{
    if(diary.di_total_members == page.pd_curr_seq){ // 다음 턴
      if(diary.di_total_cycle == page.pd_curr_cycle){ // 전달이 아니라 완료했어야지지
        res.data = {code:StatusCodes.BAD_REQUEST, json:requestDoc.BadRequest};
        return res;
      }
    }else{ // 유지
        const checkTurn = await ValidateThisCycleYet(receiver_idx,diary_idx,page.pd_curr_cycle);
        if(checkTurn.length){
          res.data = {code:StatusCodes.BAD_REQUEST, json:requestDoc.BadRequest};
          return res;
        }
    }
  }
  // 3. receiver 자체가 유효한지 확인
  const isFriend = await checkFriend(receiver_idx, diary.groups_idx);
  if(!isFriend){
    res.data = {code:StatusCodes.BAD_REQUEST, json:requestDoc.BadRequest};
    return res;
  }
  res.status = true;
  res.data = {
    page : page,
    diary : diary
  }
  return res;
}


const ValidateInviteFriend = async (user_idx, diary_idx) => {
  const res = {
    status : false,
    data : undefined
  }
  // 1. user가 속해있는 diary 인지 확인
  const diary = await ValidateUserAndDiary(user_idx, diary_idx)
  if(!diary.length){
    //  #swagger.responses[400] = {BadRequest:1}
    res.data = {code:StatusCodes.BAD_REQUEST, json:requestDoc.BadRequest};
    return res;
  }
  // 2. 초대 가능한 group 인지 확인
  if(diary.gr_invite == 0){
    res.data = {code:StatusCodes.BAD_REQUEST, json:requestDoc.BadRequest};
    return res;
  }
  // 3. 2명 초대 불가능
  const invite = await ValidateInviteAlready(user_idx, diary_idx);
  if(invite.length && invite[0].in_state == 1){
    res.data = {code:StatusCodes.BAD_REQUEST, json:requestDoc.BadRequest};
    return res;
  }else if(invite.length) res.data = invite[0];
  // 4. 일기 쓰긴 했니?
  const last_page = await getLastPageDetail(diary_idx);
  if(last_page || last_page.user_idx != user_idx){
    res.data = {code:StatusCodes.BAD_REQUEST, json:requestDoc.BadRequest};
    return res;
  }
  res.status = true;
  return res;
}

const ValidateReceiveInvitition = async (code, user_idx) => {
  const res = {
    status : false,
    data : undefined
  }
  // 1. 유효한 code인지 확인
  const diary = await ValidateInviteCode(code);
  if(!diary.length){
    //  #swagger.responses[400] = {BadRequest:1}
    res.data = {code:StatusCodes.BAD_REQUEST, json:requestDoc.BadRequest};
    return res;
  }
  // 2. 입장가능한 group인지 확인
  const group = await findGroupsByIdx(diary[0].groups_idx);
  if(group.gr_invite == 0){
    res.data = {code:StatusCodes.BAD_REQUEST, json:requestDoc.BadRequest};
    return res;
  }
  // 3. 그 그룹에 없는 user_idx인지 확인
  const isFriend = await checkFriend(user_idx, group.gr_idx);
  if(isFriend){
    res.data = {code:StatusCodes.BAD_REQUEST, json:requestDoc.BadRequest};
    return res;
  }
  // 4. 마지막으로 일기쓴사람과 초대한 코드 사람이 일치하는지 확인
  const last_page = await getLastPageDetail(diary[0].di_idx);
  if(last_page || diary[0].user_idx != last_page.user_idx){
    res.data = {code:StatusCodes.BAD_REQUEST, json:requestDoc.BadRequest};
    return res;
  }
  
  res.data = {
    group : group,
    diary : diary[0],
    last_page : last_page
  }
  res.status = true;
  return res;
}

const ValidateReadDiary = async (user_idx, diary_idx) => {
  const res = {
    status : false,
    data : undefined
  }
  let sql = `SELECT * FROM diary_log AS dl
    WHERE diary_idx = ? AND dl_type IN('receive','end') AND dl_date <= DATE(NOW()) ORDER BY dl_idx DESC LIMIT 1`;
  const [receive_log] = await conn.promise().query(sql,[diary_idx]);
  if(!receive_log.length){
    //  #swagger.responses[400] = {BadRequest:1}
    res.data = {code:StatusCodes.BAD_REQUEST, json:requestDoc.BadRequest};
    return res;
  }
  if(receive_log[0].dl_type == 'receive' && receive_log[0].user_idx != user_idx){
    res.data = {code:StatusCodes.BAD_REQUEST, json:requestDoc.BadRequest};
    return res;
  }
  let readSql = `SELECT * FROM diary_log AS dl
    WHERE diary_idx = ? AND dl_type = 'read' ORDER BY dl_page_seq DESC LIMIT 1`;
  const [read_log] = await conn.promise().query(readSql,[diary_idx]);
  if(read_log.length && read_log[0].user_idx == user_idx ){
    res.data = {code:StatusCodes.OK, json:requestDoc.success}
    return res;
  }
  res.status = true;
  res.data = receive_log[0];
  return res;
}

const ValidateInviteCode = async (code) => {
  let sql = `SELECT di.*,inv.user_idx FROM invite AS inv
    INNER JOIN diary AS di ON inv.diary_idx = di.di_idx
    WHERE inv.in_code = ? AND inv.in_state = 0`;  
  const [diary] = await conn.promise().query(sql,[code]);
  return diary;
}

const ValidateInviteAlready = async (user_idx, diary_idx) => {
  let sql = `SELECT * FROM invite WHERE user_idx = ? AND diary_idx = ? ORDER BY in_state DESC`;
  const [invite] = await conn.promise().query(sql,[user_idx, diary_idx]);
  return invite;
}

const ValidateThisCycleYet = async (user_idx, diary_idx, pd_curr_cycle) => {
  let checkSql = `SELECT * FROM pages_detail AS pd
    INNER JOIN pages AS pa ON pa.pa_idx = pd.pages_idx
    WHERE pa.user_idx = ? AND pd.diary_idx = ? AND pd.pd_curr_cycle = ?`;
  const [checkTurn] = await conn.promise().query(checkSql, [user_idx, diary_idx, pd_curr_cycle]);
  return checkTurn;
}

const ValidateWritenPage = async (user_idx, diary_idx) => {
  let pageSelectSql = `SELECT pd.* FROM pages AS pa
    INNER JOIN pages_detail AS pd ON pa.pa_idx = pd.pages_idx
    WHERE pa.user_idx = ? AND pd.diary_idx = ? AND pd.pd_state = 0`
  const [pagesRes] = await conn.promise().query(pageSelectSql, [user_idx, diary_idx]);
  return pagesRes;
}

// 유저가 속한 그룹이 맞는지 확인
const ValidateUserAndDiary = async (user_idx, diary_idx) => {
  let check = `SELECT di.*, gr_invite FROM diary AS di
    INNER JOIN friend AS fr ON di.groups_idx = fr.groups_idx
    INNER JOIN groups AS gr ON fr.groups_idx = gr.gr_idx
    WHERE di.di_idx = ? AND fr.user_idx = ?`;
  const [checkRes] = await conn.promise().query(check, [diary_idx, user_idx]);
  return checkRes;
}

// 그룹에 진행중인 일기가 있는지 확인인
const ValidateAlreadyWritingDiary = async (groups_idx) => {
  let diarySql = `SELECT * FROM diary AS di WHERE groups_idx = ? AND di_state = 1`;
  const [diaryRes] = await conn.promise().query(diarySql, [groups_idx]);
  return diaryRes;
}

// 일기 쓸 자격 있는지 검사
const ValidateDiaryWriter = async (diary_idx) => {
  let sql = `SELECT dl.*, di_total_members 
    FROM diary_log AS dl 
    INNER JOIN diary AS di ON di.di_idx = dl.diary_idx 
    WHERE dl.diary_idx = ? AND dl.dl_type = 'read' AND di_state = 1 ORDER BY dl_page_seq DESC LIMIT 1`
  const [diaryLog] = await conn.promise().query(sql,[diary_idx]);
  return diaryLog;
}

// 작성 중 일기가 있었는지 검사
const ValidateHaveWritingPage = async (user_idx, diary_idx) => {
  let pageSql = `SELECT pd.* FROM pages AS pa INNER JOIN pages_detail AS pd ON pa.pa_idx = pd.pages_idx WHERE pa.user_idx = ? AND diary_idx = ? AND pd.pd_state = 0`;
  const [pageDetail] = await conn.promise().query(pageSql, [user_idx, diary_idx]);
  return pageDetail;
}


module.exports = {
  ValidateCreateDiary,
  ValidateSavePage,
  ValidateDeliverDiary,
  ValidateInviteFriend,
  ValidateReceiveInvitition,
  ValidateReadDiary
}