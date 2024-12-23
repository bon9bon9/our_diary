const express = require('express');
const app = express();

const dotenv = require('dotenv');
dotenv.config();

app.listen(process.env.PORT);

const swaggerScript = require('./swagger');
(async () => {
  await swaggerScript();
})();

const swaggerUi = require('swagger-ui-express');
const swaggerFile = require('./swagger-output.json');

// Swagger UI 경로 설정
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerFile));

const usersRouter = require('./routes/users');
app.use("/users",
  // #swagger.tags = ['USER']
  usersRouter);

const groupsRouter = require('./routes/groups');
app.use("/groups",
  //  #swagger.tags = ['GROUP']
  groupsRouter);

const friendsRouter = require('./routes/friends');
app.use("/friends",
  //  #swagger.tags = ['FRIEND']
  friendsRouter);

const diaryRouter = require('./routes/diary');
app.use("/diary",
  //  #swagger.tags = ['DIARY']
  diaryRouter);


// const pageRouter = require('./routes/page');
// app.use("/page",
//   //  #swagger.tags = ['PAGE']
//   pageRouter);

