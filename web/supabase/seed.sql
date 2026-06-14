-- Sample plays (public domain)
insert into plays (title, author, is_sample) values
  ('Hamlet', 'William Shakespeare', true),
  ('The Seagull', 'Anton Chekhov', true),
  ('A Doll''s House', 'Henrik Ibsen', true);


-- ================================================================
-- HAMLET  (user plays HAMLET)
-- ================================================================

insert into scenes (play_id, act, scene, sort_order, title, content)
select id, 'I', '5', 1,
  $$Scene 1: The ghost reveals his father's murder$$,
  $json$[
  {"type":"scene_direction","text":"A desolate platform before the castle. The Ghost has drawn Hamlet apart from his companions. The night is absolute. Hamlet is terrified and electrified in equal measure — he is about to learn the truth that will unmake him."},
  {"ch":"GHOST","text":"I am thy father's spirit, doom'd for a certain term to walk the night.","direction":"Grave and deliberate. This is not a threat — it is an appeal."},
  {"ch":"HAMLET","text":"Alas, poor ghost!","you":true,"direction":"Instinctive pity, before the mind can catch up.","intent":"You are still in shock. You want to help but do not yet understand what is being asked of you."},
  {"ch":"GHOST","text":"Pity me not, but lend thy serious hearing to what I shall unfold."},
  {"ch":"HAMLET","text":"Speak; I am bound to hear.","you":true,"intent":"A small, deliberate choice — you are committing to listen, whatever comes."},
  {"ch":"GHOST","text":"So art thou to revenge, when thou shalt hear."},
  {"ch":"HAMLET","text":"What?","you":true,"direction":"Just one word. The word of a man whose world has shifted one degree — not yet fallen."},
  {"ch":"GHOST","text":"Murder most foul, as in the best it is; but this most foul, strange, and unnatural."},
  {"type":"direction","text":"A long stillness. Hamlet cannot yet speak."},
  {"ch":"HAMLET","text":"Haste me to know it, that I, with wings as swift as meditation or the thoughts of love, may sweep to my revenge.","you":true,"direction":"The speech builds. By the end he is almost frightening himself.","intent":"You need to act — not because you are certain, but because uncertainty is unbearable."},
  {"ch":"GHOST","text":"I am thy father's spirit. There was a serpent that did sting thy father's life; now wears his crown."},
  {"ch":"HAMLET","text":"O my prophetic soul! My uncle!","you":true,"direction":"Not a shout — a whispered recognition. He already half-knew."},
  {"ch":"GHOST","text":"Adieu, adieu! Hamlet, remember me."},
  {"type":"direction","text":"The Ghost vanishes. Hamlet is alone."},
  {"ch":"HAMLET","you":true,"direction":"Rising through grief into something harder — resolve, or its performance.","intent":"You are making a vow. Make sure you know what you are vowing to do.","segments":[{"text":"Remember thee!"},{"action":"He staggers, pressing his hands to his temples."},{"text":"Ay, thou poor ghost, while memory holds a seat in this distracted globe."},{"action":"Something hardens. When he speaks again it is not grief — it is a man deciding."},{"text":"Remember thee!"}]}
]$json$::jsonb
from plays where title = 'Hamlet';

insert into scenes (play_id, act, scene, sort_order, title, content)
select id, 'II', '2', 2,
  'Scene 2: Denmark is a prison, with Rosencrantz and Guildenstern',
  $json$[
  {"type":"scene_direction","text":"The great hall of Elsinore. Rosencrantz and Guildenstern — old university friends — have been summoned by Claudius to spy on Hamlet. Hamlet already suspects this. The scene is a duel dressed as a reunion."},
  {"ch":"GUILDENSTERN","text":"My honour'd lord!"},
  {"ch":"ROSENCRANTZ","text":"My most dear lord!"},
  {"ch":"HAMLET","text":"My excellent good friends! How dost thou, Guildenstern? Ah, Rosencrantz! Good lads, how do you both?","you":true,"direction":"Warm, expansive — the warmth of a man who wants to be wrong about why they are here.","intent":"You are genuinely glad to see them, and already watching them very carefully."},
  {"ch":"ROSENCRANTZ","text":"As the indifferent children of the earth."},
  {"ch":"HAMLET","text":"Then you live about fortune's waist? What news?","you":true,"intent":"Small talk as reconnaissance."},
  {"ch":"ROSENCRANTZ","text":"None, my lord, but that the world's grown honest."},
  {"ch":"HAMLET","text":"Then is doomsday near. But your news is not true. What have you deserved at the hands of fortune, that she sends you to prison hither?","you":true,"direction":"The word 'prison' lands quietly. Watch how they react."},
  {"ch":"GUILDENSTERN","text":"Prison, my lord?"},
  {"ch":"HAMLET","text":"Denmark's a prison.","you":true,"direction":"Flat and simple. Not performed. It is true."},
  {"ch":"ROSENCRANTZ","text":"Then is the world one."},
  {"ch":"HAMLET","you":true,"segments":[{"text":"A goodly one;"},{"action":"He gestures at the walls, the ceiling, the whole castle."},{"text":"in which there are many confines, wards and dungeons, Denmark being one o' the worst."}]},
  {"ch":"ROSENCRANTZ","text":"We think not so, my lord."},
  {"ch":"HAMLET","text":"Why, then 'tis none to you; for there is nothing either good or bad, but thinking makes it so: to me it is a prison.","you":true,"direction":"The philosophy is real. It is not a performance of madness — it is a man thinking out loud about his own trap.","intent":"You are testing whether they will admit what they are here to do. They won't — so file it away."}
]$json$::jsonb
from plays where title = 'Hamlet';

