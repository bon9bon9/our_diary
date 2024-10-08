const {validationResult} = require('express-validator')
const conn = require('./mariadb');
const crypto = require('crypto'); // 기본 모듈 : 암호화를 담당

const validate = (req, res, next) => {
    const err = validationResult(req);
    if(!err.isEmpty()){
        return res.status(400).json(err.array());
    }
    return next(); // 다음 할 일로 가라! (미들웨어, 함수)
}

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

const encodePwd = (pwd) => {
    // 비밀번호 암호화
    const salt = crypto.randomBytes(10).toString('base64');
    const hashPwd = crypto.pbkdf2Sync(pwd, salt, 10000, 10, 'sha512').toString('base64');

    return {salt : salt, newPwd : hashPwd};
}

const comparePwd = (pwd, salt, inputPwd) => {
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
    validate,
    resJson, 
    resSuccessJson, 
    encodePwd, 
    comparePwd,
    getPagenateInfo
}