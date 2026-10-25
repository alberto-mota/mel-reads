'use strict';
/* Mel Reads — word lists, sentences, stories, lesson path */

/* ================= CONTENT ================= */
function W(s) { return s.split(',').map(x => { const [w, pic] = x.trim().split(':'); return { w, pic: pic || null }; }); }
const WORDS = {
  a: W('cat:🐱,hat:🎩,bat:🦇,map:🗺️,van:🚐,can:🥫,bag:👜,rat:🐀,ram:🐏,cab:🚕'),
  i: W('pig:🐷,pin:📌,lip:👄,six:6️⃣,bin:🗑️,kid:🧒,dig:⛏️,sit,lid,win'),
  o: W('dog:🐶,fox:🦊,box:📦,log:🪵,pot:🍲,hot:🔥,dot:⚫,hop,top,mop'),
  e: W('bed:🛏️,hen:🐔,ten:🔟,pen:🖊️,net:🥅,web:🕸️,leg:🦵,red:🔴,jet:✈️,wet:💧'),
  u: W('sun:☀️,cup:🥤,bus:🚌,bug:🐛,nut:🥜,hug:🤗,tub:🛁,run:🏃,gum,mud'),
  sh: W('ship:🚢,fish:🐟,shell:🐚,shop:🏪,dish:🍽️,cash:💵,shed:🛖,wish,shut,rush'),
  ch: W('chick:🐤,chip:🍟,chop,chat:💬,check:✅,rich:💰,lunch:🍱,chin,much,such'),
  th: W('bath:🛁,path:🛤️,math:➕,thin,thick,this,that,then,them,with'),
  bl: W('frog:🐸,flag:🚩,drum:🥁,crab:🦀,sled:🛷,clap:👏,swim:🏊,stop:🛑,truck:🚚,plant:🌱,trip,spot,slip,grin'),
  sight: W('the,a,is,I,to,and,you,see,my,go,we,he,she,said,was,of,look,come,like,here'),
};
/* Heart words: the letters that don't follow the sounds she knows yet get a little heart.
   Indexes are graphemes (so 'sh' and 'th' count as one). */
const HEART = { the: [1], said: [1, 2], was: [1, 2], of: [0, 1], to: [1], you: [1, 2], come: [1, 3], here: [1, 3], like: [1, 3], is: [1], he: [1], she: [1], we: [1], my: [1], go: [1], see: [1, 2], look: [1, 2] };
const SKILL_NAMES = { a: 'short a', i: 'short i', o: 'short o', e: 'short e', u: 'short u', sh: 'sh', ch: 'ch', th: 'th', bl: 'blends (fr, cl, st…)', sight: 'sight words', read: 'reading sentences' };
const ALL = new Set(Object.values(WORDS).flat().map(x => x.w));
const PICS = Object.values(WORDS).flat().filter(x => x.pic);

/* Word safety: answer choices may ONLY come from real, kid-appropriate words.
   SAFE = every lesson word + this hand-checked list of decodable distractors.
   BLOCK is a second guard so a generated or edited word can never show up. */
const EXTRA = ('bat,bet,bit,but,cap,cup,pan,pen,pin,pat,pet,pit,pot,tap,tip,top,tan,ten,tin,bad,bed,bid,bud,bag,beg,big,bug,hat,hot,hut,lap,lip,map,mop,net,not,nut,peg,pig,pug,rag,rig,rug,sat,set,sit,fan,fin,fun,man,men,jam,jet,jog,jug,dig,dog,dug,mad,mud,rim,van,vat,wet,web,wig,sun,sad,lid,lad,led,hip,hop,hum,ham,him,hen,nap,nip,dip,den,pop,pup,cub,cab,fog,fig,leg,log,mat,met,sip,tag,tug,bus,yes,zip,six,box,fox,mix,fix,' +
  'chip,chop,chin,shin,shop,ship,much,mush,bath,math,path,with,shed,shell,chat,that,thin,them,then,this,thick,chick,rich,such,shut,wish,dish,fish,cash,lunch,bunch,' +
  'grab,slid,clip,step,track,trick,trap,slap,flip,drip,drop,crib,plum,plug,spin,frog,flag,drum,crab,sled,clap,swim,stop,truck,plant,trip,spot,slip,grin,glad,snap,twin,plan,club,flap,grip,crop').split(',');
