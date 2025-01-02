const conn = require('./mariadb');
const crypto = require('crypto'); // 기본 모듈 : 암호화를 담당
const dotenv = require('dotenv');
dotenv.config();

const resJson = (message, code, data) => {
  return {
    message: message,
    code: code,
    data: data
  };
}

const resBadRequest = (res, message) => {
  return{
    message : `${res.message}, ${message}`,
    code: res.code
  }
}

const resDataJson = (res, data) => {
  res.data = data;
  return res;
}

const resSuccessJson = (data, pageInfo) => {
  return { message: "성공", code: 1, pageInfo: pageInfo, data: data };
}

const encodePassword = (pwd) => {
  // 비밀번호 암호화
  const salt = process.env.CRYPTO_KEY;
  const hashPwd = crypto.pbkdf2Sync(pwd, salt, 10000, 10, 'sha512').toString('base64');

  return hashPwd;
}

const comparePassword = (pwd, inputPwd) => {
  const salt = process.env.CRYPTO_KEY;
  const encodePwd = crypto.pbkdf2Sync(inputPwd, salt, 10000, 10, 'sha512').toString('base64');
  if (pwd == encodePwd)
    return true;
  else false;
}

const getPaginateInfo = (page,size) => {
  /*  
    #swagger.parameters['page'] = {
      description: 'n페이지, 기본값 : 1'
      example : 1
      type: 'number'
    } 
    #swagger.parameters['size'] = {
      description: '페이지당 갯수, 기본값 : 10'
      example : 10
      type: 'number'
    } 
    #swagger.parameters['pagination'] = {
      description: '1:페이지네이션, 0:페이지네이션 안함, 기본값 1'
      example : 1
      type: 'number'
    } 
  */
  let paginateInfo = {
    page: page,
    size: size,
    paginateSql: ""
  };
  if (page === undefined) paginateInfo.page = 1;
  if (size === undefined) paginateInfo.size = 10;

  let limit = paginateInfo.size;
  let offset = (paginateInfo.page - 1) * paginateInfo.size;

  paginateInfo.paginateSql = ` LIMIT ${limit} OFFSET ${offset}`;
  return paginateInfo;
}

const getPageInfo = (paginateInfo, totalCnt) => {
  let pageInfo = {page : paginateInfo.page, size : paginateInfo.size, total_count : totalCnt[0].cnt};
  return pageInfo
}

const emojiRegex = require('emoji-regex');

const emogiTest = (value) => {
  if (value === undefined || value === null) {
    return true; // undefined나 null은 유효하지 않음
  }

  const regex = emojiRegex(); // 라이브러리에서 정규식 가져오기
  if (!regex.test(value)) {
    throw new Error('이모지가 포함되어 있지 않습니다.');
  }
  return true;
};

const setValueNull = (req, column) => {
  let values = [];
  column.forEach(element => {
    if (req[element] !== undefined) {
      values.push(req[element])
    } else values.push(null);
  });
  return values;
}

const setUpdateSet = (req, column) => {
  const updateSets = [];
  const values = []; // 값을 따로 저장할 배열

  column.forEach(element => {
    if (req[element] !== undefined) {
      updateSets.push(`${element} = ?`); // 자리 표시자 사용
      values.push(req[element]); // 실제 값은 따로 배열에 저장
    }
  });

  return {
    setClause: updateSets.join(", "), // "컬럼명 = ?" 형식으로 조합
    values: values // 값 배열 반환
  };
};

const getDateString = (date) => {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD 형식 추출
}

module.exports = {
  resJson,
  resDataJson,
  resSuccessJson,
  encodePassword,
  comparePassword,
  getPaginateInfo,
  emogiTest,
  setValueNull,
  setUpdateSet,
  resBadRequest,
  getDateString,
  getPageInfo
}