insert into scenes (play_id, act, scene, sort_order, title, content)
select id, 'III', '1', 3,
  $$Scene 3: Get thee to a nunnery, the confrontation with Ophelia$$,
  $json$[
  {"type":"scene_direction","text":"A corridor in the castle. Polonius and Claudius are hidden, watching. Ophelia has been placed here as bait. She holds Hamlet's letters. Whether Hamlet knows she is being used is for you to decide — the text supports both readings, and your choice will define every line."},
  {"ch":"OPHELIA","text":"Good my lord, how does your honour for this many a day?","direction":"She has rehearsed this opening. It comes out too clean."},
  {"ch":"HAMLET","text":"I humbly thank you; well, well, well.","you":true,"direction":"The three 'wells' — don't swallow them. Each one is a beat of recalibration.","intent":"Something is wrong. She is too formal. Buy time."},
  {"ch":"OPHELIA","text":"My lord, I have remembrances of yours that I have long'd long to re-deliver; I pray you, now receive them."},
  {"ch":"HAMLET","text":"No, not I; I never gave you aught.","you":true,"direction":"A flat, hard denial. No cruelty yet — just a door closing.","intent":"If she is being used, she will press on. Watch."},
  {"ch":"OPHELIA","text":"My honour'd lord, you know right well you did; and, with them, words of so sweet breath composed as made the things more rich."},
  {"type":"direction","text":"She holds out the letters. He does not take them."},
  {"ch":"HAMLET","text":"Ha, ha! are you honest?","you":true,"direction":"This is not performed madness. It is a real question wearing the mask of one.","intent":"You are asking whether she has been told to lie to you."},
  {"ch":"OPHELIA","text":"My lord?"},
  {"ch":"HAMLET","text":"Are you fair?","you":true},
  {"ch":"OPHELIA","text":"What means your lordship?"},
  {"ch":"HAMLET","text":"That if you be honest and fair, your honesty should admit no discourse to your beauty.","you":true},
  {"ch":"OPHELIA","text":"Could beauty, my lord, have better commerce than with honesty?"},
  {"ch":"HAMLET","you":true,"direction":"The cruelty is sudden, almost involuntary. It comes from grief, not hatred.","intent":"If she is innocent, you are destroying her. If she is not, you are warning her. Either way, it costs you something.","segments":[{"text":"Get thee to a nunnery,"},{"action":"He turns away, unable to look at her."},{"text":"go: farewell."}]},
  {"ch":"HAMLET","text":"To a nunnery, go, and quickly too.","you":true,"direction":"The repetition is not cruelty — it is almost a prayer."}
]$json$::jsonb
from plays where title = 'Hamlet';

