# swarm_chat

<h3>Usage</h3>
      <p>A swarm has many drones and only one queen. The queen's interface has a mask to ask a question. Only drones can propose answers and discuss the matter privately for a short time. Afterwards, one answer is presented to the queen.</p>
      <p>Don't read queen's questions as questions to you personally. All questions are addressed to the swarm. Think as a drone, a borg member of a hive-mind. An example: If the queen asks for your name: "What is your name?" Then she wants to know the name of the swarm. The name, the swarm gives itself. The swarm chat is best used with more than seven drones. </p>
      <h3>Ranks</h3>
      <p>A drone can reach ${rankData.length} ranks:</p>
      <ol>
         <li><strong>INVISIBLE</strong>: A drone starts invisible.</li>
         <li><strong>VISIBLE</strong>: Every drone, that supported an accepted proposal gets this promotion.</li>
         <li><strong>RESPONSIBLE</strong>: A responsible drone flagged succsessfully a proposal.</li>
         <li><strong>RESPECTED</strong>: A respected drone created a proposal that got at least 5% of the votes.</li>
         <li><strong>FAMOUS</strong>: Famous drones proposed sucsessfully an answer.</li>
         <li><strong>QUEEN</strong>: There is only one Queen.</li>
      </ol>
      <h3>Flags</h3>
      <ul>
         <li>
            <strong>STOP</strong><br>
            Set this only, if a proposal is a:
            lie or scientifically obvious wrong statement.
            Troll message with harmful content.
            Not if you do not like the proposal.
            Every additional stop-flag on a proposal dubbles the negative influence.
         </li>
         <li>
            <strong>MINORITY</strong><br>
            Set this flag only, if a proposal is harmful against a minority.
            If at least 5% of all drones that voted on this propossal set this flag, it counts as a minority-proposal: Then any negative vote sets the whole vote of the proposal to 0.
         </li>
         <li>
            <strong>SECOND</strong><br>
            Set this flag if you want a proposalas to be an additional, a second answer. If there are enough votes (votes + flag-votes) this may happen.
         </li>
      </ul>
      <h3>Background</h3>
      <p>Nature seems to build <strong>information-networks</strong> whenever possible. Biological cells have an internal exchange of information. Cells structured themselves evolutionary and organised connected life forms like animals and plants. Amimals and plants started building ways of information exchange between individuals with different kinds of language. We are maybe in an exciting time. People start building groups that tend to think as a new combined entity. 
      Communities are intellectually supperior to individual humans, at least in many ways (Communities can build computers and rockets). The whole world is connected in a way, that every part of that network seems to "feel" what's going on in all other parts of the network. Next generations will remember that as the <strong>times of great pain</strong>. We need to build damping mechanisms. It's hurting to feel everything, way better to feel important and true news only.
      What's important and what's true can be decided best by many. Nodes of self suffitiant information-networks do not just evaluate and forward information, they do that for mostly chemical reasons (if it comes to biological networks). In technical networks, its algorithms that decide how to evaluate and forward a signal. In the spirit of "digital humanity" the evaluation of signals in human networks has to follow human opinions, feelings and beliefs.
      </p><p>The <strong>Swarm Chat</strong> is a step in the direction of letting a community think for itself. Results of queen's questions are visible to outsiders in real time. This leads to a feeling of being (part of) an entity and it makes recursive processes possible. The next result will depend on earlier results leading to a loop of internal dependencies.</p>
      <h3>Data Protection</h3>
      <p>All data is saved in the swarm. There is no database on the server. No cookies are set. All known data of a drone is stored in the client browser's local storage. This data is being sent to the server in case of a server reboot. All data of past queen's questions and proposals are deleted immediately after sending the result to the swarm.
      In the case of contradicting information of drones, the server uses the information that is sent from more drones or in the case of equal numbers, from the drone that sent the data first.</p>
      <h3>License</h3>
      <p>created by Lev Lumesberger. Source, mechanics and all creative elements are freely usable under <a href="https://creativecommons.org/licenses/by/4.0/deed.de">CC BY 4.0</a> with one important condition: <br><strong>All decisions are overruled by the human rights charta of the united nations. In case a dicission is contradicting those rights.</strong></p>