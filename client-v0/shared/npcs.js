// Static NPCs and their quests. Names, portraits and dialogue are original to this
// prototype (not the source game's characters or story), tied to systems that already
// exist here: looking around, changing look, fishing and chatting.
export const NPC_REACH = 70;
export const SEAT_REACH = 36;

export const NPCS = [
  { id: 'npc_gus', room: 'safeArea', x: 2400, y: 2145, name: 'Gus', color: '#e0855a', questId: 'welcome' },
  { id: 'npc_mira', room: 'cafe', x: 2385, y: 1905, name: 'Mira', color: '#caa6e0', questId: 'lookGood' },
  { id: 'npc_reed', room: 'coralCove', x: 2113, y: 1547, name: 'Reed', color: '#5aa9e6', questId: 'firstCatch' },
  { id: 'npc_theo', room: 'hugglehenFarms', x: 2325, y: 1740, name: 'Theo', color: '#8fbf6a', questId: 'sayHi' },
  // Shopkeeper behind the Tinkerbean counter: no quest, talking to him opens the shop panel.
  { id: 'npc_barnaby', room: 'store', x: 2416, y: 1685, name: 'Barnaby', color: '#b5713f', shop: true,
    greeting: 'Welcome to Tinkerbean! Have a look around, I keep the best rods in town behind this counter.' },
];
// NPCs that give a quest (the shopkeeper does not).
export const QUEST_NPCS = NPCS.filter((n) => n.questId);
export const NPC_BY_ID = Object.fromEntries(NPCS.map((n) => [n.id, n]));

// requirement.type: 'talk' (ready as soon as it is accepted), 'changeLook', 'catchFish', 'sendChat'.
export const QUESTS = {
  welcome: {
    npc: 'npc_gus',
    name: 'Settle In',
    requirement: { type: 'talk' },
    reward: { coins: 15 },
    lines: {
      offer: "New around here? Town's friendly enough once you know your way. Come back and say hi once you've looked around.",
      ready: "Oh, you're back! Good to see a new face stick around.",
      complete: 'Welcome to the neighborhood, for real this time.',
    },
  },
  lookGood: {
    npc: 'npc_mira',
    name: 'A New Look',
    requirement: { type: 'changeLook' },
    reward: { coins: 20 },
    lines: {
      offer: 'You look like you just rolled out of bed, no offense. Go on, change something about your look and come back.',
      inProgress: "Take your time. Press C whenever you're ready to change your look.",
      ready: 'Now THAT is an upgrade. Nicely done.',
      complete: 'Here, you earned it. Keep experimenting with your look whenever you like.',
    },
  },
  firstCatch: {
    npc: 'npc_reed',
    name: 'Catch of the Day',
    requirement: { type: 'catchFish' },
    reward: { coins: 25 },
    lines: {
      offer: 'Ever fished before? Stand at the edge of the dock and give it a try. Bring back anything you catch.',
      inProgress: 'The fish are out there. Patience is half the trick.',
      ready: 'Ha! Knew you had it in you. Nice catch.',
      complete: 'Keep fishing — the cove always has something new to offer.',
    },
  },
  sayHi: {
    npc: 'npc_theo',
    name: 'Break the Ice',
    requirement: { type: 'sendChat' },
    reward: { coins: 10 },
    lines: {
      offer: "It's quiet out here. Say something in chat so the rest of the farm knows you've arrived.",
      inProgress: 'Press Enter and say hello to everyone.',
      ready: 'Heh, loud and clear. Nice to meet you.',
      complete: 'Chat anytime — folks around here like the company.',
    },
  },
};

export function questLine(quest, status) {
  if (status === 'new') return quest.lines.offer;
  if (status === 'in_progress') return quest.lines.inProgress ?? quest.lines.offer;
  if (status === 'ready') return quest.lines.ready;
  return quest.lines.complete;
}

export const npcsInRoom = (room) => NPCS.filter((n) => n.room === room);
