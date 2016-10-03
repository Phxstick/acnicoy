# Acnicoy

Acnicoy is a tool for learning Japanese (and other languages) which implements a [Spaced Repetition System][SRS] (SRS) for memorizing Vocabulary.
While the basic features work for every language, the program offers a bunch of additional features specifically for learning Japanese.

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

**NOTE**: The program is not quite ready for use yet. It's still missing some
initialization functionality and there a few bugs to be squashed first.
If you would already like to try it, feel free to contact me (See e-mail address
at the bottom).

### Building for source
Acnicoy requires [Node.js] v5+ to run and uses the [npm package manager][npm].
To get started, run:
```sh
$ git clone https://github.com/phxstick/acnicoy
$ npm install
$ make build
```
You also need to download additional data into your cloned repository (such as
fonts and several open-source language resources) from **TODO**.
**NOTE**: Currently the program might not work properly without this data. If
things work out well, this data should become optional in the end, and be
downloadable as language packs directly through the program.

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

