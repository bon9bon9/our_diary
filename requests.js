/**
 * @typedef {Object} RequestResponse
 * @property {string} message - 응답 메시지
 * @property {number} code - 응답 코드
 */

/**
 * @type {{ [key: string]: RequestResponse }}
 */
const requestDoc = {
  success: {
    message: '성공',
    code: 1
  },
  UserNotFound: { // 403 : FORBIDDEN
    message: '회원이 존재하지 않음',
    code: -1
  },
  DuplicateUserId: { // 409 : CONFLICT
    message: '중복된 아이디 입니다.',
    code: -2
  },
  WrongPassword: { // 400
    message: '잘못된 비밀번호 입니다.',
    code: -3
  },
  OutMember: { // 400
    message: '탈퇴 회원 입니다',
    code: -4
  },
  CantOut: { // 409
    message: '진행중인 일기가 있어 탈퇴하지 못합니다',
    code: -6
  },
  CantUpdateGroup: { // 409
    message: '일기가 진행된 후로는 초대 방식을 바꾸지 못함',
    code: -7
  },
  NoGroup: { // 400
    message: 'code에 해당되는 모임 없음',
    code: -8
  },
  NoInvite: { // 409 conflict
    message: '검색 입장 불가로 설정된 모임',
    code: -9
  },
  HaveDiary : { // 409 conflict
    message: '일기를 작성한 모임에는 가입 불가',
    code: -10
  },
  AlreadyWritingDiary : { // 409 conflict
    message : '이미 일기를 작성중인 그룹입니다',
    code : -11
  },
  WrongDiaryDate : { // 409 conflict
    message : "일기를 읽은 날과 오늘 사이 날짜의 일기를 적어야 합니다",
    code : -12
  },
  BackEnd: { // 500
    message: '서버 내부 오류',
    code: -1000,
    data: "에러 메세지"
  },
  BadRequest: { // 400
    message: '입력이 유효하지 않습니다.',
    code: -1001
  },
  UnAuth: { // 401
    message: 'jwt 토큰이 없음',
    code: -1002
  },
  InvalidJwt: { // 403
    message: '잘못된 jwt 입니다',
    code: -1003
  },
  TokenExpired: { // 403
    message: '만료된 jwt 입니다',
    code: -1004
  },
}

module.exports = requestDoc;