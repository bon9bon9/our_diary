// enums/mysqlErrors.js

const MySQLErrors = Object.freeze({
    ER_DUP_ENTRY: {
        code: 'ER_DUP_ENTRY',
        mysqlCode: 1062,
        message: '중복된 엔트리입니다. 고유 제약 조건을 위반했습니다.'
    },
    ER_ROW_IS_REFERENCED_2: {
        code: 'ER_ROW_IS_REFERENCED_2',
        mysqlCode: 1451,
        message: '해당 행은 다른 테이블에서 참조되고 있습니다. 삭제할 수 없습니다.'
    },
    ER_NO_REFERENCED_ROW: {
        code: 'ER_NO_REFERENCED_ROW',
        mysqlCode: 1216,
        message: '참조된 행이 존재하지 않습니다. 외래 키 제약 조건을 확인하세요.'
    },
    ER_ROW_IS_REFERENCED: {
        code: 'ER_ROW_IS_REFERENCED',
        mysqlCode: 1217,
        message: '해당 행은 다른 테이블에서 참조되고 있습니다.'
    },
    // 필요한 다른 오류 코드와 메시지 추가
});

module.exports = MySQLErrors;
