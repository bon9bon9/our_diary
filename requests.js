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
        message: '성공' ,
        code: 1
    },
    UserNotFound: {
        message:  '회원이 존재하지 않음' ,
        code:  -1
    },
    DuplicateUserId: {
        message:  '중복된 아이디 입니다.' ,
        code:  -2
    },
    WrongPassword: {
        message:  '잘못된 비밀번호 입니다.' ,
        code:  -3
    },
    OutMember: {
        message : '탈퇴 회원 입니다',
        code : -4
    },
    WrongJwt : {
        message : '잘못된 jwt 입니다',
        code : -5
    },
    CantOut : {
        message :'진행중인 일기가 있어 탈퇴하지 못합니다',
        code : -6
    },
    CantUpdateGroup : {
        message : '일기가 진행된 후로는 초대 방식을 바꾸지 못함',
        code : -7
    },
    NoGroup :{
        message : 'code에 해당되는 모임 없음',
        code : -8
    },
    BackEnd: {
        message:  '서버 내부 오류' ,
        code:  -1000,
        data : "에러 메세지"
    },
    BadRequest: {
        message:  '입력이 유효하지 않습니다.' ,
        code:  -1001
    },
    UnAuth : {
        message : '미인증 회원, jwt 토큰이 없거나 만료됨',
        code : -1002
    },
}

module.exports = requestDoc;