const BLOCK = new Set(('shat,shit,shits,sht,fuk,fuc,fuck,fck,dik,dick,cok,cock,cum,tit,tits,twat,cunt,fag,fat,gay,sex,sexy,nud,nude,ass,arse,butt,bum,bitch,crap,turd,fart,piss,pis,poo,poop,pee,rape,slut,hoe,ho,wank,prick,knob,dyke,homo,nig,jap,spic,wop,kike,kill,gun,die,dead,damn,hell,hump,hag').split(','));
const SAFE = new Set([...ALL, ...EXTRA].map(x => x.toLowerCase()).filter(x => !BLOCK.has(x)));
function isSafe(w) { const x = String(w).toLowerCase(); return SAFE.has(x) && !BLOCK.has(x); }

const SENTENCES = {
  1: [
    { t: 'The cat is on the bed.', q: 'What is on the bed?', opts: ['🐱', '🐶', '🦊'] },
    { t: 'A big pig can hop.', q: 'Who can hop?', opts: ['🐷', '🐔', '🐛'] },
    { t: 'The bug is in the cup.', q: 'Where is the bug?', opts: ['🥤', '📦', '🛏️'] },
    { t: 'The red bus is hot.', q: 'What is red?', opts: ['🚌', '🛁', '🐟'] },
    { t: 'A fox sat in a box.', q: 'Who sat in a box?', opts: ['🦊', '🐷', '🐔'] },
  ],
  2: [
    { t: 'The fish is in the dish.', q: 'Where is the fish?', opts: ['🍽️', '🚢', '🛁'] },
    { t: 'A chick can chat with a hen.', q: 'Who can chat?', opts: ['🐤', '🐟', '🦊'] },
    { t: 'The ship is at the shop.', q: 'What is at the shop?', opts: ['🚢', '🚌', '🐸'] },
    { t: 'I get in the bath.', q: 'Where do I get in?', opts: ['🛁', '📦', '🚌'] },
    { t: 'She has a shell and a chip.', q: 'What does she have?', opts: ['🐚', '🥁', '🐛'] },
  ],
  3: [
    { t: 'The frog can swim to the log.', q: 'Who can swim?', opts: ['🐸', '🐷', '🐤'] },
    { t: 'We see a crab on the rock.', q: 'What do we see?', opts: ['🦀', '🐛', '🐟'] },
    { t: 'She said, look at my red flag!', q: 'What is red?', opts: ['🚩', '🐸', '☀️'] },
    { t: 'He can hit the drum. Bam!', q: 'What can he hit?', opts: ['🥁', '🛑', '🦀'] },
    { t: 'The truck must stop at the sign.', q: 'What must stop?', opts: ['🚚', '🐸', '🛷'] },
  ],
};
const PLACEMENT = [
  { w: 'sat', s: 'a' }, { w: 'pig', s: 'i' }, { w: 'hop', s: 'o' }, { w: 'bed', s: 'e' }, { w: 'cup', s: 'u' },
  { w: 'ship', s: 'sh' }, { w: 'chin', s: 'ch' }, { w: 'then', s: 'th' }, { w: 'frog', s: 'bl' }, { w: 'the', s: 'sight' },
];

const V = ['a', 'i', 'o', 'e', 'u'];

