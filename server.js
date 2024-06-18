require('dotenv').config();
const express = require("express");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);

const PORT = process.env.PORT || 3030;

const logger = require('./logger');
const expressWinston = require('express-winston');
// Middleware to log all requests
app.use(expressWinston.logger({
  winstonInstance: logger,
  statusLevels: true,
}));
// Middleware to log errors
app.use(expressWinston.errorLogger({
  winstonInstance: logger,
}));
app.use((err, req, res, next) => {
  logger.error('Something went wrong', err);
  res.status(500).send('Something broke!');
});

// Peer
const { ExpressPeerServer } = require("peer");
const peerServer = ExpressPeerServer(server, {
  debug: true,
});

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use("/peerjs", peerServer);

app.get("/", (req, rsp) => {
  console.log('req', req)

  const caseId = req.query.caseId;
  const userId = req.query.userId;

  // check in db
  /**
   * db schema will be like caseId , roomId, users (only allowed users)
   * caseId and users should be update while booking appointment (user id is required to restrict the user)
   * if when user comes here if caseId is not present return appropriate response
   * if user Id is not present return appropriate response in session details
   * if rooId is present return room id
   * if room id is not present create new room Id store in db and return room id
   */

  if (!caseId) {
    rsp.status(200).send("Case Id Not Found");
    return;
  }
  if (!userId) {
    rsp.status(200).send("User Id Not Found");
    return;
  }
  
  const roomId = caseId; // here roomId should be updated as per db response
  logger.info(`New User connected! ,room Id : ${roomId} , user id : ${userId} `);
  
  rsp.redirect(`/${roomId}`);

  // rsp.redirect(`/${roomId}`);
});

app.get("/:room", (req, res) => {
  res.render("room", { roomId: req.params.room });
});

io.on("connection", (socket) => {
  let tempUser;
  let tempRoom;
  socket.on("join-room", (roomId, userId) => {
    tempUser = userId;
    tempRoom = roomId;
    socket.join(roomId);
    logger.info(`New User Joined room! : ${roomId} , user id : ${userId} `);
    socket.to(roomId).broadcast.emit("user-connected", userId);

    socket.on("disconnect-user", (uId) => {
      logger.info(`User disconnected! : ${uId} `);
      socket.to(roomId).broadcast.emit("user-disconnected", uId);
    });

    socket.on("message", (message) => {
      logger.info(`create message! : ${uId} `);
      io.to(roomId).emit("createMessage", message);
    });
    
  });
  socket.on("disconnect", () => {
    logger.info(`socket disconnected! ${tempUser}`);
    socket.to(tempRoom).broadcast.emit("test-disconnect", tempUser);
  });
});

server.listen(PORT, () => {
logger.info(`Server running on PORT : ${PORT}`)
});
