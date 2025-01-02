const express = require('express');
const router = express.Router();

const { body, param, query } = require('express-validator');

router.use(express.json());

const { validate, authenticateJWT } = require('../middleWare');
const { createDiary, saveDiaryPages, deliverDiary, inviteFriend, receiveInvitition, readDiary, endDiary, getWritingPage, diaryUserState, getDoneDiaryList, getDiaryPageList } = require('../controller/diaryController');

router.post('/',[
  body('di_title').notEmpty().isString(),
  body('gr_idx').notEmpty().isInt(),
  body('di_total_cycle').notEmpty().isInt({min:2, max:50}),
  validate,
  authenticateJWT
], createDiary);

router.get('/done',[
  query('groups_idx').notEmpty().isInt(),
  query('page').optional().isInt(),
  query('size').optional().isInt(),
  validate,
  authenticateJWT
], getDoneDiaryList);

router.get('/page',[
  query('diary_idx').notEmpty().isInt(),
  validate,
  authenticateJWT
], getDiaryPageList);

router.get('/state',[
  authenticateJWT
], diaryUserState)

router.post('/page',[
  body('pa_content').notEmpty().isString(),
  body('diary_idx').notEmpty().isInt(),
  body('pd_date').notEmpty().isDate(),
  body('pd_title').notEmpty().isString(),
  body('pd_weather').notEmpty().isInt({min:1,max:5}),
  body('pages_idx').optional().isInt(),
  validate,
  authenticateJWT
], saveDiaryPages)

router.get('/page/writing',[
  query('diary_idx').notEmpty().isString(),
  validate,
  authenticateJWT
], getWritingPage);

router.post('/deliver',[
  body('diary_idx').notEmpty().isInt(),
  body('receiver_idx').notEmpty().isInt(),
  validate,
  authenticateJWT
], deliverDiary);

router.post('/invite',[
  body('diary_idx').notEmpty().isInt(),
  validate,
  authenticateJWT
], inviteFriend)

router.post('/invite/receive',[
  body('code').notEmpty().isString(),
  body("fr_nickname").notEmpty().isString(),
  validate,
  authenticateJWT
], receiveInvitition);

router.post('/read',[
  body('diary_idx').notEmpty().isInt(),
  validate,
  authenticateJWT
], readDiary);

router.post('/end', [
  body('diary_idx').notEmpty().isInt(),
  validate,
  authenticateJWT
], endDiary)

module.exports = router;
