# Acnicoy

Acnicoy is a tool for learning Japanese and other languages. It implements
a [Spaced Repetition System][SRS] (SRS) for memorizing Vocabulary.
While the basic features work for every language, the program offers a bunch of
additional features specifically for learning Japanese.

![Screenshot of Kanji Section](http://acnicoy.netai.net/img/screenshots/acnicoy-screenshot-kanji-section.png)

Features
----

The basic features for every language include:

* Build up your own vocabulary and organize it into lists
* Test yourself on the vocabulary using spaced repetition
* Adjust the spaced repetition system with custom intervals
* View statistics illustrating your progress

For Japanese language learners, the program additionally offers:

* Build up a kanji vocabulary and test yourself on it
* Look up words in the dictionary (similar to [Jisho] and [Houhou SRS])
* Kanji overview and cleanly presented kanji information

Features to be added:

* Earning achievements for learning progress
* Customizing design with color schemes
* Learning material for Japanese and other languages
* See the [todo-list](./todo.md) for more

Installation
----

The program is already quite stable and almost ready for a first release.
If you don't want to wait, you can also build it from source, as described below.

### Building from source
Acnicoy requires [Node.js] v8.11 and uses the [npm package manager][npm].
The build process is simple:
```sh
$ git clone https://github.com/phxstick/acnicoy
$ npm install
$ gulp
```
You can then run the program using `npm start`.

License
----

This work is licenced under the [GNU GPLv3][GNU GPL].

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

