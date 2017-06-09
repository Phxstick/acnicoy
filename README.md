# Acnicoy

Acnicoy is a tool for learning Japanese (and other languages) which implements
a [Spaced Repetition System][SRS] (SRS) for memorizing Vocabulary.
While the basic features work for every language, the program offers a bunch of
additional features specifically for learning Japanese.

![Screenshot of Kanji Section](http://acnicoy.netai.net/img/screenshots/acnicoy-screenshot-kanji-section.png)

Features
----

The basic features for every language include:

* Create and manage your own vocabulary
* Organize similar parts of the vocabulary into lists
* Test yourself on the vocabulary using spaced repetition
* View statistics illustrating your progress

For Japanese language learners, the program additionally offers:

* Create and manage a kanji vocabulary
* Look up words in the dictionary (similar to [Jisho] and [Houhou SRS])
* Kanji overview and cleanly presented kanji information

Features to be implemented:

* Earn achievements for learning progress and unlock design settings
* Many settings to customize design, SRS system, and more
* ... and other features (the [todo-list](./todo.md) is fairly large)

Installation
----

The program is still missing a bunch of core features and it's not fully
stable, so there's no release yet. You can build it from source instead, as
described below.

### Building from source
Acnicoy requires [Node.js] v7.7+ to run and uses the [npm package manager][npm].
To get started, run:
```sh
$ git clone https://github.com/phxstick/acnicoy
$ npm install
$ gulp
```
You can then run the program using `make start`.

License
----

This work is licenced under the [GNU GPLv3](GNU GPL).

Credits
----

See the [list of resources](./data/resources.md).

Contact
----

I'd be glad if you tried out the program and gave me some feedback.
You can contact me at:  Phxsticks [at] gmail.com


   [SRS]: <https://en.wikipedia.org/wiki/Spaced_repetition>
   [Jisho]: <http://jisho.org/>
   [Houhou SRS]: <http://houhou-srs.com/>
   [Node.js]: <https://nodejs.org/>
   [npm]: <https://www.npmjs.com/>
   [GNU GPL]: <https://www.gnu.org/licenses/gpl-3.0.en.html>