insert into scenes (play_id, act, scene, sort_order, title, content)
select id, 'III', '4', 4,
  'Scene 4: The closet confrontation with Gertrude',
  $json$[
  {"type":"scene_direction","text":"Gertrude's private chamber, late at night. Polonius hides behind the arras on Claudius's orders. Hamlet has been summoned to be rebuked — instead he will deliver one. The scene will turn violent."},
  {"ch":"GERTRUDE","text":"Hamlet, thou hast thy father much offended.","direction":"She has a prepared speech. This is the opening line of it."},
  {"ch":"HAMLET","text":"Mother, you have my father much offended.","you":true,"direction":"Mirror her exactly. Same rhythm, same weight. Let her hear what she said.","intent":"You are not here to be managed. You are here for the truth."},
  {"ch":"GERTRUDE","text":"Come, come, you answer with an idle tongue."},
  {"ch":"HAMLET","text":"Go, go, you question with a wicked tongue.","you":true},
  {"ch":"GERTRUDE","text":"Why, how now, Hamlet!"},
  {"ch":"HAMLET","text":"What's the matter now?","you":true,"direction":"Genuine — you want her to say it."},
  {"ch":"GERTRUDE","text":"Have you forgot me?"},
  {"ch":"HAMLET","you":true,"direction":"The pause before 'you are my mother' is doing enormous work. Don't rush it.","intent":"You wish she were not. That has to land.","segments":[{"text":"No, by the rood, not so: You are the queen, your husband's brother's wife;"},{"action":"A beat — he cannot bring himself to say the next part without pausing."},{"text":"and — would it were not so! — you are my mother."}]},
  {"ch":"GERTRUDE","text":"Nay, then I'll set those to you that can speak."},
  {"ch":"HAMLET","text":"Come, come, and sit you down; you shall not budge. You go not till I set you up a glass where you may see the inmost part of you.","you":true,"intent":"You are not threatening her. You are trying to force her to look at herself. There is love underneath this, which makes it worse."},
  {"ch":"GERTRUDE","text":"What wilt thou do? Thou wilt not murder me? Help, help, ho!"},
  {"type":"direction","text":"A sound from behind the arras. Hamlet draws his sword and thrusts through the hanging."},
  {"ch":"HAMLET","text":"How now! A rat? Dead, for a ducat, dead!","you":true,"direction":"Impulsive — for one terrible moment he thought it was Claudius."}
]$json$::jsonb
from plays where title = 'Hamlet';

insert into scenes (play_id, act, scene, sort_order, title, content)
select id, 'V', '2', 5,
  'Scene 5: The readiness is all, before the final duel',
  $json$[
  {"type":"scene_direction","text":"Before the final duel. Horatio has heard from Osric what is being planned and urges Hamlet to withdraw. Hamlet refuses. He has arrived at a strange peace — quieter and more dangerous than anything we have seen from him."},
  {"ch":"HORATIO","text":"You will lose this wager, my lord."},
  {"ch":"HAMLET","text":"I do not think so; since he went into France, I have been in continual practise. I shall win at the odds. But thou wouldst not think how ill all's here about my heart.","you":true,"direction":"The second sentence surprises even him. Let it come out quietly.","intent":"You are telling your only friend that you know this may end badly."},
  {"ch":"HORATIO","text":"Nay, good my lord —"},
  {"ch":"HAMLET","text":"It is but foolery; but it is such a kind of gain-giving as would perhaps trouble a woman.","you":true,"direction":"A self-deprecating half-joke. He is trying to dismiss it and can't quite."},
  {"ch":"HORATIO","text":"If your mind dislike any thing, obey it. I will forestall their repair hither, and say you are not fit."},
  {"type":"direction","text":"A pause. Something settles in Hamlet."},
  {"ch":"HAMLET","you":true,"direction":"Do not make this a speech. Say it like you are thinking it through for the first time and reaching the end of the argument. It should sound like relief.","intent":"You have made peace with the outcome. This is not resignation — it is freedom.","segments":[{"text":"Not a whit, we defy augury: there's a special providence in the fall of a sparrow."},{"action":"He is still. This is not performed calm — it is the real thing."},{"text":"If it be now, 'tis not to come; if it be not to come, it will be now; if it be not now, yet it will come: the readiness is all."}]},
  {"ch":"HORATIO","text":"Is't not possible to understand in another tongue?"},
  {"ch":"HAMLET","text":"I am constant to my purposes; they follow the king's pleasure: if his fitness speaks, mine is ready; now or whensoever, provided I be so able as now.","you":true,"intent":"You are done negotiating with your own fear. That's what this scene is."}
]$json$::jsonb
from plays where title = 'Hamlet';


-- ================================================================
-- THE SEAGULL  (user plays KONSTANTIN)
-- ================================================================