/* ================= SOUND STEPS (the garden's planting order) ================= */
const STEPS = [
  { id: 'a', unit: 1, title: 'Short a', skill: 'a', intro: "Let's learn words with the short a sound, like cat and hat!" },
  { id: 'i', unit: 1, title: 'Short i', skill: 'i', intro: 'Now the short i sound, like pig and pin!' },
  { id: 'o', unit: 1, title: 'Short o', skill: 'o', intro: 'Here comes the short o sound, like dog and fox!' },
  { id: 'e', unit: 1, title: 'Short e', skill: 'e', intro: 'Time for the short e sound, like bed and hen!' },
  { id: 'u', unit: 1, title: 'Short u', skill: 'u', intro: 'Last vowel! The short u sound, like sun and cup!' },
  { id: 'sh', unit: 2, title: 'sh', skill: 'sh', intro: 'When s and h hold hands, they say shh, like a sleeping kitten!' },
  { id: 'ch', unit: 2, title: 'ch', skill: 'ch', intro: 'When c and h hold hands, they say ch, like a choo choo train!' },
  { id: 'th', unit: 2, title: 'th', skill: 'th', intro: 'When t and h hold hands, they say th. Stick out your tongue a little!' },
  { id: 'sight1', unit: 2, title: 'Heart words', skill: 'sight', words: [0, 10], intro: 'Some words are heart words. We learn them by heart!' },
  { id: 'bl', unit: 3, title: 'Blends', skill: 'bl', intro: 'Two sounds can slide together, like f and r in frog!' },
  { id: 'sight2', unit: 3, title: 'More heart words', skill: 'sight', words: [10, 20], intro: 'More heart words! You are getting so good at this!' },
];
function stepWords(i) { const st = STEPS[i]; if (!st) return []; const list = WORDS[st.skill]; return (st.words ? list.slice(st.words[0], st.words[1]) : list).map(x => x.w); }
const UNITS = { 1: 'Short Vowel Meadow', 2: 'Sh-Ch-Th Bridge', 3: 'Crystal Castle' };

/* ================= BOOKS (decodable: only sounds she has learned) ================= */
const BOOKS = [
  { id: 'pig', title: 'The Big Pig', cover: '🐷', color: '#FF8FB1', after: 2, lines: ['A pig is big.', 'The pig can dig.', 'The pig sat in the mud.', 'The big pig has a hat!'], q: 'What does the pig have?', opts: ['🎩', '🚌', '🐟'] },
  { id: 'fox', title: 'Hop, Fox, Hop!', cover: '🦊', color: '#FFB86B', after: 3, lines: ['A fox is on a log.', 'The fox can hop.', 'Hop, fox, hop!', 'The fox got a pot.'], q: 'Who can hop?', opts: ['🦊', '🐷', '🐔'] },
  { id: 'hen', title: 'The Hen and the Bug', cover: '🐔', color: '#8EE3B5', after: 5, lines: ['A red hen sat in the sun.', 'A bug got in a cup.', 'The hen can get the bug!', 'Run, bug, run!'], q: 'Who sat in the sun?', opts: ['🐔', '🐛', '🐶'] },
  { id: 'fish', title: 'A Fish Wish', cover: '🐟', color: '#8CC8FF', after: 6, lines: ['A fish is in a dish.', 'The fish has a wish.', 'I wish I had a ship!', 'The fish got a ship. Swish!'], q: 'What did the fish get?', opts: ['🚢', '🎩', '🦊'] },
  { id: 'chick', title: 'The Chick and the Bug', cover: '🐤', color: '#FFE27A', after: 8, lines: ['A chick met a bug.', 'The bug sat on a log.', '"Can you hop?" said the chick.', 'The bug did a big hop!'], q: 'Who met a bug?', opts: ['🐤', '🐶', '🐸'] },
  { id: 'ship', title: 'Sparkle and the Ship', cover: '🦄', color: '#B79CF0', after: 10, lines: ['Sparkle sat on a big rock.', 'She can see a red ship.', 'The ship has a flag on top.', 'A fish and a crab jump in!', 'Sparkle said, "Look at them swim!"'], q: 'What did Sparkle see?', opts: ['🚢', '🚌', '🛁'] },
];

/* ================= SPARKLE'S WARDROBE ================= */
/* Items are bought with gems, or earned by reading milestones (earn:). Each set has 5 pieces;
   wearing a whole set gives Sparkle a title, a sparkly aura and changes the app's colours. */
