const express = require('express');
const router = express.Router();

const { validate, authenticateJWT } = require('../middleWare');
const { body, param, query } = require('express-validator');


const { login,
  join,
  changePwd,
  checkId,
  deleteUser } = require('../controller/userController');

router.use(express.json());

router.post('/login', [
  body('id').notEmpty().isString(),
  body('password').notEmpty().isString(),
  // #swagger.parameters['body'] = {"required" : ['id','password'],"in":"body"}
  validate
], login)

router.post('/', [
  body('id').notEmpty().isString(),
  body('password').notEmpty().isString()
  // #swagger.parameters['body'] = {"required" : ['id','password'],"in":"body"}
], join);

router.put('/', [
  body('oldPwd').notEmpty().isString(),
  body('newPwd').notEmpty().isString(),
  // #swagger.parameters['body'] = {"required" : ['oldPwd','newPwd'],"in":"body"}
  validate,
  authenticateJWT
], changePwd);

router.post('/check/id', [
  body('id').notEmpty().isString(),
  // #swagger.parameters['body'] = {"required" : ['id'],"in":"body"}
  validate,
], checkId);

router.delete('/', [
  body("password").notEmpty().isString(),
  // #swagger.parameters['body'] = {"required" : ['password'],"in":"body"}
  validate,
  authenticateJWT
], deleteUser);


module.exports = router;