insert into scenes (play_id, act, scene, sort_order, title, content)
select id, 'I', '1', 1,
  'Scene 1: Before the performance, first words with Nina',
  $json$[
  {"type":"scene_direction","text":"A makeshift open-air stage at the lakeside, just before sunset. Konstantin has built it himself for his symbolist play. Nina will be the only actress. He is twenty-five and believes, with utter sincerity, that he is about to change theatre forever."},
  {"ch":"NINA","text":"Are you really putting on a play? It is all so mysterious."},
  {"ch":"KONSTANTIN","text":"Yes. We begin at ten past eight, when the moon rises.","you":true,"direction":"Precise and proprietorial. This detail matters to him.","intent":"You want her to take this seriously. Her opinion is the only one that counts to you."},
  {"ch":"NINA","text":"It is so strange. Your play has no real characters in it."},
  {"ch":"KONSTANTIN","you":true,"direction":"This is a manifesto, not an explanation. He has been thinking about this for a long time.","intent":"You need her to believe in you as an artist, not just as a person.","segments":[{"text":"We need new forms."},{"action":"He stops pacing. He needs her to understand this."},{"text":"New forms are necessary, and if they don't exist, then it's better to have nothing at all."}]},
  {"ch":"NINA","text":"It is hard to act in your play. There are no living people in it."},
  {"type":"direction","text":"A beat. This stings."},
  {"ch":"KONSTANTIN","text":"Living people! We should not depict life as it is, or as it ought to be, but as we see it in our dreams.","you":true,"direction":"The certainty covers the hurt. Don't let the certainty be total."},
  {"ch":"NINA","text":"There is very little action in your play, just speeches."},
  {"ch":"KONSTANTIN","text":"A play should not necessarily have action. Look at life: people eat, drink, make love, walk about, talk nonsense. That is what theatre should show.","you":true,"intent":"You believe this. You also know it sounds like a defence, and you hate that."}
]$json$::jsonb
from plays where title = 'The Seagull';

insert into scenes (play_id, act, scene, sort_order, title, content)
select id, 'I', '2', 2,
  'Scene 2: Feeling homeless, a long talk with Sorin',
  $json$[
  {"type":"scene_direction","text":"The garden, later that evening. Sorin — Konstantin's uncle, a retired civil servant — is the only member of the household who is genuinely fond of the young man. He is old, slightly deaf, and wiser than he lets on. Konstantin needs to be heard; Sorin is the only one who will listen."},
  {"ch":"SORIN","text":"My boy, you should try to patch things up with your mother."},
  {"ch":"KONSTANTIN","text":"I cannot. She loves the theatre — she thinks she is serving humanity, the sacred cause of art. But to my mind, the modern theatre is routine. Nothing but prejudice.","you":true,"direction":"Don't perform this as a rant. He has said it many times; it comes out worn.","intent":"You are not really talking about the theatre. You are talking about not being loved by her."},
  {"ch":"SORIN","text":"But why can't you two simply get along?"},
  {"ch":"KONSTANTIN","text":"In the stalls, nine hundred faces stare into the dark. They see how people eat, drink, love, wear their jackets. Out of these commonplace scenes they try to fish out a moral — a petty moral, easy to understand, convenient for domestic use.","you":true},
  {"ch":"SORIN","text":"What more do you want from the theatre?"},
  {"ch":"KONSTANTIN","text":"New forms, uncle. New forms are what we need.","you":true,"direction":"Quieter here than usual. He is not convincing Sorin — he is reminding himself."},
  {"type":"direction","text":"A pause. The lake glitters."},
  {"ch":"SORIN","text":"I used to write myself, you know. I wanted to be a literary man. There were many things I wanted but never got."},
  {"ch":"KONSTANTIN","text":"You wanted to marry?","you":true,"direction":"Gentle teasing — he loves his uncle.","intent":"You are grateful for this conversation. Let that show."},
  {"ch":"SORIN","text":"Yes. But I never quite managed it. The deputy governor said I had a disagreeable face."},
  {"ch":"KONSTANTIN","you":true,"direction":"This arrives without self-pity — that's what makes it devastating.","intent":"You are saying out loud what you have been carrying all evening.","segments":[{"text":"I feel homeless here."},{"action":"He looks around at the estate — the lake, the house — as if seeing it with a stranger's eyes."},{"text":"She doesn't need me. They are all strangers. I have no money. I am nothing."}]},
  {"ch":"SORIN","text":"What does Trigorin say about your writing?"},
  {"ch":"KONSTANTIN","text":"He doesn't read me. But we shall manage, uncle. We shall manage.","you":true,"direction":"He doesn't believe it. Let that be visible."}
]$json$::jsonb
from plays where title = 'The Seagull';

