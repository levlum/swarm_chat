

// express und http Module importieren. Sie sind dazu da, die HTML-Dateien
// aus dem Ordner "public" zu veröffentlichen.
var express = require('express');
var shared = require('./public/shared');
var app = express();
var server = require('http').createServer(app);
var swarms = {};
var user_list = {};
var public_ids = {};
var timer;
var timeout_id;
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

   //user logged in but lost connection?
   let user = user_list[socket.id];
   if (user) {
      addedUser = true;
      user.connected = true;
      console.log(user.name + " connected.");
      socket.to(leaving_user.swarm).emit('user joined', user.for_external_use());
   }

   // Kennzeichen, ob der Benutzer sich angemeldet hat 
   var addedUser = false;


   /** checks, if there is a queen and no running queen's question */
   /** if so: start request for a new queen */
   function check_for_queen(user) {
      if (user == undefined) return;

      let queen;
      for (const drone of Object.values (user_list)) {
         // console.log(drone, drone.is_queen());
         if (drone && drone.is_queen() && drone.swarm == user.swarm) {
            queen = drone;
            break;
         }
      }

      const swarm = swarms[user.swarm];
      // console.log(queen, swarm, user_list);
      if (queen == undefined && Object.values(user_list).length>0 && swarm && !swarm.has_active_question()){
         console.log("start finding new queen.");

         send_queens_question(shared.queen_voting, user);
      
      } 
      else if (queen && swarm && swarm.has_active_question() && swarm.question == shared.queen_voting && swarm.proposals.length == 0){
         //former queen is here again and no other wants to be new queen

         clearTimeout(timeout_id);
         let data = { question: swarm.question, answer: `Former queen ${queen.name} returnd to office.` }
         socket.to(user.swarm).emit("answer", data);
         socket.emit("answer", data);
         swarm.reset();
      }
   }

   function send_queens_question(message, user){ 
      //QUEENS QUESTION

      timer = Date.now();
      swarms[user.swarm].question = message;
      swarms[user.swarm].start = timer;

      let message_data = {
         username: (message == shared.queen_voting ? "the swarm" :user.name),
         is_queen: (message == shared.queen_voting ? true : user.is_queen()),
         message: message,
         start: timer
      };
      socket.emit('start question', message_data);
      // console.log("try to broadcast to swarm " + user.swarm);
      socket.to(user.swarm).emit('new message', message_data);

      for (let room of socket.rooms) console.log("sending " + message + " to", room);

      //send answer
      timeout_id = setTimeout(() => {
         // console.log("send answer. swarm:", swarms[user.swarm])
         timeout_id = undefined;
         let swarm = swarms[user.swarm];
         let data = { question: swarm.question }
         if (swarm.proposals.length > 0){
            swarm.proposals.sort(shared.proposal_sort);
            let winners = [];
            data.proposals = [];
            let min = swarm.proposals[0].value();
            for (let p of swarm.proposals) {
               if (p.value() >= min) {
                  if (message != shared.queen_voting || winners.length == 0){
                     winners.push (public_ids[p.user.id]);
                     data.proposals.push(p);
                  }
               
               } else if (message != shared.queen_voting && p.value(shared.Flags.SECOND) != undefined && p.value(shared.Flags.SECOND) > 0) {
                  //second answer?
                  let sum = p.value() + p.value(shared.Flags.SECOND);
                  if (sum >= min) {
                     winners.push(public_ids[p.user.id]);
                     data.proposals.push(swarm.proposals[1]);
                  }
               }
            }

            if (message == shared.queen_voting) {
               // console.log(swarm.proposals[0], user_list);
               winners[0].rank = shared.Rank.QUEEN;
               swarm.queen = winners[0];

            } else {
               for (let winner of winners){
                  winner.rank = shared.Rank.FAMOUS;
               }
            }
         
         } else {
            //no proposal. no answer
            data.answer = "Much thinking. No answer."
         }

         socket.to(user.swarm).emit("answer", data);
         socket.emit("answer", data);

         swarm.reset();
         check_for_queen(user);
      }, shared.question_duration * 1000);

   }

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
         && (client_user.rank != shared.Rank.QUEEN || (swarms[client_user.swarm] != undefined && swarms[client_user.swarm].queen == user_list[client_user.private_id]))) {

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
         // console.log(io.sockets.adapter.rooms.get(user.swarm));

         swarm = swarms[user.swarm];
         if (!swarm) {
            swarm = new shared.Swarm(user.swarm);
            swarms[user.swarm] = swarm;
         }

         // console.log(swarm, (swarm == undefined || swarm.queen == undefined));
         if ((swarm == undefined || swarm.queen == undefined) && (user.rank == undefined || user.is_queen())) {
            user.rank = shared.Rank.QUEEN;
            swarm.queen = user;
         
         } else if (user.rank == undefined) {

            user.rank = shared.Rank.INVISIBLE;
         }


         //former queen looses rank, if new queen is about to be voted
         if (user.is_queen() && swarm && swarm.has_active_question() && swarm.question == shared.queen_voting && swarm.proposals.length > 0) {
            user.rank = shared.Rank.INVISIBLE;
         }


         user.swarm = swarm.name;
         console.log(`add ${(user.is_queen() ? "queen" : "drone")} ${user.name} to swarm "${user.swarm}"`);
      }
      
      // Alle Clients informieren, dass ein neuer Benutzer da ist.
      socket.to(user.swarm).emit('user joined', user.for_external_use());


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
      if (swarm.has_active_question()) {
         question_data = { is_queen: true, message: swarm.question, start: swarm.start, proposals: swarms.proposals };
      }

      const drones = [];
      const uniques = [];
      if (user.swarm != undefined) {
         for (const drone of Object.values(user_list)){ 
            if (drone && drone != user && drone.connected && drone.swarm == user.swarm && uniques.indexOf(drone) < 0) {
               uniques.push(drone);
               drones.push(drone.for_external_use());
            }
         }
      }
      addedUser = true;
      user.connected = true;
      // console.log("all drones:", drones);
      socket.emit('login', { user: user, question: question_data, drones: drones});

      check_for_queen(user);
   }

   // Funktion, die darauf reagiert, wenn sich ein Benutzer abmeldet.
   socket.on('remove user', (user) => {
      console.log("logging out: " + user.name);
      user = user_list[user.private_id];

      //remove from all lists
      user_list[user.private_id] = undefined;
      for (let id of user.all_ids) user_list[id] = undefined;
      public_ids[user.id] = undefined;

      swarm = swarms[user.swarm];
      if (swarm && swarm.queen && swarm.queen.id == user.id) {
         //queen left the swarm!!
         swarm.queen = undefined;
         console.warn(`swarm "${swarm.name}" has no queen!`);
      }
      addedUser = false;
      socket.emit('logout');
      socket.to(user.swarm).emit("user left", user.for_external_use());
      check_for_queen(user);
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

      if (user && user.is_queen()) {
         send_queens_question(message, user);

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
      let user = public_ids[vote.user.id];
      // console.log(`proposal vote from ${user.name}: ${proposal.text} vote: ${vote.v}, type: ${vote.type}`);

      if (!user) {
         console.warn("could not find user:",vote.user);
         add_user(client_user);
         user = user_list[client_user.private_id];
      }

      if (user && !user.is_queen()){
         //check if vote is valid
         let swarm = swarms[user.swarm];
         for (let p of swarm.proposals){
            if (p.text == proposal.text && p.user.id == proposal.user.id){
               let found = false;
               let votes_list = p.votes[vote.type];
               if (votes_list) {
                  for (const v of votes_list){
                     // console.log((v.user.id == user.id), (v.type == undefined || v.v != 0), v);
                     if (v.user.id == user.id) {
                        //info: if type is a Flag with v=0 (first vote for a flag), then that user may not vote for it
                        if (v.type == "text" || v.v != 0) v.v = vote.v;
                        found = true;
                        // console.log("found old value", v.v, v.type);
                        break;
                     }
                  }
               }
               if (!found){
                  if (!p.votes[vote.type]) p.votes[vote.type] = [];
                  p.votes[vote.type].push(vote);
               }

               if (user.id != p.user.id && vote.v > 0 && vote.type == "text" && p.user.rank < shared.Rank.RESPONSIBLE){
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
