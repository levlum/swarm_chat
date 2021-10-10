const question_duration = 60;

var Rank = {
   INVISIBLE: 0,
   VISIBLE: 1,
   RESPONSIBLE: 2,
   RESPECTED: 3,
   FAMOUS: 4,
   QUEEN: 5
}

var rankData = [
   { key:"INVISIBLE", info: "A drone starts invisible." },
   { key:"VISIBLE", info: "Every drone, that supported an accepted proposal gets this promotion." },
   { key:"RESPONSIBLE", info: "A responsible drone flagged succsessfully a proposal." },
   { key:"RESPECTED", info: "A respected drone created a proposal that got at least 5% of the votes." },
   { key:"FAMOUS", info: "Famous drones proposed sucsessfully an answer." },
   { key:"QUEEN", info: "There is only one Queen." }
];

var Flags = {
   STOP: {
      short: "Stop", info: `<li class="li_img_stop"><strong>stop</strong><br>Drones may set a stop flag if they have the opinion, that this proposal has one of the following problems:
            <ul><li style="list-style-image: none;">lie or scientifically obvious wrong statement.</li>
             <li style="list-style-image: none;">Troll message with harmful content.</li></ul><br>
             Every additional stop-flag on a proposal dubbles the negative influence.</li>`},
   MINORITY: { 
      short: "minority", info: `<li><strong>be careful</strong> <img><br>Drones may set this flag, if in their opinion, this proposal is harmful against a minority.<br>If at least 5% of all drones that voted on this propossal set this flag, it counts as a <strong>minority-proposal</strong>: Any negative vote sets the whole voting-sum to 0.</li>`}
}

class User {
   constructor(obj_or_name, swarm) {
      if (obj_or_name.name){
         this.name = obj_or_name.name;
         this.swarm = obj_or_name.swarm;
         this.private_id = obj_or_name.private_id;
         this.is_queen = obj_or_name.is_queen;
      } else {
         this.name = obj_or_name;
         this.swarm = swarm;
         this.private_id;
         this.is_queen;
      }

      this.id;
      this.rank = Rank.INVISIBLE.key;
      this.all_ids = []; //the fist socket.id a user gets, is his id. user saves that in local storage. if socket.id changes, those ids are stored here, to find user easily
      this.connected = false;
   }

   for_external_use(){
      const result = {};
      for (const [key, value] of Object.entries(this)){
         switch (key){
            case "private_id": break;
            case "all_ids": break;
            case "connected": break;
            default: result[key] = value;
         }
      }
      return result;
   }
}

class Swarm {
   constructor (name){
      this.name = name;
      this.queen;
      this.question;
      this.start;
      this.proposals = [];
   }

   reset(){
      this.question = undefined;
      this.start = undefined;
      this.proposals = [];
   }
}

class Proposal {
   constructor (obj_or_user, text){
      if (obj_or_user.user) {
         this.user = obj_or_user.user;
         this.text = obj_or_user.text;
         this.votes = obj_or_user.votes;
      } else {
         this.user = obj_or_user;
         this.text = text;
         this.votes = [];
      }
   }

   value(){
      let result = 0;
      for (let v of this.votes) result += v.value;
      return result;
   }
}

function proposal_sort(a, b) {
   if (a.value() < b.value()) return 1;
   if (a.value() > b.value()) return -1;
   return 0;
}

if (typeof module != "undefined") module.exports = {
   question_duration: question_duration,
   User: User,
   Swarm: Swarm,
   Proposal: Proposal,
   proposal_sort: proposal_sort,
   Rank: Rank
};