insert into scenes (play_id, act, scene, sort_order, title, content)
select id, 'II', '1', 3,
  'Scene 3: The dead seagull, laid at her feet',
  $json$[
  {"type":"scene_direction","text":"The croquet lawn, two weeks later. Trigorin has arrived and Nina has become fascinated by him. Konstantin has shot a seagull — a wild, self-destructive act — and laid it at Nina's feet. She does not understand why. He is beginning to understand that he has lost her."},
  {"ch":"NINA","text":"What is that?"},
  {"ch":"KONSTANTIN","text":"A seagull. I killed it today. I lay it at your feet.","you":true,"direction":"No drama in the delivery. He is exhausted.","intent":"You do not entirely understand why you did it. You are showing her something about yourself you cannot put into words."},
  {"ch":"NINA","text":"What is the matter with you lately?"},
  {"ch":"KONSTANTIN","text":"Yes. I killed this seagull today. I shall kill myself in the same way, very soon.","you":true,"direction":"He means it. He also knows it will sound theatrical. He says it anyway."},
  {"ch":"NINA","text":"You have changed so much. I do not recognise you anymore."},
  {"type":"direction","text":"This lands harder than a blow."},
  {"ch":"KONSTANTIN","you":true,"direction":"Keep the accusation quiet. Rage would be easier for her.","intent":"You want her to deny it. She won't.","segments":[{"text":"Yes — since the day I ceased to recognise you."},{"action":"He finally makes himself look at her."},{"text":"You have changed to me, Nina. Your eyes are cold. My presence disturbs you."}]},
  {"ch":"NINA","text":"You have grown irritable lately. You talk in symbols. I cannot understand you at all."},
  {"ch":"KONSTANTIN","text":"It began the evening my play failed. Women never forgive failure.","you":true,"direction":"Cruel and unfair — he knows it as he says it.","intent":"You are pushing her away because she is already leaving. It hurts less if you are the one doing it."},
  {"ch":"NINA","text":"This seagull is a symbol, I suppose?"},
  {"ch":"KONSTANTIN","text":"I have no right to keep you. Go.","you":true,"direction":"The shortest, most devastating line he will say to her. Don't underplay it."}
]$json$::jsonb
from plays where title = 'The Seagull';

insert into scenes (play_id, act, scene, sort_order, title, content)
select id, 'III', '1', 4,
  'Scene 4: A desperate argument with Arkadina',
  $json$[
  {"type":"scene_direction","text":"Arkadina's room, the morning of departure. Konstantin has shot himself — the wound is superficial but the gesture was real. Arkadina is bandaging his head. She wants to leave with Trigorin. He wants her to stay and stop it. Neither of them will get what they want."},
  {"ch":"ARKADINA","text":"Hold still, hold still, Kostya.","direction":"She is competent and slightly impatient. She has scenes to play, a train to catch."},
  {"ch":"KONSTANTIN","text":"I am better now. Mother — I must tell you something.","you":true,"direction":"Low and direct. This is not a performance.","intent":"You have decided to be honest. It will not work, but you have decided."},
  {"ch":"ARKADINA","text":"Kostya... What?"},
  {"ch":"KONSTANTIN","you":true,"direction":"He doesn't expect her to fix this. He wants her to hear it.","segments":[{"text":"I am not loved."},{"action":"A silence. He hadn't planned to say that out loud."},{"text":"I used to be loved, and now she has left me for him. I have done everything I can to create a new kind of theatre — and what has come of it? Nothing."}]},
  {"ch":"ARKADINA","text":"You are not a failure. Be patient, Kostya."},
  {"ch":"KONSTANTIN","text":"I want you to stay here. Please do not take him away. Nina is fascinated by him.","you":true,"direction":"This is the real request. Everything else was preamble.","intent":"You know she will refuse. Ask anyway."},
  {"ch":"ARKADINA","text":"I have no power over him. He is his own master."},
  {"ch":"KONSTANTIN","text":"But you can see what is happening. She is infatuated. He will ruin her.","you":true,"direction":"Urgency, not cruelty — he is not attacking Trigorin out of jealousy alone."},
  {"ch":"ARKADINA","text":"I am an actress, Kostya. I do not manage other people's lives."},
  {"type":"direction","text":"She finishes the bandaging. She stands."},
  {"ch":"KONSTANTIN","text":"Then forgive me. I have been wrong to complain.","you":true,"direction":"He retreats. He has spent his whole life doing this with her.","intent":"You are giving up, not forgiving. There is a difference."}
]$json$::jsonb
from plays where title = 'The Seagull';

