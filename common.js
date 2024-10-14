const conn = require('./mariadb');
const crypto = require('crypto'); // 기본 모듈 : 암호화를 담당
const dotenv = require('dotenv');
dotenv.config();

const resJson = (message, code, data) => {
    return {
        message : message, 
        code : code, 
        data : data
    };

}

const resDataJson = (res, data) => {
    res.data = data;
    return res;
    
}

const resSuccessJson = (data, pageInfo) => {
    return {message : "성공", code : 1, pageInfo : pageInfo, data : data};
}

const encodePassword = (pwd) => {
    // 비밀번호 암호화
    const salt = process.env.CRYPTO_KEY;
    const hashPwd = crypto.pbkdf2Sync(pwd, salt, 10000, 10, 'sha512').toString('base64');

    return hashPwd;
}

const comparePassword = (pwd,inputPwd) => {
    const salt = process.env.CRYPTO_KEY;
    const encodePwd = crypto.pbkdf2Sync(inputPwd, salt, 10000, 10,'sha512').toString('base64');
    if(pwd == encodePwd)
        return true;
    else false;
}

const getPagenateInfo = (page, size) => {
    let pagenateInfo = {
        page: page, 
        size: size, 
        sql : ""
    };
    if(page === undefined && size === undefined) return pagenateInfo;
    if(page === undefined) pagenateInfo.page = 1;
    if(size === undefined) pagenateInfo.size = 10;

    let limit = pagenateInfo.size;
    let offset = (pagenateInfo.page-1) * pagenateInfo.size;
    
    pagenateInfo.sql = ` LIMIT ${limit} OFFSET ${offset}`;
    return pagenateInfo;
}

const emojiRegex = /[\p{Emoji_Presentation}\p{Emoji}\u200D]+/gu;
const emogiTest = value => {
  // 값이 이모지인지 확인
  if(value === undefined){
    return true;
  }
  if (!emojiRegex.test(value)) {
    throw new Error('이모지가 포함되어 있지 않습니다.');
  }
  return true;
}

const setValueNull = (req,column) => {
    let values = [];
    column.forEach(element => {
        if(req[element] !== undefined){
            values.push(req[element])
        }else values.push(null);
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

module.exports = {
    resJson, 
    resDataJson,
    resSuccessJson, 
    encodePassword, 
    comparePassword,
    getPagenateInfo,
    emogiTest,
    setValueNull,
    setUpdateSet
}