const WARDROBE = [
  { id: 'tiara', name: 'Princess Tiara', slot: 'head', cost: 40, set: 'princess' },
  { id: 'necklace', name: 'Pearl Necklace', slot: 'neck', cost: 20, set: 'princess' },
  { id: 'cape', name: 'Royal Cape', slot: 'back', cost: 45, set: 'princess' },
  { id: 'mane-rose', name: 'Rose Mane', slot: 'mane', cost: 30, set: 'princess' },
  { id: 'slippers', name: 'Glass Slippers', slot: 'hooves', earn: 'books3', set: 'princess' },
  { id: 'flowers', name: 'Flower Crown', slot: 'head', cost: 25, set: 'fairy' },
  { id: 'wings', name: 'Fairy Wings', slot: 'back', cost: 60, set: 'fairy' },
  { id: 'mane-mint', name: 'Mint Mane', slot: 'mane', cost: 30, set: 'fairy' },
  { id: 'boots-petal', name: 'Petal Boots', slot: 'hooves', cost: 20, set: 'fairy' },
  { id: 'horn-crystal', name: 'Crystal Horn', slot: 'horn', earn: 'flowers20', set: 'fairy' },
  { id: 'bow', name: 'Pink Bow', slot: 'head', cost: 15, set: 'rainbow' },
  { id: 'glasses', name: 'Heart Glasses', slot: 'face', cost: 20, set: 'rainbow' },
  { id: 'scarf', name: 'Rainbow Scarf', slot: 'neck', cost: 30, set: 'rainbow' },
  { id: 'horn-rainbow', name: 'Rainbow Horn', slot: 'horn', cost: 35, set: 'rainbow' },
  { id: 'boots-rainbow', name: 'Rainbow Socks', slot: 'hooves', earn: 'days10', set: 'rainbow' },
  { id: 'starhat', name: 'Star Hat', slot: 'head', cost: 40, set: 'starry' },
  { id: 'moon', name: 'Moon Necklace', slot: 'neck', cost: 25, set: 'starry' },
  { id: 'starcape', name: 'Night Sky Cape', slot: 'back', cost: 50, set: 'starry' },
  { id: 'coat-lavender', name: 'Lavender Coat', slot: 'coat', cost: 35, set: 'starry' },
  { id: 'mane-night', name: 'Starlight Mane', slot: 'mane', earn: 'steps5', set: 'starry' },
  { id: 'shellcrown', name: 'Shell Crown', slot: 'head', cost: 40, set: 'ocean' },
  { id: 'shellneck', name: 'Sea Pearls', slot: 'neck', cost: 25, set: 'ocean' },
  { id: 'mane-ocean', name: 'Ocean Mane', slot: 'mane', cost: 30, set: 'ocean' },
  { id: 'coat-sky', name: 'Sky Coat', slot: 'coat', cost: 35, set: 'ocean' },
  { id: 'horn-pearl', name: 'Pearl Horn', slot: 'horn', earn: 'crown1', set: 'ocean' },
  { id: 'heart-cheeks', name: 'Heart Cheeks', slot: 'face', cost: 15 },
  { id: 'star-stickers', name: 'Star Stickers', slot: 'face', cost: 15 },
];
const SETS = [
  { id: 'princess', name: 'Princess', title: 'Princess Sparkle', icon: '👑', aura: ['#FFD66B', '#FF8FB1'], line: "Ta-da! I'm Princess Sparkle! Thank you, Mel!" },
  { id: 'fairy', name: 'Fairy Garden', title: 'Fairy Sparkle', icon: '🧚', aura: ['#7FE0B4', '#FF8FB1'], line: "Look! I'm Fairy Sparkle! I can fly over your garden!" },
  { id: 'rainbow', name: 'Rainbow', title: 'Rainbow Sparkle', icon: '🌈', aura: ['#FF8FB1', '#FFD66B', '#8CC8FF', '#8EE3B5'], line: "Woohoo! I'm Rainbow Sparkle! So many colours!" },
  { id: 'starry', name: 'Starry Night', title: 'Starry Sparkle', icon: '🌙', aura: ['#8C7BFF', '#FFE27A'], line: "Twinkle twinkle! I'm Starry Sparkle!" },
  { id: 'ocean', name: 'Ocean', title: 'Mermaid Sparkle', icon: '🐚', aura: ['#4FC3E8', '#7FE0D6'], line: "Splash! I'm Mermaid Sparkle! Let's swim!" },
];
const MILESTONES = {
  books3: { label: 'Read 3 different books', goal: 3 },
  flowers20: { label: 'Grow 20 flowers', goal: 20 },
  days10: { label: 'Finish 10 adventures', goal: 10 },
  steps5: { label: 'Learn 5 sounds', goal: 5 },
  crown1: { label: 'Read a book to a grown-up', goal: 1 },
};
const SLOTS = [
  { id: 'head', name: 'Hats' }, { id: 'face', name: 'Face' }, { id: 'neck', name: 'Necklaces' }, { id: 'back', name: 'Wings' },
  { id: 'mane', name: 'Mane' }, { id: 'horn', name: 'Horn' }, { id: 'coat', name: 'Coat' }, { id: 'hooves', name: 'Hooves' },
];

