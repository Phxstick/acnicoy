# Acnicoy

Acnicoy is a tool for learning Japanese and other languages. It implements
a [Spaced Repetition System][SRS] (SRS) to help with the memorization of vocabulary.
While the basic features work for every language, the program offers a few
additional features specifically for learning Japanese.

The following screenshot shows an example of a dictionary search result
and how kanji details are displayed. More screenshots are linked below,
see [here](http://phxstick.github.io/acnicoy/screenshots) for the full list.

![Screenshot of Dictionary Section](http://phxstick.github.io/acnicoy/img/screenshots/acnicoy-screenshot-dictionary.png)


Features
----

The basic features for every language include:

* Add words to your vocabulary and organize them into lists.
  ([screenshot](http://phxstick.github.io/acnicoy/img/screenshots/acnicoy-screenshot-vocab-section.png))
* Review your vocabulary according to a spaced repetition scheduler.
  ([screenshot](http://phxstick.github.io/acnicoy/img/screenshots/acnicoy-screenshot-test-section-1.png))
* Customize the review sessions, e.g. by switching to flashcard-mode.
  ([screenshot](http://phxstick.github.io/acnicoy/img/screenshots/acnicoy-screenshot-test-settings.png))
* Get an overview over scheduled reviews and items ready for review.
  ([screenshot](http://phxstick.github.io/acnicoy/img/screenshots/acnicoy-screenshot-home-section.png))
* Adjust the spaced repetition system with custom intervals.
  ([screenshot](http://phxstick.github.io/acnicoy/img/screenshots/acnicoy-screenshot-srs-schemes.png))
* View statistics illustrating your learning progress.
  ([screenshot](http://phxstick.github.io/acnicoy/img/screenshots/acnicoy-screenshot-stats-section.png))
* Write notes using Markdown syntax and organize them into groups.
  ([screenshot](http://phxstick.github.io/acnicoy/img/screenshots/acnicoy-screenshot-notes-section.png))
* Use shortcuts to speed up frequently used procedures.
  ([screenshot](http://phxstick.github.io/acnicoy/img/screenshots/acnicoy-screenshot-shortcut-settings.png))

For learners of the Japanese language, the program additionally offers:

* Look up words in the dictionary (similar to [Jisho] and [Houhou SRS]).
  ([screenshot](http://phxstick.github.io/acnicoy/img/screenshots/acnicoy-screenshot-dictionary.png))
* Conveniently edit vocabulary items using suggestions from the dictionary.
  ([screenshot](http://phxstick.github.io/acnicoy/img/screenshots/acnicoy-screenshot-edit-word-suggestions.png))
* Get an overview over all kanji and look up details for single kanji.
  ([screenshot](http://phxstick.github.io/acnicoy/img/screenshots/acnicoy-screenshot-kanji-overview.png))
* Separately add kanji to your vocabulary and review meanings and readings.

Installation
----

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

I gladly accept feedback and suggestions. You can open a Github issue or contact
me at: Phxstick [at] gmail.com


   [SRS]: <https://en.wikipedia.org/wiki/Spaced_repetition>
   [Jisho]: <http://jisho.org/>
   [Houhou SRS]: <http://houhou-srs.com/>
   [Node.js]: <https://nodejs.org/>
   [npm]: <https://www.npmjs.com/>
   [GNU GPL]: <https://www.gnu.org/licenses/gpl-3.0.en.html>

