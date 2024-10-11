const express = require('express');
const router = express.Router();

const { validate, authenticateJWT } = require('../middleWare');
const {body, param, query} = require('express-validator');

const conn = require('../mariadb');
const {StatusCodes} = require('http-status-codes');
const {resJson, 
    resSuccessJson, 
    encodePassword, 
    comparePassword,
    getPagenateInfo
} = require('../common');
const MySQLErrors = require('../mysqlErrors');
const jwt = require('jsonwebtoken');

router.use(express.json());

router.post('/login',[
    body('id').notEmpty().isString(),
    body('password').notEmpty().isString(),
    validate
], (req, res) => {
    //  #swagger.summary = "US_04 로그인"
    const {id, password} = req.body;
    const newPassword = encodePassword(password);
    let sql = `SELECT * FROM user WHERE us_id = ? AND us_password = ?`;
    conn.query(sql, [id,newPassword], (err,result) => {
        if(err) {
            // #swagger.responses[500] = {BackEnd:1}
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(err);
        }
        if(!result.length){
            // #swagger.responses[403] = {UserNotFound:1}
            return res.status(StatusCodes.FORBIDDEN).json(resJson("회원이 존재하지 않음",-1));
        }
        token = jwt.sign({
            us_idx : result[0].us_idx
        }, process.env.PRIVATE_KEY,{
            expiresIn :'1h'
        });
        // #swagger.responses[200] = {1:{data:"token"}}
        res.cookie("token",token,{httpOnly:true}).json(resSuccessJson(token))
    });
})

router.post('/',[
    body('id').notEmpty().isString(),
    body('password').notEmpty().isString()
], (req, res) => {
    //  #swagger.summary = "US_01 회원 가입"
    const {id, password} = req.body;
    const newPassword = encodePassword(password);
    let sql = `INSERT INTO user(us_id, us_password, us_is_use) VALUES(?,?,1)`;
    conn.query(sql, [id,newPassword], (err,result) => {
        if(err){
            if(err.code === MySQLErrors.ER_DUP_ENTRY.code){
                //  #swagger.responses[400] = {DuplicateUserId:1}
                return res.status(StatusCodes.BAD_REQUEST).json(resJson("중복 아이디",-1));
            }
            // #swagger.responses[500] = {BackEnd:1}
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(err);
        }
        // #swagger.responses[200] = {1:1}
        res.json(resSuccessJson());
    });
})

router.put('/',[
    body('oldPwd').notEmpty().isString(),
    body('newPwd').notEmpty().isString(),
    validate,
    authenticateJWT
], (req, res) => {
    //  #swagger.summary = "US_02 비밀번호 변경"
    const {oldPwd, newPwd} = req.body;
    const encodeOldPwd = encodePassword(oldPwd);
    const encodeNewPwd = encodePassword(newPwd);
    let sql = `SELECT * FROM user WHERE us_idx = ? AND us_password =?`;
    conn.query(sql, [req.user, encodeOldPwd], (err, result) => {
        if(err){
            // #swagger.responses[500] = {BackEnd:1}
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(err);
        }
        if(!result.length){
            // #swagger.responses[400] = {WrongPassword:1}
            return res.status(StatusCodes.BAD_REQUEST).json(resJson("잘못된 비밀번호 입니다.",-3));
        }
        let updateSql = `UPDATE user SET us_password = ? WHERE us_idx = ?`;
        conn.query(updateSql, [encodeNewPwd, req.user], (err, result) => {
            if(err){
                // #swagger.responses[500] = {BackEnd:1}
                return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(err);
            }
            // #swagger.responses[200] = {1:1}
            res.json(resSuccessJson());
        });
    })
});

router.post('/check/id',[
    body('id').notEmpty().isString(),
    validate,
], (req,res) => {
    //  #swagger.summary = "US_01_01 아이디 중복 확인"
    const {id} = req.body;
    let sql = `SELECT * FROM user WHERE us_id = ?`;
    conn.query(sql, [id], (err, result) => {
        if(err){
            // #swagger.responses[500] = {BackEnd:1}
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(err);
        }
        if(result.length){
            // #swagger.responses[400] = {DuplicateUserId:1}
            return res.status(StatusCodes.BAD_REQUEST).json(resJson("중복된 아이디 입니다.",-1));
        }
        // #swagger.responses[200] = {1:1}
        res.json(resSuccessJson());
    })
});

router.delete('/',[
    body("password").notEmpty().isString(),
    validate,
    authenticateJWT
], async (req,res) => {
    const {password} = req.body;
    const us_idx = req.user;
    const newPassword = encodePassword(password);

    try{
        await conn.promise().beginTransaction();

        let checkPassword = `SELECT * FROM user WHERE us_idx = ? AND us_password = ?`;
        const user = await conn.promise().query(checkPassword, [us_idx, newPassword]);
        if(!user.length){
            //  #swagger.responses[400] = {WrongPassword:1}
            return res.status(StatusCodes.BAD_REQUEST).json(resJson("비밀번호 틀림",-3));
        }

        let checkDiary = `SELECT *
        FROM diary AS di
        LEFT JOIN groups AS gr ON di.groups_idx = gr.gr_idx
        LEFT JOIN friend AS fr ON gr.gr_idx = fr.groups_idx
        LEFT JOIN user AS us ON fr.user_idx = us.us_idx
        WHERE us.us_idx = ? AND di.di_state = 1`
        const diary = await conn.promise().query(checkDiary, [us_idx]);
        if(user.length){

        }
        
        let updateUser = `UPDATE user INTO us_is_use = 0 WHERE us_idx = ?`;
        await conn.promise().query(updateUser, [us_idx]);

        let updateFriend = `UPDATE friend INTO fr_state = 0 WHERE user_idx = ?`;
        await conn.promise().query(updateFriend, [us_idx]);

        await conn.promise().commit();

        return res.json(resSuccessJson());
    }catch(err){
        await conn.promise().rollback();
        // #swagger.responses[500] = {BackEnd:1}
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(err);
    }
});


module.exports = router;
