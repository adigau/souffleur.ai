-- Sample plays (public domain)
insert into plays (title, author, is_sample) values
  ('Hamlet', 'William Shakespeare', true),
  ('The Seagull', 'Anton Chekhov', true),
  ('A Doll''s House', 'Henrik Ibsen', true);

-- Hamlet — Act III, Scene 1 (To be, or not to be + Nunnery scene)
insert into scenes (play_id, act, scene, sort_order, content)
select
  id,
  'III',
  '1',
  1,
  '[
    {"ch":"OPHELIA","text":"Good my lord, how does your honour for this many a day?"},
    {"ch":"HAMLET","text":"I humbly thank you; well, well, well.","you":true},
    {"ch":"OPHELIA","text":"My lord, I have remembrances of yours, that I have longed long to re-deliver; I pray you, now receive them."},
    {"ch":"HAMLET","text":"No, not I; I never gave you aught.","you":true},
    {"ch":"OPHELIA","text":"My honour’d lord, you know right well you did; and, with them, words of so sweet breath composed as made the things more rich."},
    {"ch":"HAMLET","text":"Ha, ha! are you honest?","you":true},
    {"ch":"OPHELIA","text":"My lord?"},
    {"ch":"HAMLET","text":"Are you fair?","you":true},
    {"ch":"OPHELIA","text":"What means your lordship?"},
    {"ch":"HAMLET","text":"That if you be honest and fair, your honesty should admit no discourse to your beauty.","you":true},
    {"ch":"OPHELIA","text":"Could beauty, my lord, have better commerce than with honesty?"},
    {"ch":"HAMLET","text":"Ay, truly; for the power of beauty will sooner transform honesty from what it is to a bawd than the force of honesty can translate beauty into his likeness.","you":true},
    {"ch":"HAMLET","text":"Get thee to a nunnery, go: farewell.","you":true},
    {"ch":"HAMLET","text":"Or, if thou wilt needs marry, marry a fool; for wise men know well enough what monsters you make of them.","you":true},
    {"ch":"HAMLET","text":"To a nunnery, go, and quickly too.","you":true}
  ]'::jsonb
from plays where title = 'Hamlet';

-- The Seagull — Act I (Konstantin & Nina)
insert into scenes (play_id, act, scene, sort_order, content)
select
  id,
  'I',
  '1',
  1,
  '[
    {"ch":"NINA","text":"Are you really putting on a play? It’s all so mysterious."},
    {"ch":"KONSTANTIN","text":"Yes. We begin at ten past eight, when the moon rises.","you":true},
    {"ch":"NINA","text":"It’s so strange… Your play has no real characters in it."},
    {"ch":"KONSTANTIN","text":"We need new forms. New forms are necessary, and if they don’t exist, then better nothing at all.","you":true},
    {"ch":"NINA","text":"It’s hard to act in your play. There are no living people in it."},
    {"ch":"KONSTANTIN","text":"Living people! We shouldn’t depict life as it is, or as it ought to be, but as we see it in our dreams.","you":true},
    {"ch":"NINA","text":"There’s very little action in your play, just speeches."},
    {"ch":"KONSTANTIN","text":"A play should not necessarily have action. Look at life: people eat, drink, make love, walk about, talk nonsense. That’s what theatre should show.","you":true}
  ]'::jsonb
from plays where title = 'The Seagull';

-- A Doll's House — Act II (Nora & Helmer)
insert into scenes (play_id, act, scene, sort_order, content)
select
  id,
  'II',
  '1',
  1,
  '[
    {"ch":"HELMER","text":"Nora—what is this? Have you been here all day?"},
    {"ch":"NORA","text":"Yes, I have been practising all day.","you":true},
    {"ch":"HELMER","text":"And you have promised me—"},
    {"ch":"NORA","text":"Yes, and I will keep my promise. You shall see, Torvald. Tomorrow night, after I have danced—","you":true},
    {"ch":"HELMER","text":"But you look so worn out. Have you been practising too hard?"},
    {"ch":"NORA","text":"No, not too hard. But I need your help, Torvald. You must coach me right up to the last minute.","you":true},
    {"ch":"HELMER","text":"I will, gladly. But is there anything else troubling you?"},
    {"ch":"NORA","text":"Nothing else—nothing at all.","you":true},
    {"ch":"NORA","text":"Torvald—I want to ask you to let me off from this masquerade.","you":true},
    {"ch":"HELMER","text":"That is utterly out of the question. You promised—"},
    {"ch":"NORA","text":"Yes but I am asking you again, Torvald—please. For my sake and the children’s sake.","you":true}
  ]'::jsonb
from plays where title = 'A Doll''s House';
