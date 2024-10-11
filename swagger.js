// swagger.js

const { oneOf } = require('express-validator');
const { BAD_REQUEST } = require('http-status-codes');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const swaggerAutogen = require('swagger-autogen')({ language: 'ko' });
const dotenv = require('dotenv');
const { application } = require('express');
dotenv.config();

const doc = {
    openapi: "3.0.0", // OpenAPI 3.0
    info: {
        title: 'our_diary with Swagger',
        description: 'A simple CRUD API application made with Express and documented with Swagger',
        version: '1.0.0', // API 버전 추가
    },
    servers: [
        {
            url: "http://localhost:" + process.env.PORT // 서버 URL 설정
        }
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
            },
        },
        schemas: { // 스키마 정의
            token : {
                token : "jwt 토큰"
            }
        },
    },
    request : {
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
        BackEnd: {
            message:  '서버 내부 오류' ,
            code:  -1000
        },
        BadRequest: {
            message:  '입력이 유효하지 않습니다.' ,
            code:  -1001
        },
        UnAuth : {
            message : '미인증 회원, jwt 토큰이 없거나 만료됨',
            code : -1002
        },
    },
    tags: [
        {
            name: 'USER',
            description: 'US',
        },
    ],
};

const outputFile = "./swagger-output.json"; // 같은 위치에 swagger-output.json을 만든다.
const endpointsFiles = [
    "./app.js" // 라우터가 명시된 곳을 지정해준다.
];

const generateSwaggerFile = async() => {
    await swaggerAutogen(outputFile, endpointsFiles, doc);
    const fs = require('fs');

    fs.readFile(outputFile, 'utf8', (err, data) => {
        if (err) {
            console.error('파일을 읽는 중 오류 발생:', err);
            return;
        }
    
        // JSON 파싱
        let jsonData;
        try {
            jsonData = JSON.parse(data);
        } catch (parseError) {
            console.error('JSON 파싱 오류:', parseError);
            return;
        }
    
        delete jsonData.swagger;
    
        const modifyValues = (responses) => {
            for (let statusCode in responses) {
                let schema = {};
                let exampleList = {};
                for(const example in responses[statusCode]){
                    if(example == "description"){
                        continue;
                    }
                    let newExample = responses[statusCode][example]; // 내가 주석으로 적은 example 데이터 추출
                    delete responses[statusCode][example]; // 그리고 삭제

                    if(Object.keys(schema).length === 0 && newExample.data !== undefined){ // 스키마에는 data 스키마 쏘옥
                        schema["$ref"] = "#components/schemas/"+newExample.data;
                    }

                    let originExample = {};
                    if(statusCode == 200){
                        originExample = doc.request.success;
                    }else{
                        originExample = doc.request[example];
                    }
                    if(newExample.message !== undefined) originExample.message = newExample.message;
                    if(newExample.code !== undefined) originExample.code = newExample.code;
                    if(newExample.data !== undefined) originExample.data = newExample.data;

                    exampleList[example] = {};
                    exampleList[example]["value"] = originExample; // exampleList에 example 추가
                }
                // 'application/json'에 대한 content가 정의되어 있는지 확인
                responses[statusCode]["content"] = {};
                responses[statusCode]["content"]["application/json"] = {};
                responses[statusCode].content["application/json"].schema = schema;
                responses[statusCode].content["application/json"].examples = exampleList;
            }
            
        };
    
        for(let path in jsonData.paths){
            for(let method in jsonData.paths[path]){
                modifyValues(jsonData.paths[path][method].responses);
            }
        }
        
        // 수정된 데이터를 JSON 문자열로 변환
        const updatedData = JSON.stringify(jsonData, null, 2); // pretty print
    
        // 수정된 데이터 저장
        fs.writeFile(outputFile, updatedData, 'utf8', (err) => {
            if (err) {
                console.error('파일 저장 중 오류 발생:', err);
                return;
            }
        });
    });
    
}

generateSwaggerFile();

module.exports = async() => {

};

