var express = require("express");
var app = express();
const fs = require('fs');
let sslOptions = {
        key: fs.readFileSync('C:/privkey.key'),//里面的文件替换成你生成的私钥
        cert: fs.readFileSync('C:/cacert.pem')//里面的文件替换成你生成的证书
};
var https = require('https').createServer(sslOptions, app);  
var io = require('socket.io')(https);

var nameList=[];
 
//收到get请求则发送html文档
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/client.html');
});

app.get('/test', (req, res) => {
    res.sendFile(__dirname + '/test.html');
})
    
//使用静态文件夹，连通css/js
app.use(express.static('public'));

//开启服务器
var server = https.listen(3000, () => {
  var host = server.address().address == "::" ? "127.0.0.1" : server.address().port;
  var port = server.address().port;
  var path = "";
  console.log("访问地址为 https://%s:%s%s", host, port, path);
});

io.on("connection", (socket) => {
    //连接加入子房间
        socket.join( socket.id );
        function sendAll(req,data){
            socket.broadcast.emit(req,data);
        }
        function recv(req,res){
            socket.on(req,res);
        }
        console.log("a user connected " + socket.id);

        recv("disconnect", () => {
            console.log("user disconnected: " + socket.id);
        //某个用户断开连接的时候，我们需要告诉所有还在线的用户这个信息
        sendAll('user disconnected', socket.id);
    });
    
    recv("chat message",(msg) => {
        console.log(socket.id + " say: " + msg);
        sendAll("chat message", msg);
    });
    
    //当有新用户加入，打招呼时，需要转发消息到所有在线用户。
    recv('new user greet', (data) => {
        console.log(data);
        console.log(socket.id + ' greet ' + data.msg);
        sendAll('need connect', {sender: socket.id, msg : data.msg});
    });
    //在线用户回应新用户消息的转发
    recv('ok we connect', (data) => {
        io.to(data.receiver).emit('ok we connect', {sender : data.sender});
    });
    
    //sdp 消息的转发
    recv( 'sdp', ( data ) => {
          console.log('sdp');
          console.log(data.description);
          //console.log('sdp: ' + data.sender + ' to:' + data.to);
          socket.to( data.to ).emit( 'sdp', {
              description: data.description,
              sender: data.sender
         } );
    } );
    
    //candidates 消息的转发
    recv( 'ice candidates', ( data ) => {
        console.log('ice candidates: ');
        console.log(data);
        socket.to( data.to ).emit( 'ice candidates', {
            candidate: data.candidate,
            sender: data.sender
         } );
    } );
});
    