insert into scenes (play_id, act, scene, sort_order, title, content)
select id, 'IV', '1', 5,
  'Scene 5: Nina returns on a dark, stormy night',
  $json$[
  {"type":"scene_direction","text":"The study in Sorin's house, two years later. It is late. Everyone else has gone. Konstantin has become a published writer, but is hollow inside. Nina — who left with Trigorin, had his child, lost it, was abandoned, and failed as an actress — taps at the window. This is the last time they will speak."},
  {"ch":"NINA","text":"Konstantin!"},
  {"ch":"KONSTANTIN","text":"Nina! Nina! I knew you would come. I had a feeling all day.","you":true,"direction":"The relief is overwhelming. Try to contain it — he is still frightened.","intent":"You have waited two years for this moment and have no idea what to do with it."},
  {"ch":"NINA","text":"There is no one here. Konstantin — why did you look at me like that? You frightened me."},
  {"ch":"KONSTANTIN","you":true,"direction":"Simple and true. Don't reach for poetry.","segments":[{"text":"It has been two years."},{"action":"He counts them — they have been so long they feel like a different life."},{"text":"Every day, every night, I have thought of you."}]},
  {"ch":"NINA","text":"I became an actress. I was so happy at first. I loved him. He was not faithful to me."},
  {"ch":"KONSTANTIN","text":"I know all that. Was he kind to you?","you":true,"direction":"You already know the answer. You ask because it matters that she can say it."},
  {"ch":"NINA","text":"He was not faithful. I have lived through so much since then."},
  {"ch":"KONSTANTIN","text":"Nina — you were born for greatness. Why did you go to him? Why?","you":true,"direction":"Not an accusation. A genuine failure to understand something that broke you."},
  {"type":"direction","text":"She stands, distracted, as if listening to something inside herself."},
  {"ch":"NINA","text":"I am a seagull... No, that is not right. I am an actress."},
  {"ch":"KONSTANTIN","text":"Stay here, Nina. Or let me go with you.","you":true,"direction":"A final attempt. He knows the answer.","intent":"You are not asking to win. You are asking because not asking is worse."},
  {"ch":"NINA","text":"Don't come. Don't follow me. I must go. Goodbye, Konstantin."},
  {"type":"scene_close","text":"She leaves through the window. He sits at his desk, tears up all his manuscripts, and goes out."}
]$json$::jsonb
from plays where title = 'The Seagull';


-- ================================================================
-- A DOLL'S HOUSE  (user plays NORA)
-- ================================================================

insert into scenes (play_id, act, scene, sort_order, title, content)
select id, 'I', '1', 1,
  $$Scene 1: The secret loan, confessed to Christine Linde$$,
  $json$[
  {"type":"scene_direction","text":"The Helmers' sitting room, Christmas Eve. Christine Linde — an old school friend — has arrived after years away. Nora, radiant and apparently carefree, is bursting to share her secret with someone. Christine is the first person in years she might be able to trust."},
  {"ch":"MRS. LINDE","text":"You must tell me, Nora — is it true that you borrowed the money without your husband knowing?"},
  {"ch":"NORA","text":"Yes. Torvald must not know anything about it. Good heavens, can you not understand? He must never know how critical his condition was.","you":true,"direction":"Pride and anxiety in equal measure. She has carried this alone for a long time.","intent":"You want to confide, but you also need Christine to understand why this must stay secret."},
  {"ch":"MRS. LINDE","text":"But how could you possibly pay it back out of your housekeeping money?"},
  {"ch":"NORA","text":"I saved a little here and there, you see. Whenever Torvald gave me money for new dresses, I never bought what I wanted — always the plainest things.","you":true,"direction":"She says this with a kind of playful pride. It is her small economy, her private achievement."},
  {"ch":"MRS. LINDE","text":"And your husband never noticed?"},
  {"ch":"NORA","text":"Good gracious — how could you imagine? A man who has such strong opinions about these things! And besides, Torvald has a slight sense of pride about not being in debt.","you":true},
  {"type":"direction","text":"A beat of something more complicated crosses her face."},
  {"ch":"MRS. LINDE","text":"Oh, Nora, Nora! How much you must have suffered."},
  {"ch":"NORA","text":"No, it was delightful! It was almost like being a man, Christine.","you":true,"direction":"She means this completely. That is what makes it poignant.","intent":"You want her to understand that this was not sacrifice — it was the most alive you have ever felt."},
  {"ch":"MRS. LINDE","text":"I don't quite understand —"},
  {"ch":"NORA","you":true,"direction":"The last four words land with quiet weight. Let them.","segments":[{"text":"When Torvald was ill, the doctors said he must go south. I borrowed the money and we went to Italy."},{"action":"She leans forward — this is the part she has never told anyone."},{"text":"No one knew. No one but me."}]}
]$json$::jsonb
from plays where title = 'A Doll''s House';

