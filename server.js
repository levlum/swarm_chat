

// express und http Module importieren. Sie sind dazu da, die HTML-Dateien
// aus dem Ordner "public" zu veröffentlichen.
var express = require('express');
var shared = require('./public/shared');
var app = express();
var server = require('http').createServer(app);
var swarms = {};
var user_list = [];
var public_ids = {};
var timer;
// var user_ids = 0;

// Mit dieser zusätzlichen Zeile bringen wir Socket.io in unseren Server.
var io = require('socket.io')(server);

// Mit diesem Kommando starten wir den Webserver.
var port = process.env.PORT || 3000;
server.listen(port, function () {
   // Wir geben einen Hinweis aus, dass der Webserer läuft.
   const date = new Date();
   console.log("\n" + date.toLocaleDateString()+ "  "+ date.toLocaleTimeString()+': Webserver läuft und hört auf Port %d', port);
});

// Hier teilen wir express mit, dass die öffentlichen HTML-Dateien
// im Ordner "public" zu finden sind.
app.use(express.static(__dirname + '/public'));

// === Ab hier folgt der Code für den Chat-Server



// Hier sagen wir Socket.io, dass wir informiert werden wollen,
// wenn sich etwas bei den Verbindungen ("connections") zu 
// den Browsern tut. 
io.on('connection', function (socket) {
   // Die variable "socket" repräsentiert die aktuelle Web Sockets
   // Verbindung zu jeweiligen Browser client.

   // Kennzeichen, ob der Benutzer sich angemeldet hat 
   var addedUser = false;


   // Funktion, die darauf reagiert, wenn sich der Benutzer anmeldet
   socket.on('add user', add_user);

   function add_user(client_user) {
      // Benutzername wird in der aktuellen Socket-Verbindung gespeichert
      let user, swarm;
      // console.log("try adding client_user:", client_user, swarms[client_user.swarm]);


      //user allready logged in?
      if (user_list[client_user.private_id] != undefined 
         && client_user.name == user_list[client_user.private_id].name
         && client_user.swarm == user_list[client_user.private_id].swarm
         && (!client_user.is_queen || (swarms[client_user.swarm] != undefined && swarms[client_user.swarm].queen == user_list[client_user.private_id]))) {

         user = user_list[client_user.private_id];
         swarm = swarms[user.swarm];
         socket.join(user.swarm);

      } else {
         user = new shared.User(client_user);
         user.private_id = client_user.private_id || socket.id;
         user.id = client_user.id || io.engine.generateId();
         user_list[user.private_id] = user;
         // socket.user = user;
         // socket.swarm = swarmname;
         socket.join(user.swarm);

         swarm = swarms[user.swarm];
         // console.log(swarm, (swarm == undefined || swarm.queen == undefined));
         user.is_queen = (swarm == undefined || swarm.queen == undefined) && (user.is_queen == undefined 
            || user.is_queen);

         if (!swarm) {
            swarm = new shared.Swarm(user.swarm);
            swarms[user.swarm] = swarm;
         }

         if (user.is_queen) swarm.queen = user;

         user.swarm = swarm.name;
         // Alle Clients informieren, dass ein neuer Benutzer da ist.
         socket.to(user.swarm).emit('user joined', user.for_external_use());
         console.log(`add ${(user.is_queen ? "queen" : "drone")} ${user.name} to swarm "${user.swarm}"`);
      }


      //save same user under new socket.id
      if (user.private_id != socket.id && user.all_ids.indexOf(socket.id) < 0) {
         user.all_ids.push(socket.id);
         user_list[socket.id] = user;
      }
      //save public id to find user
      public_ids[user.id] = user;

      // Dem Client wird die "login"-Nachricht geschickt, damit er weiß,
      // dass er erfolgreich angemeldet wurde.
      let question_data;
      if (swarm.question != undefined && swarm.start != undefined && (Date.now() - swarm.start) / 1000 < shared.question_duration) {
         question_data = { is_queen: true, message: swarm.question, start: swarm.start, proposals: swarms.proposals };
      }

      const drones = [];
      const uniques = [];
      if (user.swarm != undefined) {
         for (const drone of Object.values(user_list)){ 
            if (drone != user && drone.connected && drone.swarm == user.swarm && uniques.indexOf(drone) < 0) {
               uniques.push(drone);
               drones.push(drone.for_external_use());
            }
         }
      }
      addedUser = true;
      user.connected = true;
      // console.log("all drones:", drones);
      socket.emit('login', { user: user, question: question_data, drones: drones});
   }

   // Funktion, die darauf reagiert, wenn sich ein Benutzer abmeldet.
   socket.on('remove user', (user) => {
      console.log("logging out: " + user.name);
      user = user_list[user.private_id];
      user_list[user.private_id] = undefined;
      for (let id of user.all_ids) user_list[id] = undefined;
      swarm = swarms[user.swarm];
      if (swarm && swarm.queen && swarm.queen.id == user.id) {
         //queen left the swarm!!
         swarm.queen = undefined;
         console.warn(`swarm "${swarm.name}" has no queen!`);
      }
      addedUser = false;
      socket.emit('logout');
      socket.to(user.swarm).emit("removed user", user.for_external_use());
   });

   // Oder Benutzer müssen sich nicht explizit abmelden. "disconnect"
   // tritt auch auf wenn der Benutzer den Client einfach schließt.
   socket.on('disconnect', function () {
      if (addedUser) {
         addedUser = false;
         leaving_user = user_list[socket.id];
         leaving_user.connected = false;
         console.log(leaving_user.name + " disconnected.");
         // if (swarms[leaving_user.swarm].queen == leaving_user) {
         //    swarms[leaving_user.swarm].queen = undefined;
         // }
         // users[socket.id] = undefined;
         // Alle über den Abgang des Benutzers informieren
         socket.to(leaving_user.swarm).emit('user left', leaving_user.for_external_use());
      }
   });


   // Funktion, die darauf reagiert, wenn ein Benutzer eine Nachricht schickt
   socket.on('new message', function (message, client_user) {
      console.log(`message from ${client_user.name}: ${message}`);
      let user = user_list[client_user.private_id];

      if (!user){
         add_user(client_user);
         user = user_list[client_user.private_id];
      }

      if (user && user.is_queen) {
         //QUEENS QUESTION

         timer = Date.now();
         swarms[user.swarm].question = message;
         swarms[user.swarm].start = timer;

         let message_data = {
            username: user.name,
            is_queen: user.is_queen,
            message: message,
            start: timer 
         };
         socket.emit('start question', message_data);
            // console.log("try to broadcast to swarm " + user.swarm);
         socket.to(user.swarm).emit('new message', message_data);

         for (let room of socket.rooms) console.log("sending "+message+" to", room);

         //send answer
         setTimeout(()=>{
            // console.log(user, swarms[user.swarm])
            let swarm = swarms[user.swarm];
            swarm.proposals.sort(shared.proposal_sort);
            swarm.proposals[0].user.rank = shared.Rank.FAMOUS;
            socket.to(user.swarm).emit("answer", { user: swarm.proposals[0].user, answer:swarm.proposals[0].text});
            socket.emit("answer", { user: swarm.proposals[0].user, answer: swarm.proposals[0].text });

            swarm.reset();
         }, shared.question_duration * 1000);


      } else if (user){
         //DRONES PROPOSAL

         //Send possible answer to all drones (and queen, but she will not vote).
         let swarm = swarms[user.swarm];
         let proposal = new shared.Proposal(user.for_external_use(), message);
         console.log("Send possible answer to all drones (and queen, but she will not vote): " + proposal.text);
         swarm.proposals.push(proposal);
         // socket.emit("proposal", proposal);
         socket.to(user.swarm).emit("proposal", proposal);
      }
   });

   socket.on('proposal vote', (vote, proposal) => {
      let client_user = vote.user;
      console.log(`proposal vote from ${client_user.name}: ${proposal.text} vote: ${vote.v}, type: ${vote.type}`);
      let user = user_list[client_user.private_id];

      if (!user) {
         add_user(client_user);
         user = user_list[client_user.private_id];
      }

      if (user && !user.is_queen){
         //check if vote is valid
         let swarm = swarms[user.swarm];
         for (let p of swarm.proposals){
            if (p.text == proposal.text && p.user.name == proposal.user.name){
               let found = false;
               let votes_list = p.votes[vote.type];
               if (votes_list) {
                  for (const v of votes_list){
                     if (v.user.id == user.id) {
                        v.v = vote.v;
                        found = true;
                        console.log("found old value");
                        break;
                     }
                  }
               }
               if (!found){
                  if (!p.votes[vote.type]) p.votes[vote.type] = [];
                  p.votes[vote.type].push(vote);
               }

               if (user.id != p.user.id && vote.v > 0 && vote.type == undefined && p.user.rank < shared.Rank.RESPONSIBLE){
                  //the author of the proposal got a positive vote! promotion!
                  public_ids[p.user.id].rank = shared.Rank.RESPONSIBLE;
               }

               socket.to(user.swarm).emit("proposal", p);
               socket.emit("proposal", p);
               break;
            }
         }
      }
   });


});
