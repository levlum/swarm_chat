

// express und http Module importieren. Sie sind dazu da, die HTML-Dateien
// aus dem Ordner "public" zu veröffentlichen.
var express = require('express');
var shared = require('./public/shared');
var app = express();
var server = require('http').createServer(app);
var swarms = {};
var user_list = [];
var timer;
// var user_ids = 0;

// Mit dieser zusätzlichen Zeile bringen wir Socket.io in unseren Server.
var io = require('socket.io')(server);

// Mit diesem Kommando starten wir den Webserver.
var port = process.env.PORT || 3000;
server.listen(port, function () {
   // Wir geben einen Hinweis aus, dass der Webserer läuft.
   console.log('Webserver läuft und hört auf Port %d', port);
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
      console.log("add_user", client_user);


      //user allready logged in?
      if (user_list[client_user.id] != undefined && client_user.name == user_list[client_user.id].name && client_user.swarm == user_list[client_user.id].swarm) {

         user = user_list[client_user.id];
         swarm = swarms[user.swarm];
         socket.join(user.swarm);
         // socket.user = user;
         // socket.swarm = swarmname;

      } else {
         user = new shared.User(client_user);
         user.id = client_user.id || socket.id;
         user_list[user.id] = user;
         // socket.user = user;
         // socket.swarm = swarmname;
         socket.join(user.swarm);
         addedUser = true;

         swarm = swarms[user.swarm];
         user.is_queen = ((swarm == undefined || swarm.queen == undefined) && user.is_queen == undefined) 
            || (user.is_queen != undefined && user.is_queen);

         if (!swarm) {
            swarm = new shared.Swarm(user.swarm);
            if (user.is_queen) swarm.queen = user;
            swarms[user.swarm] = swarm;
         }

         user.swarm = swarm.name;
         // Alle Clients informieren, dass ein neuer Benutzer da ist.
         socket.to(user.swarm).emit('user joined', user);
         console.log(`add ${(user.is_queen ? "queen" : "drone")} ${user.name} to swarm "${user.swarm}"`);
      }

      // Dem Client wird die "login"-Nachricht geschickt, damit er weiß,
      // dass er erfolgreich angemeldet wurde.
      let question_data;
      if (swarm.question != undefined && swarm.start != undefined && (Date.now() - swarm.start) / 1000 < shared.question_duration) {
         question_data = { is_queen: true, message: swarm.question, start: swarm.start, proposals: swarms.proposals };
      }

      let drones = [];
      for (const drone of Object.values(user_list)){ if (drone.swarm == user.swarm) drones.push(drone);};
      socket.emit('login', { user: user, question: question_data, drones: drones});
   }

   socket.on('remove user', (user)=>{
      console.log("logging out: "+user.name);
      user_list[user.id] = undefined;
      swarm = swarms[user.swarm];
      if (swarm && swarm.queen && swarm.queen.id == user.id) {
         //queen left the swarm!!
         swarm.queen = undefined;
         console.warn(`swarm "${swarm.name}" has no queen!`);
      }
      addedUser = false;
      socket.emit('logout');
      socket.to(user.swarm).emit("removed user", user);
   });

   // Funktion, die darauf reagiert, wenn ein Benutzer eine Nachricht schickt
   socket.on('new message', function (message, client_user) {
      console.log(`message from ${client_user.name}: ${message}`);
      let user = user_list[client_user.id];

      if (!user){
         add_user(client_user);
         user = user_list[client_user.id];
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
            let swarm = swarms[user.swarm];
            swarm.proposals.sort(shared.proposal_sort);
            proposals[0].user.rank = shared.Rank.FAMOUS;
            socket.to(user.swarm).emit("answer", { user: proposals[0].user, answer:swarm.proposals[0].text});
            socket.emit("answer", { user: proposals[0].user, answer: swarm.proposals[0].text });

            swarm.reset();
         }, shared.question_duration * 1000);


      } else if (user){
         //DRONES PROPOSAL

         //Send possible answer to all drones (and queen, but she will not vote).
         console.log("Send possible answer to all drones (and queen, but she will not vote).");
         let swarm = swarms[user.swarm];
         let proposal = new shared.Proposal(user, message);
         swarm.proposals.push(proposal);
         // socket.emit("proposal", proposal);
         socket.to(user.swarm).emit("proposal", proposal);
      }
   });
   socket.on('proposal vote', (client_user, proposal, value) => {
      console.log(`proposal vote from ${client_user.name}: ${proposal.text} vote: ${value}`);
      let user = user_list[client_user.id];

      if (!user) {
         add_user(client_user);
         user = user_list[client_user.id];
      }

      if (user && !user.is_queen){
         //check if vote is valid
         let swarm = swarms[user.swarm];
         for (let p of swarm.proposals){
            if (p.text == proposal.text && p.user.name == proposal.user.name){
               let found = false;
               for (let v of p.votes){
                  if (v.user_id == user.id) {
                     v.value = value;
                     found = true;
                     console.log("found old value");
                     break;
                  }
               }
               if (!found){
                  p.votes.push({user_id: user.id, value:value});
               }

               if (user.id != p.user.id && value > 0 && p.user.rank < shared.Rank.RESPONSIBLE){
                  //the author of the proposal got a positive vote! promotion!
                  p.user.rank = shared.Rank.RESPONSIBLE;
                  
               }

               socket.to(user.swarm).emit("proposal", p);
               socket.emit("proposal", p);
               break;
            }
         }
      }
   });


   // Funktion, die darauf reagiert, wenn sich ein Benutzer abmeldet.
   // Benutzer müssen sich nicht explizit abmelden. "disconnect"
   // tritt auch auf wenn der Benutzer den Client einfach schließt.
   socket.on('disconnect', function () {
      if (addedUser) {
         // Alle über den Abgang des Benutzers informieren
         socket.broadcast.emit('user left', socket.username);
      }
   });
});