/* ================= EVERYTHING SPARKLE SAYS (pre-recorded) ================= */
const LINES = {
  hi: ['Hi Mel! Ready for an adventure?', 'Welcome back, Mel! I missed you!', "Yay, you're here! Let's read together!"],
  sleepy: "I'm getting sleepy... Let's read together before bed!",
  doneToday: 'You did it today! Want to play more?',
  water: "Let's water your garden!", plant: 'Time to plant new words!', game: 'Game time! Pop the balloons!', story: 'Story time!',
  grew: 'Look how your garden grew!', bye: 'Great job! See you tomorrow!',
  pic: 'Can you find the picture for this word?', hear: 'Listen! Which word did I say?', build: "Let's build the word! Listen.", sight: 'Find the word I say!',
  teach: 'What does this say? Can you read it to me?', teachThanks: 'Oh! Thank you for teaching me!',
  meet: "Here's a new word!", meetSay: 'Can you say it too?', meetAgain: 'Look at it again. Then tap Next.',
  sentence: 'Read it by yourself. Then answer!', myTurn: 'My turn! Listen.', yourTurn: 'Your turn! Read this page to me.', readIt: 'Wow, beautiful reading!',
  balloon: 'Pop the balloon that says',
  oops: "Hmm, let's look again together.", soundOut: "Let's sound it out.",
  bookDone: 'You read the whole book!', grownup: 'Wow! You read to a grown-up!', newBook: 'A new book is on your shelf!',
  newSound: 'Psst! I have a secret to tell you!',
  dress: 'Do you like my new look?', dress2: 'I love it! Thank you!', notYet: "Let's save up more gems for that one!",
  garden: 'This is your word garden! Tap a flower to hear its word.', shelf: 'These are your books! Tap one to read it again.',
  start: "Let's read! I'm so hungry for words!",
  hungry: ["I'm hungry! Will you read with me?", "Hi Mel! Let's read so I can have my treats!", "Yay, you're here! Let's read together!"],
  hungryNight: "It's almost bedtime! Let's read before I go to sleep.",
  asleep: 'Shh... Sparkle is fast asleep. See you tomorrow!',
  warm: "Let's warm up! Build the word.", read: 'Read the words to give me treats!', story: 'Read the story and tell me what happened!',
  findWord: 'Your turn! Read the page. Then tap the word', pageThanks: 'Yes! Now I can read it too!',
  treat: 'Yum! A treat!', feed: 'Yum yum! Thank you for reading to me!', present: 'Pick a present for me!', presentThanks: 'I love it! Thank you, Mel!',
  bedtime: "I'm so sleepy now. Good night, Mel!",
  praise: ['Sparkly!', 'Amazing reading!', 'You got it!', 'Unicorn power!', 'Super star!', "Yes! You're so smart!", 'Woohoo!'],
};
/* What Sparkle promises at bedtime, and shows off the next day. css = the animation class. */
const TRICKS = [
  { promise: "Tomorrow I'll learn to jump!", did: 'Look! I learned to jump!', css: 'hop-sp' },
  { promise: "Tomorrow I'll learn to spin!", did: 'Look! I can spin now!', css: 'spin-sp' },
  { promise: "Tomorrow I'll learn a dance!", did: 'Look at my new dance!', css: 'dance-sp' },
  { promise: "Tomorrow I'll learn to wiggle my ears!", did: 'Look! I can wiggle!', css: 'dance-sp' },
];
function allSpokenTexts() {
  const out = new Set(); const add = t => { if (t) out.add(t); };
  const words = t => t.split(' ').forEach(w => add(w.replace(/[^A-Za-z']/g, '')));
  Object.values(WORDS).flat().forEach(x => add(x.w));
  Object.values(SENTENCES).flat().forEach(s => { add(s.t); add(s.q); words(s.t); });
  BOOKS.forEach(b => { b.lines.forEach(l => { add(l); words(l); }); add(b.q); add(b.title); words(b.title); });
  STEPS.forEach(s => add(s.intro));
  Object.values(LINES).flat().forEach(add);
  return [...out].filter(Boolean);
}
