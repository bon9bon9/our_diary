const express = require('express');
const router = express.Router();

const { validate, authenticateJWT } = require('../middleWare');
const {body, param, query} = require('express-validator');


const { login,
    join,
    changePwd,
    checkId,
    deleteUser } = require('../controller/userController');

router.use(express.json());

router.post('/login',[
    body('id').notEmpty().isString(),
    body('password').notEmpty().isString(),
    validate
], login)

router.post('/',[
    body('id').notEmpty().isString(),
    body('password').notEmpty().isString()
], join);

router.put('/',[
    body('oldPwd').notEmpty().isString(),
    body('newPwd').notEmpty().isString(),
    validate,
    authenticateJWT
], changePwd);

router.post('/check/id',[
    body('id').notEmpty().isString(),
    validate,
], checkId);

router.delete('/',[
    body("password").notEmpty().isString(),
    validate,
    authenticateJWT
], deleteUser);


module.exports = router;
