// swagger.js

const { oneOf } = require('express-validator');
const { BAD_REQUEST } = require('http-status-codes');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const swaggerAutogen = require('swagger-autogen')({ language: 'ko' });
const dotenv = require('dotenv');
dotenv.config();


const doc = {
    info: {
        title: 'our_diary with Swagger',
        description: 'A simple CRUD API application made with Express and documented with Swagger',
    },
    host: "localhost:"+process.env.PORT,
    schemes: ["http"],
    securityDefinitions: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          in: 'header',
          bearerFormat: 'JWT',
        },
      },
    tags: [
    {
        name: 'USER',
        description: 'US',
    },
    ],
    definitions: { // 여기에서 스키마 정의
        success_login: {
            message: '성공',
            code : 1,
            data : {$ref: '#/data/token'} 
                
        },
        success_user: {
            message: '성공',
            code : 1,
            data : {$ref: '#/data/user'} 
                
        },
        UserNotFound: {
            message:'회원이 존재하지 않음',
            code:  -1,
        },
        BadRequest: {
            message: '입력이 유효하지 않습니다.',
            code: -1,
        },
        BackEnd: {
            message: '서버 내부 오류',
            code: -3,
                
        },
    },
    data : {
        token: {
            type: 'object',
            properties: {
                token: { type: 'string', example: '사용자의 jwt 토큰' }
            }
        },
        user: {
            type: 'object',
            properties: {
                u_id: { type: 'string', example: '사용자 아이디' },
                u_password: { type: 'string', example: '사용자 비밀번호' }
            }
        },
    }
  };
  

const outputFile = "./swagger-output.json";	// 같은 위치에 swagger-output.json을 만든다.
const endpointsFiles = [
  "./app.js"					// 라우터가 명시된 곳을 지정해준다.
];

swaggerAutogen(outputFile, endpointsFiles, doc);