const { validationResult } = require('express-validator')
const conn = require('./mariadb');
const dotenv = require('dotenv');
const requestDoc = require('./requests')
const {
  resDataJson
} = require('./common');
dotenv.config();
const jwt = require('jsonwebtoken');

const validate = (req, res, next) => {
  const err = validationResult(req);
  if (!err.isEmpty()) {
    //  #swagger.responses[400] = {BadRequest:1}
    return res.status(400).json(resDataJson(requestDoc.BadRequest,err.array()));
  }
  return next(); // 다음 할 일로 가라! (미들웨어, 함수)
}

const authenticateJWT = (req, res, next) => {
  //  #swagger.security = [{ "bearerAuth": [] }]
  const token = req.headers['authorization']; // Bearer 토큰 형식으로 받음
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  if (token) {
    // Bearer 접두사 제거
    const accessToken = token.split(' ')[1];

    jwt.verify(accessToken, PRIVATE_KEY, (err, user) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          // #swagger.responses[403] = {TokenExpired:1}
          return res.status(403).json(requestDoc.TokenExpired); // 만료된 토큰
        } else if (err.name === 'JsonWebTokenError') {
          // #swagger.responses[403] = {InvalidJwt:1}
          return res.status(403).json(requestDoc.InvalidJwt); // 잘못된 토큰
        } else {
          // #swagger.responses[403] = {InvalidJwt:1}
          return res.status(403).json(requestDoc.InvalidJwt); // 기타 오류
        }
      }
      conn.query(`SELECT * FROM user WHERE us_idx = ?`, [user.us_idx], (err, result) => {
        if (err) {
          // #swagger.responses[500] = {BackEnd:1}
          return res.sendStatus(500).json(resDataJson(requestDoc.BackEnd,err));
        }
        if (!result.length) {
          // #swagger.responses[403] = {InvalidJwt:1}
          return res.status(403).json(requestDoc.InvalidJwt); // 잘못된 토큰
        }
        if (result[0].us_is_use === 0) {
          // #swagger.responses[403] = {OutMember:1}
          return res.status(400).json(requestDoc.OutMember); // 잘못된 토큰
        }
        req.user = user.us_idx; // 사용자 정보 저장
        next();
      })
    });
  } else {
    //  #swagger.responses[401] = {UnAuth:1}
    return res.status(401).json(requestDoc.UnAuth); // Unauthorized
  }
};

module.exports = {
  validate,
  authenticateJWT,
}