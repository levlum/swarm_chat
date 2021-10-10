
$(function () {
   // Hilfsvariablen für HTML-Elemente werden mit Hilfe von JQuery gesetzt.
   var $window = $(window);
   var $usernameInput = $('#usernameInput'); // Eingabefeld für Benutzername
   var $swarmnameInput = $('#swarmnameInput'); // Eingabefeld für Benutzername
   var $proposals = $('.proposals');           // Liste mit Chat-Nachrichten
   var $queensMessage = $('#queensMessage');   // Eingabefeld für Chat-Nachricht
   var $droneMessage = $('#droneMessage');   // Eingabefeld für Chat-Nachricht     // Login-Seite
   var $queenPage = $('.queen.page');
   var $dronePage = $('.drone.page');
   var $log = $(".log");

   // $dronePage.show();

   var user;
   var proposals = [];
   var logged_in = false;
   // var is_queen = false;                  
   var connected = false;

   // Eingabefeld für Benutzername erhält den Fokus
   var $currentInput = $usernameInput.focus();

   // Socket.io Objekt anlegen
   var socket = io('http://vhjk6s.myvserver.online:3000', {
      reconnectionDelay: 1000,
      reconnection: true,
      reconnectionAttemps: 10,
      transports: ['websocket'],
      agent: false,
      upgrade: false,
      rejectUnauthorized: false
   });

   // ==== Code für Benutzerschnittstelle

   // localStorage.removeItem("swarmchat_user");

   //load data from local storage
   if (localStorage.swarmchat_user != undefined) {
      // console.log(localStorage.swarmchat_user);
      user = JSON.parse(localStorage.swarmchat_user);
      $usernameInput.val(user.name);
      $swarmnameInput.val(user.swarm);
      login();
   }


   // Tastendruck behandeln
   $usernameInput.on("input", toggle_b_login);
   $usernameInput.on("focusout", toggle_b_login);
   $swarmnameInput.on("input", toggle_b_login);
   $swarmnameInput.on("focusout", toggle_b_login);



   // Benutzername, swarm name wird am server gesetzt
   $(".b_login").on("click", e => {
      if (e.target.textContent == "join") login();
      else socket.emit('remove user', user);
   });

   $(".queen .b_send_message").on("click", e => {
      sendMessage($queensMessage);
   });

   $(".drone .b_send_message").on("click", e => {
      sendMessage($droneMessage);
   });

   $(".b_info").on("click", e => {
      let ranks_html = "";
      for (const rank of rankData) { ranks_html += `<li><strong>${rank.key}</strong>: ${rank.info}</li>`; };

      let flags_html = [];
      for (const [flag, val] of Object.entries(Flags)) { flags_html.push(`${val.info}`); };
      modal_dialog({
         title: "Rules and Principles",
         content: `
      <h3>Usage</h3>
      <p>A swarm has many drones and only one queen. The queen's interface has a mask to ask a question. Only drones can propose answers and discuss the matter privately for a short time. Afterwards, one answer is presented to the queen.</p>
      <p>Don't read queen's questions as questions to you personally. All questions are addressed to the swarm. Think as a drone, a borg member of a hive-mind. An example: If the queen asks for your name: "What is your name?" Then she wants to know the name of the swarm. The name, the swarm gives itself. The swarm chat is best used with more than seven drones. </p>
      <h3>Ranks</h3>
      <p>A drone can reach ${rankData.length} ranks:</p>
      <ol>${ranks_html}</ol>
      <h3>Flags</h3>
      <ul>
         <li class="li_img_stop" ><strong>${flagData[Flags.STOP].key}</strong><br>${flagData[Flags.STOP].info}
             Every additional stop-flag on a proposal dubbles the negative influence.</li><br>
         <li><strong>${flagData[Flags.MINORITY].key}</strong><br>${flagData[Flags.MINORITY].info}<br>If at least 5% of all drones that voted on this propossal set this flag, it counts as a <strong>minority-proposal</strong>: Then any negative vote sets the whole vote of the proposal to 0.</li>
      </ul>
      <h3>Data Protection</h3>
      <p>All data is saved in the swarm. There is no database on the server. No cookies are set. All known data of a drone is stored in the client browser's local storage. This data is being sent to the server in case of a server reboot. All data of past queen's questions and proposals are deleted immediately after sending the result to the swarm.
      In the case of contradicting information of drones, the server uses the information that is sent from more drones or in the case of equal numbers, from the drone that sent the data first.</p>
      <h3>License</h3>
      <p>created by Lev Lumesberger. Source, mechanics and all creative elements are freely usable under <a href="https://creativecommons.org/licenses/by/4.0/deed.de">CC BY 4.0</a> with one important condition: <br><strong>All decisions are overruled by the human rights charta of the united nations. if a dicission is contradicting those rights.</strong></p>`,
         style: { "margin-top": "5em", width: "80vw" }
      });
   });

   $(".md_b_close").on("click", e => { $("#modal_dialog").fadeOut(); })
   $("#modal_dialog").on("click", e => {if (e.target.getAttribute("id") == "modal_dialog") $("#modal_dialog").fadeOut(); });
   function modal_dialog(data) {
      console.log(data);
      if (data.style) $(".md_window").css(data.style);
      $(".md_header h3").text(data.title);
      $(".md_content").html(data.content);
      $(".md_buttons").empty().hide();
      if (data.buttons) {
         $(".md_buttons").show();
         for (let b of data.buttons) {
            let new_button = $(`<button>${b.text}</button>`).on("click", b.action);
            $(".md_buttons").append(new_button);
         }
      }
      $("#modal_dialog").fadeIn();
   }




   function toggle_b_login(e) {
      if ($swarmnameInput.val().trim().length > 2 && $usernameInput.val().trim().length > 2) {
         $(".b_login").fadeIn();
      } else {
         $(".b_login").fadeOut();
      }
   }

   function login() {
      // Benutzername aus Eingabefeld holen (ohne Leerzeichen am Anfang oder Ende).
      username = $usernameInput.val().trim();
      swarmname = $swarmnameInput.val().trim();
      if (localStorage.swarmchat_user) {
         let stored_user = JSON.parse(localStorage.swarmchat_user);
         if (stored_user.name != username || stored_user.swarm != swarmname) {
            localStorage.removeItem("swarmchat_user");
            logged_in = false;

            user = new User(username, swarmname);
         } else {
            user = stored_user;
         }
      } else {
         user = new User(username, swarmname);
      }

      // console.log("logging in: "+user.name, user, logged_in);
      // Prüfen, ob der Benutzername nicht leer ist
      if (!logged_in && user.name && user.swarm) {
         $(".b_login").fadeOut();

         // Server mit Socket.io über den neuen Benutzer informieren. Wenn die
         // Anmeldung klappt wird der Server die "login"-Nachricht zurückschicken.
         socket.emit('add user', user);
      }
   }

   // Chat-Nachricht versenden
   function sendMessage($inputMessage) {
      let message = $inputMessage.val().trim();
      // Prüfen, ob die Nachricht nicht leer ist und wir verbunden sind.
      if (message && logged_in) {
         // Eingabefeld auf leer setzen
         $inputMessage.val('');

         add_proposal(new Proposal(user, message));

         // Server über neue Nachricht informieren. Der Server wird die Nachricht
         // an alle anderen Clients verteilen.
         socket.emit('new message', message, user);
      }
   }

   function start_timer(start) {
      $(".timer").fadeIn();
      console.log("start", start);
      const elapsed = (Date.now() - start);
      let left_duration = question_duration * 1000 - elapsed;

      // console.log(`Date.now(): ${Date.now()}, start: ${start}, elapsed: ${elapsed}, left_duration: ${left_duration/1000}`);

      let draw = SVG.adopt($(".timer")[0]);
      // draw.rect(100,5).fill("none").stroke({width:2, color: "red"});
      let rects = draw.group();
      for (let i = 0; i < 10; i++) {
         rects.rect(9, 5).move(i * 10, 0).radius(1).fill("var(--color_main_lighter)").stroke({ width: 0.3, color: "var(--color_main)" });
      }
      let bar = draw.rect(left_duration / 600, 5).fill("var(--color_main_light)");
      bar.maskWith(rects.clone());

      bar.animate(left_duration).ease("-").width(0).after(() => { $(".timer").empty() });
   }


   // Protokollnachricht zum Chat-Protokoll anfügen
   function log(message) {
      $log.append(`<p>${message}</p>`);
      $log.scrollTop = $log.scrollHeight;
   }

   // Chat-Nachricht zum Chat-Protokoll anfügen
   function start_queens_question(data) {
      if (data.is_queen) {

         log("queens question: " + data.message);
         $(".queen.question").text(`Queen's Question: ${data.message}`);
         $(".swarm.answer").fadeIn();
         if (!user.is_queen) $dronePage.fadeIn();

         proposals = [];
         if (user.is_queen) $dronePage.fadeOut();
         $proposals.empty();
         start_timer(data.start);

      }
      // else {
      //    var $usernameDiv = $('<span class="username"/>').text(data.username);
      //    var $messageBodyDiv = $('<span class="messageBody">').text(data.message);
      //    var $messageDiv = $('<li class="message"/>').append($usernameDiv, $messageBodyDiv);

      //    $messages.append($messageDiv);
      // }
   }

   function add_proposal(proposal) {
      if (user.is_queen) return;

      //existing proposal?
      proposal = new Proposal(proposal);
      let existing = false;
      for (let i = 0; i < proposals.length; i++) {
         let old_p = proposals[i];
         if (old_p.text == proposal.text && old_p.user_id == proposal.user_id) {
            proposals[i] = proposal;
            existing = true;
            break;
         }
      }
      if (!existing) proposals.push(proposal);

      update_proposal_html();
   }

   function update_proposal_html() {
      $proposals.empty();

      // console.log(proposals);
      proposals.sort(proposal_sort);

      proposals.forEach((p, i) => {
         let $proposal = $($("#temp_proposal").html()).attr("data-index", i);
         $proposals.append($proposal);
         $proposal = $(`.proposal[data-index=${i}]`);
         // console.log($proposal);
         for (const [key, flag] of Object.entries(Flags)){
            if (p.value(flag) != undefined) $proposal.prepend(`<img src="${flagData[flag].img}">`);
         }
         $proposal.find(".proposal_text").text(`${p.text} (${p.value()})`);
         
         $proposal.find(".b_up").on("click", e => {
            $(e.target).prop('disabled', true);
            socket.emit("proposal vote", new Vote(user, 1), p);
         });
         $proposal.find(".b_down").on("click", e => {
            $(e.target).prop('disabled', true);
            socket.emit("proposal vote", new Vote(user, -1), p);
         });

         $proposal.find(".b_flags").on("click", e => {
            let list = $($("#temp_flags_list").html(), { id: "l_flags_" + i });
            // list.offset($(e.target).offset());
            $(e.target.parentElement).append(list);
            list.css({ left: $(e.target).position().left });

            $(".flags_entry").on("click", e => { list.fadeOut(300, () => { list.remove(); }) });
            $(".b_flag_stop").on("click", e => {
               modal_dialog({ title: "Stop flag", content: Flags.STOP.info, 
                  buttons: [{ text: "Set flag", action: () => { socket.emit("proposal vote", new Vote(user, 1, Flags.STOP), p); } }, { text: "cancel", action: () => { $("#modal_dialog").fadeOut();} }]
               });
            });
         });

         for (let v of p.votes) {
            if (v.user_id == user.id) {
               //allready voted
               if (v.value == 1) $proposal.find(".b_up").prop('disabled', true);
               else $proposal.find(".b_down").prop('disabled', true);
            }
         }
      });
   }

   function append_to_userlist(drone) {
      let $joined_user_div = $(`<div class="list_entry" data-user_id="${drone.id}">${drone.name}<img src="images/${drone.is_queen ? "queen" : "bee"}.png"></div>`);
      $joined_user_div.data("user", drone);
      $(".swarm_list").append($joined_user_div);
      log(drone.name + ' joined as ' + (drone.is_queen ? "queen" : "drone"));
   }

   // ==== Code für Socket.io Events

   socket.on("connect", () => {
      connected = true;
      if (logged_in) {
         //there was a disconnect earlier, ...
         logged_in = false;
         login();
      }
   });

   // Server schickt "login": Anmeldung war erfolgreich
   socket.on('login', function (data) {
      user = data.user;
      // console.log("logged in", user);
      log(`${user.name}, welcome to the swarm "${user.swarm}"`);
      logged_in = true;
      toggle_b_login();
      localStorage.swarmchat_user = JSON.stringify(user);
      $(".b_login").text("leave");

      $(".swarm.title").text(`You are ${user.is_queen ? "the queen of" : "a drone in"} the swarm ${user.swarm}`);
      $(".swarm_list").empty();
      append_to_userlist(user);
      for (let drone of data.drones) append_to_userlist(drone);


      if (user.is_queen) {
         $queenPage.fadeIn();
         $("body").css({ "background-color": "var(--color_queen)" });
         $(".queen.question").text("Please send a question to the swarm!");
      } else {

         if (data.question) {
            start_queens_question(data.question);
         }
      }
   });

   socket.on('logout', () => {
      log(user.name + " left");
      toggle_b_login();
      $(".b_login").text("join");
      $("body").css({ "background-color": "unset" });
      logged_in = false;
      localStorage.removeItem("swarmchat_user");
      $(".swarm.title").text("You are a free drone without any swarm.");
      $(".queen.question").text("");
   });

   // Server schickt "new message": Neue Nachricht zum Chat-Protokoll hinzufügen
   socket.on('new message', function (data) {
      console.log("message from server:", data);
      start_queens_question(data);
   });
   socket.on('start question', function (data) {
      start_queens_question(data);
   });
   socket.on('answer', function (data) {
      let text = `The swarm's answer: "${data.answer}" given by the famous ${data.user.name}`;
      $(".swarm.answer").text(text);
      $dronePage.fadeOut();
      log(text);
   });
   socket.on('proposal', add_proposal);

   // Server schickt "user joined": Neuen Benutzer im Chat-Protokoll anzeigen
   socket.on('user joined', function (joined_user) {
      if ($(`.list_entry[data-user_id="${joined_user.id}"]`).length == 0) {
         append_to_userlist(joined_user);
      }
   });

   // Server schickt "user left": Benutzer, der gegangen ist, im Chat-Protokoll anzeigen
   socket.on('user left', function (leaving_user) {
      const $leaving_user_div = $(`.list_entry[data-user_id="${leaving_user.id}"]`);
      log(leaving_user.name + " left");
      console.log("user left:", leaving_user, $leaving_user_div);
      $leaving_user_div.remove();
   });

   socket.on("connect_error", (err) => {
      if (connected) log(`connect_error due to "${err.message}"`);
      connected = false;
   });
});
