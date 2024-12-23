// swagger.js

const swaggerAutogen = require('swagger-autogen')({ language: 'ko' });
const dotenv = require('dotenv');
const requestDoc = require('./requests')
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
	security: [
		{
			bearerAuth: []
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
			token: {
				token: "jwt 토큰"
			}
		},
	},
	tags: [
		{
			name: 'USER',
			description: '🧑‍💻 US 회원',
		},
		{
			name: 'GROUP',
			description: '👥 GR 모임',
		},
		{
			name: 'FRIEND',
			description: '🫂 FR 칭구'
		},
		{
			name: 'DIARY',
			description: '📓 DI 다이어리'
		},
		{
			name: 'PAGE',
			description: '📃 PA 페이지'
		}
	],
};

const outputFile = "./swagger-output.json"; // 같은 위치에 swagger-output.json을 만든다.
const endpointsFiles = [
	"./app.js" // 라우터가 명시된 곳을 지정해준다.
];

const generateSwaggerFile = async () => {
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

		delete jsonData.swagger; // 자동생성된 2.0용 없애기 3.0에는 openapi가 필용합니다

		const modifyValues = (responses) => {
			for (let statusCode in responses) {
				let schema = {};
				let exampleList = {};
				for (const example in responses[statusCode]) {
					if (example == "description") {
						continue;
					}
					let newExample = responses[statusCode][example]; // 내가 주석으로 적은 example 데이터 추출
					delete responses[statusCode][example]; // 그리고 삭제

					if (Object.keys(schema).length === 0 && newExample.data !== undefined) { // 스키마에는 data 스키마 쏘옥
						if (!doc.components.schemas[newExample.data] === undefined) {
							schema["$ref"] = "#components/schemas/" + newExample.data;
						}
					}
					let originExample = {};
					if (statusCode == 200) {
						originExample = structuredClone(requestDoc.success);
					} else {
						originExample = structuredClone(requestDoc[example]);
					}
					if (newExample.message !== undefined) originExample.message = newExample.message;
					if (newExample.code !== undefined) originExample.code = newExample.code;
					if (newExample.data !== undefined) originExample.data = newExample.data;

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


		for (let path in jsonData.paths) {
			for (let method in jsonData.paths[path]) {
				let deleteIndex = [];
				for (parameter in jsonData.paths[path][method].parameters) {
					let thisParam = jsonData.paths[path][method].parameters[parameter];
					if (thisParam.in !== undefined && thisParam.in === "body") {
						let requestbody = {
							content: { "application/json": {} }
						}
						requestbody.content["application/json"] = jsonData.paths[path][method].parameters[parameter];
						deleteIndex.push(parameter);
						jsonData.paths[path][method]["requestBody"] = requestbody;
					}
				}
				if(deleteIndex.length !== 0){
					deleteIndex.sort((a, b) => b - a);
					deleteIndex.forEach(index => jsonData.paths[path][method].parameters.splice(index, 1));
					if (jsonData.paths[path][method].parameters.length === 0) {
						delete jsonData.paths[path][method].parameters;
					}
				}
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

module.exports = async () => {

};

