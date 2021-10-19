const question_duration = 90;
const queen_voting = "queen?";

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
   { key: "QUEEN", info: "There is only one Queen. If the queen leaves the swarm, a new queen is being voted." }
];

var Flags = {
   STOP: 0,
   MINORITY: 1,
   SECOND:2
}

var flagData = [
   { key: "STOP", img:"/images/stop.svg", info: `Set this only, if a proposal is a:<ul><li style="list-style-image: none;"><strong>lie</strong> or scientifically obvious <strong>wrong</strong> statement.</li>
      <li style="list-style-image: none;"><strong>Troll</strong> message with harmful content.</li>
      <li><strong>Not</strong> if you do not like the proposal.</li></ul>`},
   { key: "MINORITY", img: "/images/minority.svg", info: `Set this flag only, if a proposal is <strong>harmful</strong> against a minority.` },
   { key: "SECOND", img: "/images/second.svg", info: `Set this flag if you want a proposalas to be an additional, a <strong>second answer</strong>. If there are enough votes (votes + flag-votes) this may happen.` },
]

class User {
   constructor(obj_or_name, swarm) {
      if (obj_or_name.name){
         this.name = obj_or_name.name;
         this.swarm = obj_or_name.swarm;
         this.private_id = obj_or_name.private_id;
         this.rank = obj_or_name.rank;
         this.id = obj_or_name.id;
         this.all_ids = obj_or_name.all_ids;
      } else {
         this.name = obj_or_name;
         this.swarm = swarm;
         this.private_id;
         this.rank; //is undefined by default. server sets the rank.
         this.id;
         this.all_ids = [];
      }
 //the fist socket.id a user gets, is his id. user saves that in local storage. if socket.id changes, those ids are stored here, to find user easily
      this.connected = false;
   }

   is_queen() {return (this.rank == Rank.QUEEN);}

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

   has_active_question(){
      return (this.question != undefined && this.start != undefined && (Date.now() - this.start) / 1000 < question_duration);
   }

   reset(){
      this.question = undefined;
      this.start = undefined;
      this.proposals = [];
   }
}

class Proposal {
   constructor (obj_or_user, text){
      if (obj_or_user.user!= undefined) {
         this.user = obj_or_user.user;
         this.text = obj_or_user.text;
         this.votes = obj_or_user.votes;
      } else {
         this.user = obj_or_user;
         this.text = text;
         this.votes = {}; //key is type of vote (flag or "text" )
      }
   }

   add_vote(vote){
      if (!this.votes[vote.type]) this.votes[vote.type] = [];
      this.votes[vote.type].push(vote);
   }

   id() { return this.user.id+this.text; }

   /** type = "text": vote for text of proposal, flag: votes for that flag, undefined: result for the proposal including all votes and flags (except SECOND-flag) */
   value(type){
      let result = 0;
      if (type == undefined){
         result = this.value("text");
         const stop = Math.max(0, this.value(Flags.STOP));
         const minor = this.value(Flags.MINORITY);
         // const second = this.value(Flags.SECOND);
         // console.log(`stop: ${stop}, text: ${result}, result: ${result - (Math.pow(2, stop) + 1)}`);
         if (stop) result -= Math.pow(2,stop) + 1;
         if (minor && minor >= this.votes["text"].length / 20) {
            let has_minus = false;
            for (let v of this.votes["text"]) if (v.v < 0) {has_minus = true; break;}
            return has_minus? 0 : result;
         }
         return result;

      } else if (this.votes[type]){
         for (let v of this.votes[type]) result += v.v;
         return result;

      } else if (type == "text") {
         return 0;

      } else {
         return undefined;
      }
   }
}

class Vote {
   /** type = undefined or a flag*/
   constructor(user, v, type){
      this.user = user;
      this.type = type;
      this.v = v;
   }
}

function proposal_sort(a, b) {
   if (a.value() < b.value()) return 1;
   if (a.value() > b.value()) return -1;
   return 0;
}

if (typeof module != "undefined") module.exports = {
   question_duration: question_duration,
   queen_voting: queen_voting,
   User: User,
   Swarm: Swarm,
   Proposal: Proposal,
   Vote: Vote,
   proposal_sort: proposal_sort,
   Rank: Rank,
   Flags: Flags,
};