insert into scenes (play_id, act, scene, sort_order, title, content)
select id, 'I', '2', 2,
  $$Scene 2: Krogstad reveals the forgery and threatens Nora$$,
  $json$[
  {"type":"scene_direction","text":"The same sitting room, the same day. Krogstad — a clerk at the bank who holds Nora's debt — has come unannounced. He has discovered that Torvald plans to dismiss him. He is about to tell Nora the price of her secret. She thought she was safe. She is not."},
  {"ch":"KROGSTAD","text":"Good afternoon, Mrs. Helmer."},
  {"ch":"NORA","text":"Good afternoon.","you":true,"direction":"She recognises him. She does not let herself show fear yet."},
  {"ch":"KROGSTAD","text":"Is your husband at home?"},
  {"ch":"NORA","text":"He is not at home.","you":true},
  {"ch":"KROGSTAD","text":"I know that. I want to speak to you, Mrs. Helmer."},
  {"ch":"NORA","text":"To me? What do you want?","you":true,"direction":"Forced calm. She knows what he is.","intent":"Don't panic. Find out what he knows and what he wants."},
  {"ch":"KROGSTAD","text":"I have a small post in the bank, and I hear your husband is to be the new manager. I should like to keep my position, Mrs. Helmer."},
  {"ch":"NORA","text":"I have no influence over my husband in these matters.","you":true},
  {"ch":"KROGSTAD","text":"Perhaps not. But you have the ability, Mrs. Helmer. Are you aware that I once had an action in law against your father?"},
  {"ch":"NORA","text":"I was not aware of that.","you":true,"direction":"A careful, small lie. She is trying to keep the ground solid."},
  {"type":"direction","text":"He pauses, watching her."},
  {"ch":"KROGSTAD","text":"The date on the paper your father signed — he died three days before that date. You forged his name, Mrs. Helmer."},
  {"ch":"NORA","you":true,"direction":"Direct and defiant. She does not feel she has done anything wrong.","intent":"You believe this. Make sure he hears it as a statement of principle, not a confession.","segments":[{"text":"I did it for love."},{"action":"She does not look away from him."},{"text":"For my husband's life."}]}
]$json$::jsonb
from plays where title = 'A Doll''s House';

insert into scenes (play_id, act, scene, sort_order, title, content)
select id, 'II', '1', 3,
  'Scene 3: The Tarantella rehearsal, buying time from Helmer',
  $json$[
  {"type":"scene_direction","text":"The day before the costume party. Nora now knows that Krogstad's letter is in the letter-box. She has been practising the Tarantella obsessively, using it to buy time — every hour Torvald does not open that box is an hour she is still safe. She needs him to coach her, to watch only her, to notice nothing else."},
  {"ch":"HELMER","text":"Nora — what is this? Have you been here all day?"},
  {"ch":"NORA","text":"Yes, I have been practising all day. You shall see, Torvald. Tomorrow night, after I have danced —","you":true,"direction":"Bright, almost manic. She is managing him.","intent":"Keep him looking at you. Keep him away from the letter-box."},
  {"ch":"HELMER","text":"And you have promised me —"},
  {"ch":"NORA","text":"Yes, and I will keep my promise. You shall see, Torvald.","you":true},
  {"ch":"HELMER","text":"But you look so worn out. Have you been practising too hard?"},
  {"ch":"NORA","you":true,"direction":"She needs this. The urgency is real, though the reason isn't what she says.","segments":[{"text":"No, not too hard."},{"action":"She moves to the piano. Her hands are shaking."},{"text":"But I need your help, Torvald. You must coach me right up to the last minute."}]},
  {"ch":"HELMER","text":"I will, gladly. But is there anything else troubling you?"},
  {"ch":"NORA","text":"Nothing else — nothing at all.","you":true,"direction":"The smallest pause before 'nothing'. Hold it one beat too long."},
  {"type":"direction","text":"She moves to the piano. Her hands are trembling slightly."},
  {"ch":"NORA","text":"Torvald — I want to ask you to let me off from the masquerade tomorrow.","you":true,"direction":"She tries, briefly, to tell the truth. Then thinks better of it.","intent":"You cannot tell him the real reason. See if you can get out of the party without having to."},
  {"ch":"HELMER","text":"That is utterly out of the question. You promised —"},
  {"ch":"NORA","text":"Yes, but I am asking you again, Torvald — please. For my sake and the children's sake.","you":true}
]$json$::jsonb
from plays where title = 'A Doll''s House';

