const conn = require('../mariadb');
const {StatusCodes} = require('http-status-codes');
const {resJson, 
    resDataJson,
    resSuccessJson, 
    encodePassword, 
    getPagenateInfo
} = require('../common');
const MySQLErrors = require('../mysqlErrors');
const jwt = require('jsonwebtoken');
const requestDoc = require('../requests');

const login =  (req, res) => {
    //  #swagger.summary = "US_04 로그인"
    const {id, password} = req.body;
    const newPassword = encodePassword(password);
    let sql = `SELECT * FROM user WHERE us_id = ? AND us_password = ?`;
    conn.query(sql, [id,newPassword], (err,result) => {
        if(err) {
            // #swagger.responses[500] = {BackEnd:1}
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(resDataJson(requestDoc.BackEnd,err));
        }
        if(!result.length){
            // #swagger.responses[403] = {UserNotFound:1}
            return res.status(StatusCodes.FORBIDDEN).json(requestDoc.UserNotFound);
        }
        token = jwt.sign({
            us_idx : result[0].us_idx
        }, process.env.PRIVATE_KEY,{
            expiresIn :'1h'
        });
        // #swagger.responses[200] = {1:{data:"token"}}
        res.cookie("token",token,{httpOnly:true}).json(resSuccessJson(token))
    });
};

const join = (req, res) => {
    //  #swagger.summary = "US_01 회원 가입"
    const {id, password} = req.body;
    const newPassword = encodePassword(password);
    let sql = `INSERT INTO user(us_id, us_password, us_is_use) VALUES(?,?,1)`;
    conn.query(sql, [id,newPassword], (err,result) => {
        if(err){
            if(err.code === MySQLErrors.ER_DUP_ENTRY.code){
                //  #swagger.responses[400] = {DuplicateUserId:1}
                return res.status(StatusCodes.BAD_REQUEST).json(requestDoc.DuplicateUserId);
            }
            // #swagger.responses[500] = {BackEnd:1}
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(resDataJson(requestDoc.BackEnd,err));
        }
        // #swagger.responses[200] = {1:1}
        res.json(resSuccessJson());
    });
};

const changePwd = (req, res) => {
    //  #swagger.summary = "US_02 비밀번호 변경"
    const {oldPwd, newPwd} = req.body;
    const encodeOldPwd = encodePassword(oldPwd);
    const encodeNewPwd = encodePassword(newPwd);
    let sql = `SELECT * FROM user WHERE us_idx = ? AND us_password =?`;
    conn.query(sql, [req.user, encodeOldPwd], (err, result) => {
        if(err){
            // #swagger.responses[500] = {BackEnd:1}
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(resDataJson(requestDoc.BackEnd,err));
        }
        if(!result.length){
            // #swagger.responses[400] = {WrongPassword:1}
            return res.status(StatusCodes.BAD_REQUEST).json(requestDoc.WrongPassword);
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
};

const checkId = (req,res) => {
    //  #swagger.summary = "US_01_01 아이디 중복 확인"
    const {id} = req.body;
    let sql = `SELECT * FROM user WHERE us_id = ?`;
    conn.query(sql, [id], (err, result) => {
        if(err){
            // #swagger.responses[500] = {BackEnd:1}
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(resDataJson(requestDoc.BackEnd,err));
        }
        if(result.length){
            // #swagger.responses[400] = {DuplicateUserId:1}
            return res.status(StatusCodes.BAD_REQUEST).json(requestDoc.DuplicateUserId);
        }
        // #swagger.responses[200] = {1:1}
        res.json(resSuccessJson());
    })
};

const deleteUser = async (req,res) => {
    //  #swagger.summary = "US_03 회원 탈퇴"
    const {password} = req.body;
    const us_idx = req.user;
    const newPassword = encodePassword(password);

    try{
        await conn.promise().beginTransaction();

        let checkPassword = `SELECT * FROM user WHERE us_idx = ? AND us_password = ?`;
        const user = await conn.promise().query(checkPassword, [us_idx, newPassword]);
        if(!user.length){
            //  #swagger.responses[400] = {WrongPassword:1}
            return res.status(StatusCodes.BAD_REQUEST).json(requestDoc.WrongPassword);
        }

        // 진행 중인 일기가 있는지 확인
        let checkDiary = `SELECT *
        FROM diary AS di
        LEFT JOIN groups AS gr ON di.groups_idx = gr.gr_idx
        LEFT JOIN friend AS fr ON gr.gr_idx = fr.groups_idx
        LEFT JOIN user AS us ON fr.user_idx = us.us_idx
        WHERE us.us_idx = ? AND di.di_state = 1`
        const diary = await conn.promise().query(checkDiary, [us_idx]);
        if(diary.length){
            // #swagger.responses[400] = {CantOut:1}
            return res.status(StatusCodes.BAD_REQUEST).json(requestDoc.CantOut)
        }
        
        // 회원 탈퇴
        let updateUser = `UPDATE user INTO us_is_use = 0 WHERE us_idx = ?`;
        await conn.promise().query(updateUser, [us_idx]);

        // 친구 설정 끊기
        let updateFriend = `UPDATE friend INTO fr_state = 0 WHERE user_idx = ?`;
        await conn.promise().query(updateFriend, [us_idx]);

        await conn.promise().commit();

        // #swagger.responses[200] = {1:1}
        return res.json(resSuccessJson());
    }catch(err){
        await conn.promise().rollback();
        // #swagger.responses[500] = {BackEnd:1}
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(resDataJson(requestDoc.BackEnd,err));
    }
};

module.exports = {
    login,
    join,
    changePwd,
    checkId,
    deleteUser
}