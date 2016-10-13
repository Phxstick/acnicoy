# Acnicoy

Acnicoy is a tool for learning Japanese (and other languages) which implements
a [Spaced Repetition System][SRS] (SRS) for memorizing Vocabulary.
While the basic features work for every language, the program offers a bunch of
additional features specifically for learning Japanese.

### Features
The basic features for every language include:

  - Create and manage your own vocabulary
  - Organize similar parts of the vocabulary into lists
  - Test yourself on the vocabulary using spaced repetition
  - View statistics illustrating your progress

For Japanese language learners, the program additionally offers:
  - Create and manage a kanji vocabulary
  - More stats illustrating your kanji learning progress
  - Look up words in the dictionary (similar to [Jisho] and [Houhou SRS])
  - Kanji overview and cleanly presented kanji information

Features to be implemented:
  - Earn achievements for learning progress and unlock design settings
  - Many settings to customize design, kanji overview, SRS system, and more
  - ... (the todo-list is fairly large)

### Installation

**NOTE**: The program is still missing a bunch of features and it's not fully
stable, so there's no release yet. You can build it from source instead, as
described below.

### Building from source
Acnicoy requires [Node.js] v5+ to run and uses the [npm package manager][npm].
To get started, run:
```sh
$ git clone https://github.com/phxstick/acnicoy
$ npm install
$ make
```
You also need to rebuild sqlite3 against electron. The process is explained
[here](https://github.com/electron/electron/blob/master/docs/tutorial/using-native-node-modules.md).


License
----

I'm not well versed with licensing. I guess I can just leave this empty for now.
So I guess it's copyrighted until I decide on a proper open-source license.

Credits
----

**TODO:** List all used resources here.

Contact
----

In case anyone finds this repository:
I'd be glad if you tried out the program and gave me some feedback.
You can contact me at:  Phxsticks [at] gmail.com


   [SRS]: <https://en.wikipedia.org/wiki/Spaced_repetition>
   [Jisho]: <http://jisho.org/>
   [Houhou SRS]: <http://houhou-srs.com/>
   [Node.js]: <https://nodejs.org/>
   [npm]: <https://www.npmjs.com/>

