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

