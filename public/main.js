
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
   var socket = io('https://swarmchat.org', {
      reconnectionDelay: 1000,
      reconnection: true,
      reconnectionAttemps: 10,
      transports: ['websocket'],
      agent: false,
      upgrade: false,
      rejectUnauthorized: false
   });


   // ==================================================
   // check for small screen size
   // ==================================================
   function is_mobile() {
      return window.matchMedia("only screen and (max-width: 600px)").matches;
   }
   // ==== Code für Benutzerschnittstelle

   // localStorage.removeItem("swarmchat_user");

   //load data from local storage
   if (localStorage.swarmchat_user != undefined) {
      // console.log(localStorage.swarmchat_user);
      user = new User( JSON.parse(localStorage.swarmchat_user));
      $usernameInput.val(user.name);
      $swarmnameInput.val(user.swarm);
      login();
   }


   // Tastendruck behandeln
   $usernameInput.on("input", toggle_b_login);
   $usernameInput.on("focusout", toggle_b_login);
   $swarmnameInput.on("input", toggle_b_login);
   $swarmnameInput.on("focusout", toggle_b_login);

   $(".b_request_queen").on("click", e => {
      if (user && logged_in){
         sendMessage(user.name+" for queen.");
         $(".b_request_queen").fadeOut();
      }
   });

   $("#b_hamburger").on("click", e => {
      $(".black_bg").fadeIn();
      $(".login").css({display:"flex"}).fadeIn();

      $(".black_bg").on("click", e => {
         if (e.target == $(".black_bg")[0]){
            $(".black_bg").fadeOut();
            $(".login").fadeOut();
         }
      });
   });

   // Benutzername, swarm name wird am server gesetzt
   $(".b_login").on("click", e => {
      if (e.target.textContent == "join") login();
      else socket.emit('remove user', user);

      if (is_mobile()) {
         $(".login").fadeOut();
         $(".black_bg").fadeOut();
      }
   });

   $(".queen .b_send_message").on("click", e => {
      sendMessage($queensMessage);
   });

   $(".drone .b_send_message").on("click", e => {
      sendMessage($droneMessage);
   });

   //open close log
   $(".b_open_close_log").on("click", e => {
      if (window.getComputedStyle(e.target.parentElement).bottom == "0px") {
         e.target.parentElement.style.bottom = "-7em";
         $("#log_svg_up").show();
         $("#log_svg_down").hide();

      } else {
         e.target.parentElement.style.bottom = "0px";
         $("#log_svg_up").hide();
         $("#log_svg_down").show();
      }
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
         <li class="li_img_minority" ><strong>${flagData[Flags.MINORITY].key}</strong><br>${flagData[Flags.MINORITY].info}<br>If at least 5% of all drones that voted on this propossal set this flag, it counts as a <strong>minority-proposal</strong>: Then any negative vote sets the whole vote of the proposal to 0.</li>
      </ul>
      <h3>Background</h3>
      <p>Nature seems to build <strong>information-networks</strong> whenever possible. Biological cells have an internal exchange of information. Cells structured themselves evolutionary and organised connected life forms like animals and plants. Amimals and plants started building ways of information exchange between individuals with different kinds of language. We are maybe in an exciting time. People start building groups that tend to think as a new combined entity. 
      Communities are intellectually supperior to individual humans, at least in many ways (Communities can build computers and rockets). The whole world is connected in a way, that every part of that network seems to "feel" what's going on in all other parts of the network. Next generations will remember that as the <strong>times of great pain</strong>. We need to build damping mechanisms. It's hurting to feel everything, way better to feel important and true news only.
      What's important and what's true can be decided best by many. Nodes of self suffitiant information-networks do not just evaluate and forward information, they do that for mostly chemical reasons (if it comes to biological networks). In technical networks, its algorithms that decide how to evaluate and forward a signal. In the spirit of "digital humanity" the evaluation of signals in human networks has to follow human opinions, feelings and beliefs.
      </p><p>The <strong>Swarm Chat</strong> is a step in the direction of letting a community think for itself. Results of queen's questions are visible to outsiders in real time. This leads to a feeling of being (part of) an entity and it makes recursive processes possible. The next result will depend on earlier results leading to a loop of internal dependencies (compare cybernetics of second order).</p>
      <h3>Data Protection</h3>
      <p>All data is saved in the swarm. There is no database on the server. No cookies are set. All known data of a drone is stored in the client browser's local storage. This data is being sent to the server in case of a server reboot. All data of past queen's questions and proposals are deleted immediately after sending the result to the swarm.
      In the case of contradicting information of drones, the server uses the information that is sent from more drones or in the case of equal numbers, from the drone that sent the data first.</p>
      <h3>License</h3>
      <p>created by Lev Lumesberger. Source, mechanics and all creative elements are freely usable under <a href="https://creativecommons.org/licenses/by/4.0/deed.de">CC BY 4.0</a> with one important condition: <br><strong>All decisions are overruled by the human rights charta of the united nations. In case a dicission is contradicting those rights.</strong></p>`,
         style: { "margin-top": "5em", width: "80vw" }
      });
   });

   $(".md_b_close").on("click", e => { $("#modal_dialog").fadeOut(); });
   $("#modal_dialog").on("click", e => {if (e.target.getAttribute("id") == "modal_dialog") $("#modal_dialog").fadeOut(); });
   function modal_dialog(data) {
      console.log(data);
      if (data.style) $(".md_window").css(data.style);
      $(".md_header h3").html(data.title);
      $(".md_content").html(data.content);
      $(".md_buttons").empty().hide();
      if (data.buttons) {
         $(".md_buttons").show();
         for (let b of data.buttons) {
            let new_button = $(`<button class="md_button">${b.text}</button>`).on("click", b.action);
            $(".md_buttons").append(new_button);
         }
         $(".md_button").on("click", e => { $("#modal_dialog").fadeOut(); });
      }
      $("#modal_dialog").fadeIn();
   }


   function reset_page() {
      toggle_b_login();
      $(".b_login").text("join");
      $("body").css({ "background-color": "unset" });
      $(".swarm.title").text("You are a free drone without any swarm.");
      $(".swarm.answer").text("");
      $(".queen.question").text("");
      $(".swarm_list").empty();
      $(".b_request_queen").hide();
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
            user = new User(stored_user);
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
      let message;
      if ($inputMessage instanceof jQuery) {
         message = $inputMessage.val().trim();
      } else {
         message = $inputMessage;
      }
      // Prüfen, ob die Nachricht nicht leer ist und wir verbunden sind.
      if (message && logged_in) {
         // Eingabefeld auf leer setzen
         if ($inputMessage instanceof jQuery) $inputMessage.val('');

         // console.log("usi busi", user);
         if (!user.is_queen()) add_proposal(new Proposal(user, message));

         // Server über neue Nachricht informieren. Der Server wird die Nachricht
         // an alle anderen Clients verteilen.
         socket.emit('new message', message, user);
      }
   }

   function start_timer(start) {
      $(".timer").fadeIn();
      // console.log("start", start);
      const elapsed = (Date.now() - start);
      let left_duration = question_duration * 1000 - elapsed;

      // console.log(`Date.now(): ${Date.now()}, start: ${start}, elapsed: ${elapsed}, left_duration: ${left_duration/1000}`);

      let draw = SVG.adopt($(".timer")[0]);
      // draw.rect(100,5).fill("none").stroke({width:2, color: "red"});
      let rects = draw.group();
      for (let i = 0; i < 10; i++) {
         rects.rect(9, 5).move(i * 10, 0).radius(1).fill("var(--color_main_lighter)").stroke({ width: 0.3, color: "var(--color_main)" });
      }
      let bar = draw.rect((left_duration / (question_duration * 10)) , 5).fill("var(--color_main_light)");
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

         if (data.message == queen_voting) {
            log("queens question: Who becomes the queen?");
            $(".queen.question").text(`Queen's Question: Who becomes the queen?`);
            $(".b_request_queen").fadeIn();
            $(".create_proposal").fadeOut();

         } else {

            log("queens question: " + data.message);
            $(".queen.question").text(`Queen's Question: ${data.message}`);
            $(".create_proposal").fadeIn();
         }

         $(".swarm.answer").fadeOut();
         console.log(user);
         if (!user.is_queen()) $dronePage.fadeIn();

         proposals = [];
         if (user.is_queen()) $dronePage.fadeOut();
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
      if (user.is_queen()) return;

      //existing proposal?
      proposal = new Proposal(proposal);
      console.log(proposal.id(), proposal);
      let existing = false;
      for (let i = 0; i < proposals.length; i++) {
         let old_p = proposals[i];
         if (old_p.id() == proposal.id()) {
            proposals[i] = proposal;
            existing = true;
            break;
         }
      }
      if (!existing) proposals.push(proposal);

      update_proposal_html();
   }

   function update_proposal_html() {
      // $proposals.empty();

      // console.log(proposals);
      // proposals.sort(proposal_sort);

      proposals.forEach((p, i) => {
         let $proposal = $(`.proposal[data-id="${p.id()}"]`);
         // let $template = document.querySelector('#temp_proposal').content;
         if ($proposal.length == 0) {
            $proposals.append($($("#temp_proposal").html()).attr("data-id", p.id()));
            $proposal = $(`.proposal[data-id="${p.id()}"]`);
            console.log("created new proposal.");
         } else {
            // console.log("found old proposal.", $($("#temp_proposal").html()).html());
            $proposal.empty();
            $proposal.append($($("#temp_proposal").html()).html());
         }
         
         // console.log($proposal);
         for (const [key, flag] of Object.entries(Flags)){
            if (p.value(flag) != undefined) {
               let $support = $($("#temp_support").html()).attr("data-type", flag);
               $proposal.prepend($support);
               $proposal.prepend(`<img src="${flagData[flag].img}">(${p.value(flag)})`);
            }
         }
         let value = p.value();
         $proposal.css({"margin-left": value+"em"});
         $proposal.find(".proposal_text").text(`${p.text} (${value})`);
         $proposal.find(".proposal_text").after($("#temp_support").html());
         
         $proposal.find(".b_up").on("click", e => {
            $(e.target).prop('disabled', true);
            let type = $(e.target).closest(".support").data("type");
            if (type == undefined) type = "text";
            socket.emit("proposal vote", new Vote(user, 1, type), p);
         });
         $proposal.find(".b_down").on("click", e => {
            $(e.target).prop('disabled', true);
            let type = $(e.target).closest(".support").data("type");
            if (type == undefined) type = "text";
            socket.emit("proposal vote", new Vote(user, -1, type), p);
         });

         let $flags = $proposal.find(".b_flags");
         $(".flags_top").on("touch", e => {
            $(e.target).css({height: "-100%", opacity:0});
         });
         $(".b_flags").on("mouseenter", function(e) {
            //remove top to show the flags
            $(this).find(".flags_top").css({ bottom: "-100%", opacity: 0 });
            // $(this).find(".flags_top").fadeOut();
         });
         $(".b_flags").on("mouseleave", function(e) {
            $(this).find(".flags_top").css({ bottom: "0", opacity: 1 });
            $(this).find(".flags_top").fadeIn();
         });
         // .on("click", e => {
         //    let $list = $(`<div class="flags_list">`);
         //    $(e.target.parentElement).append($list);
            for (const flag of flagData){
               //TODO test, if flag == SECOND and if questin is queen_voting: then do not add this flag.
               
               if (p.value(Flags[flag.key]) == undefined){
                  $flags.prepend(`<button class="b_flag_${flag.key} flags_entry"><img src="${flag.img}"></button>`);
                  $(`.b_flag_${flag.key}`).on("click", e => {
                     modal_dialog({
                        title: `<img src="${flag.img}"> ${flag.key} flag`, content: flag.info,
                        buttons: [{ text: "Set flag", action: () => { socket.emit("proposal vote", new Vote(user, 0, Flags[flag.key]), p); } }, { text: "cancel" }]
                     });
                  });
               }
            }
            // $list.append(`<button class="b_flag_cancel flags_entry">cancel</button>`);
            // $list.css({ left: $(e.target).position().left });

         $(".flags_entry").on("click", function (e) { $(".flags_entry").find(".flags_top").css({ bottom: "0", opacity: 1 }); });

            // let list = $($("#temp_flags_list").html(), { id: "l_flags_" + i });
            // list.offset($(e.target).offset());
            // $(".b_flag_stop").on("click", e => {
            //    modal_dialog({ title: "Stop flag", content: flagData[Flags.STOP].info, 
            //       buttons: [{ text: "Set flag", action: () => { socket.emit("proposal vote", new Vote(user, 0, Flags.STOP), p); } }, { text: "cancel" }]
            //    });
            // });

            // $(".b_flag_minority").on("click", e => {
            //    modal_dialog({
            //       title: "Minority flag", content: flagData[Flags.MINORITY].info,
            //       buttons: [{ text: "Set flag", action: () => { socket.emit("proposal vote", new Vote(user, 0, Flags.MINORITY), p); } }, { text: "cancel" }]
            //    });
            // });
         // });

         for (const [key, v] of Object.entries (p.votes)) {
            if (v.user_id == user.id) {
               //allready voted
               if (v.value == 1) $proposal.find(`.support${key == "text"? "" :`[data-type="${key}"]`} .b_up`).prop('disabled', true);
               else $proposal.find(`.support${key == "text" ? "" : `[data-type="${key}"]`} .b_down`).prop('disabled', true);
            }
         }
      });
   }

   function setup_queen(){
      $queenPage.fadeIn();
      $("body").css({ "background-color": "var(--color_queen)" });
      $(".queen.question").text("Please send a question to the swarm!");
      $(".swarm.title").text(`You are the queen of ${user.swarm}.`);
   }

   function update_userlist(drone) {
      let $user_div = $(`.list_entry[data-user_id="${drone.id}"]`);
      $user_div.find("img").attr("src", `images/${drone.rank == Rank.QUEEN ? "queen" : "bee"}.png` );
   }
   function append_to_userlist(drone) {
      let $joined_user_div = $(`<div class="list_entry" data-user_id="${drone.id}">${drone.name}<img src="images/${drone.rank == Rank.QUEEN ? "queen" : "bee"}.png"></div>`);
      $joined_user_div.data("user", drone);
      $(".swarm_list").append($joined_user_div);
      log(drone.name + ' joined as ' + (drone.rank == Rank.QUEEN ? "queen" : "drone"));
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
      user = new User(data.user);
      // console.log("logged in", user);
      log(`${user.name}, welcome to the swarm "${user.swarm}"`);
      logged_in = true;
      toggle_b_login();
      localStorage.swarmchat_user = JSON.stringify(user);
      $(".b_login").text("leave");

      $(".swarm.title").text(`You are ${user.is_queen() ? "the queen of" : "a drone in"} the swarm ${user.swarm}`);
      $(".swarm_list").empty();
      append_to_userlist(user);
      for (let drone of data.drones) append_to_userlist(drone);


      if (user.is_queen()) {
         setup_queen();
      } else {

         if (data.question) {
            start_queens_question(data.question);
         }
      }
   });

   socket.on('logout', () => {
      log(user.name + " left");
      logged_in = false;
      localStorage.removeItem("swarmchat_user");

      reset_page();
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
      let text = `The swarm's answer: `;
      if (data.proposals != undefined && data.question != queen_voting) {
         for (let i = 0; i < data.proposals.length; i++) {
            text += (i == 0 ? "" : "\nand: ") + `${data.proposals[i].text} (by the famous ${data.proposals[i].user.name})`;
         }

      } else if (data.proposals != undefined && data.proposals.length==1 && data.question == queen_voting && data.proposals[0].user.id == user.id) {
         text += `${data.proposals[0].user.name} is new queen.`;
         user.rank = Rank.QUEEN;
         localStorage.swarmchat_user = JSON.stringify(user);
         setup_queen();
      }
      $(".swarm.answer").text(text).fadeIn();
      $dronePage.fadeOut();
      $(".b_request_queen").hide();
      $(".timer").empty();
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