insert into scenes (play_id, act, scene, sort_order, title, content)
select id, 'II', '2', 4,
  $$Scene 4: Dr. Rank confesses his love in the parlour$$,
  $json$[
  {"type":"scene_direction","text":"The same afternoon. Dr. Rank — the Helmers' oldest friend, secretly dying of an inherited illness — comes to say goodbye. Nora has decided she will ask him for the money that will save her. She gets as far as showing him her silk stockings before he tells her he loves her. The moment she realises this, she cannot ask him for anything."},
  {"ch":"DR. RANK","text":"Are you having a very hard time of it just now, Mrs. Helmer?"},
  {"ch":"NORA","text":"Not particularly. But I wanted to talk to you, Dr. Rank.","you":true,"direction":"She is working up to asking him. Every word is preamble.","intent":"Get him on your side before you ask. He will say yes to anything."},
  {"ch":"DR. RANK","text":"My poor constitution is falling to pieces. In another month, perhaps, I shall lie rotting in the churchyard."},
  {"ch":"NORA","text":"Oh, you mustn't say such things.","you":true},
  {"ch":"DR. RANK","text":"I love you, Mrs. Helmer. More deeply than anyone else. I wanted you to know, before I go."},
  {"type":"direction","text":"A silence. Everything she planned is suddenly impossible."},
  {"ch":"NORA","text":"Oh, you really ought not to have said that.","you":true,"direction":"The lightness is gone from her voice. She means it.","intent":"You liked having his devotion without it being named. Named, it becomes something you cannot use."},
  {"ch":"DR. RANK","text":"You know it. And you know that you can trust me as you would trust no one else."},
  {"ch":"NORA","you":true,"direction":"She still tries, for one moment.","segments":[{"text":"I wanted to ask you something, Dr. Rank."},{"action":"She sets the silk stockings aside. The gesture is small and absolute."},{"text":"I was going to ask you to help me."}]},
  {"ch":"DR. RANK","text":"Tell me. What can I do?"},
  {"ch":"NORA","text":"No. Now I cannot. Now that you have told me that — I cannot ask it now.","you":true,"direction":"She puts the silk stockings away. It is a small but absolute gesture.","intent":"You have not become moral — you have become unable to bear what it would cost. That's different."}
]$json$::jsonb
from plays where title = 'A Doll''s House';

insert into scenes (play_id, act, scene, sort_order, title, content)
select id, 'III', '1', 5,
  'Scene 5: The final confrontation, Nora walks through the door',
  $json$[
  {"type":"scene_direction","text":"Late the same night. The party is over. Torvald has read Krogstad's letter and, after learning that the threat has been withdrawn, declared all is forgiven. He wants to pretend nothing happened. Nora has put on her ordinary clothes. She is about to leave."},
  {"ch":"HELMER","text":"Nora — what is this? You have changed your dress."},
  {"ch":"NORA","text":"Yes, Torvald. I have changed.","you":true,"direction":"The simplest possible answer. It carries everything.","intent":"You are not cruel. You are clear. That is what has changed."},
  {"ch":"HELMER","text":"But why — so late?"},
  {"ch":"NORA","text":"I shall not sleep tonight. Sit down, Torvald. We have a great deal to say to one another.","you":true,"direction":"Calm and absolute. The Nora who performed here all these years is gone."},
  {"ch":"HELMER","text":"Nora — what is this cold, set face?"},
  {"ch":"NORA","text":"Sit down. It will take some time. I have a great deal to say to you.","you":true},
  {"ch":"HELMER","text":"You alarm me, Nora; I don't understand you."},
  {"ch":"NORA","text":"No, that is just it. You don't understand me, and I have never understood you either — until tonight.","you":true,"direction":"No accusation in this. Just the fact.","intent":"You are not leaving in anger. You are leaving because you finally see clearly."},
  {"ch":"HELMER","text":"But I have always loved you most tenderly."},
  {"ch":"NORA","text":"You have never loved me. You have only thought it pleasant to be in love with me.","you":true,"direction":"The most devastating line in the play. Say it gently."},
  {"ch":"HELMER","text":"Nora, what do you mean by this?"},
  {"ch":"NORA","you":true,"direction":"Final. No door is open.","intent":"You are not asking for his permission or his understanding. You are telling him what is already decided.","segments":[{"text":"I mean that I must stand quite alone, if I am to understand myself and everything about me."},{"action":"She picks up her coat and bag."},{"text":"I cannot stay with you any longer."}]},
  {"type":"scene_close","text":"She leaves. The door shuts behind her."}
]$json$::jsonb
from plays where title = 'A Doll''s House';
