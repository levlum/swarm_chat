const question_duration = 60;

var Rank = {
   INVISIBLE: {val:0, info:"A drone starts invisible."},
   VISIBLE: { val: 1, info: "Every drone, that supported an accepted proposal gets this promotion." },
   RESPONSIBLE: { val: 2, info: "A responsible drone flagged succsessfully a proposal." },
   RESPECTED: { val: 3, info: "A respected drone created a proposal that got at least 5% of the votes." },
   FAMOUS: { val: 5, info: "Famous drones proposed sucsessfully an answer." }
}

var Flags = {
   STOP: {
      short: "Stop", info: `<li class="li_img_stop"><strong>stop</strong><br>Drones may set a stop flag if they have the opinion, that this proposal has one of the following problems:
            <ul><li style="list-style-image: none;">lie or scientifically obvious wrong statement.</li>
             <li style="list-style-image: none;">Troll message with harmful content.</li></ul><br>
             Every additional stop-flag on a proposal dubbles the negative influence.</li>`},
   MINORITY: {short: "minrity", info: ``}
}

class User {
   constructor(obj_or_name, swarm) {
      if (obj_or_name.name){
         this.name = obj_or_name.name;
         this.swarm = obj_or_name.swarm;
         this.id = obj_or_name.id;
         this.is_queen = obj_or_name.is_queen;
      } else {
         this.name = obj_or_name;
         this.swarm = swarm;
         this.id;
         this.is_queen;
      }

      this.rank = Rank.INVISIBLE;
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