const express = require('express');
const router = express.Router();

const { validate } = require('../common');
const {body, param, query} = require('express-validator');

const conn = require('../mariadb');
const {StatusCodes} = require('http-status-codes');
const {resJson, 
    resSuccessJson, 
    encodePwd, 
    comparePwd,
    getPagenateInfo} = require('../common');


router.use(express.json());

router.post('/login',[
    body('id').notEmpty().isString(),
    body('password').notEmpty().isString(),
    body('test_middleware').isString()
], (req, res) => {
    //  #swagger.summary = "US_04 로그인"
    const {id, pwd, test_code} = req.body;
    let sql = `SELECT * FROM user WHERE us_id = ? AND us_password = ?`;
    conn.query(sql, [id,pwd], (err,result) => {
        if(err) {
            // #swagger.responses[500] = { description: 'Internal server error' }
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(err);
        }
        StatusCodes.BAD_REQUEST
        if(!result.length){
            // #swagger.responses[403] = {  schema: {$ref: '#/definitions/UserNotFound'} }
            return res.status(StatusCodes.FORBIDDEN).json(resJson("회원이 존재하지 않음",-1));
        }
    });
    // #swagger.responses[200] = { schema: {$ref: '#/definitions/success_login'} }
    return res.json(resSuccessJson("hello"));
})

router.post('/hello',[
    body('test_middleware').isString()
], (req, res) => {
    

})

module.exports = router;
