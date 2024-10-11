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

module.exports = {
    resJson, 
    resSuccessJson, 
    encodePassword, 
    comparePassword,
    getPagenateInfo
}