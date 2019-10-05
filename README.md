# [Acnicoy](https://phxstick.github.io/acnicoy)

Acnicoy is a tool for learning Japanese and other languages. It implements
a [Spaced Repetition System][SRS] (SRS) to help with the memorization of vocabulary.
While the basic features work for every language, the program offers a few
additional features specifically for learning Japanese.

The following screenshot shows an example of a dictionary search as well as
information being displayed for a selected kanji. You can browse screenshots for
more of Acnicoy's features along with short descriptions [here](https://phxstick.github.io/acnicoy/screenshots).
They are also linked in the list of features further below.

![Screenshot of Dictionary Section](https://phxstick.github.io/acnicoy/img/screenshots/acnicoy-screenshot-dictionary-kanji-pane.png)


Features
----

The basic features for every language include:

* Add words to your vocabulary and organize them into lists.
  ([screenshot](https://phxstick.github.io/acnicoy/img/screenshots/acnicoy-screenshot-vocab-section.png))
* Review your vocabulary according to a spaced repetition scheduler.
  ([screenshot](https://phxstick.github.io/acnicoy/img/screenshots/acnicoy-screenshot-test-section-eval-phase.png))
* Customize the review sessions, e.g. by switching to flashcard-mode.
  ([screenshot](https://phxstick.github.io/acnicoy/img/screenshots/acnicoy-screenshot-test-settings.png))
* Get an overview over scheduled reviews and items ready for review.
  ([screenshot](https://phxstick.github.io/acnicoy/img/screenshots/acnicoy-screenshot-home-section.png))
* Adjust the spaced repetition system with custom intervals.
  ([screenshot](https://phxstick.github.io/acnicoy/img/screenshots/acnicoy-screenshot-srs-schemes.png))
* View statistics illustrating your learning progress.
  ([screenshot](https://phxstick.github.io/acnicoy/img/screenshots/acnicoy-screenshot-stats-section-diagrams.png))
* Write notes using Markdown syntax and organize them into groups.
  ([screenshot](https://phxstick.github.io/acnicoy/img/screenshots/acnicoy-screenshot-notes-section.png))
* Use shortcuts to speed up frequently used procedures.
  ([screenshot](https://phxstick.github.io/acnicoy/img/screenshots/acnicoy-screenshot-shortcut-settings.png))
* Change the design by switching to other color schemes.
  ([screenshot](https://phxstick.github.io/acnicoy/img/screenshots/acnicoy-screenshot-design-settings.png))

For learners of the Japanese language, the program additionally offers:

* Look up words in the dictionary (similar to [Jisho] and [Houhou SRS]).
  ([screenshot](https://phxstick.github.io/acnicoy/img/screenshots/acnicoy-screenshot-dictionary.png))
* Conveniently edit vocabulary items using suggestions from the dictionary.
  ([screenshot](https://phxstick.github.io/acnicoy/img/screenshots/acnicoy-screenshot-edit-word-suggestions.png))
* Get an overview over all kanji and look up details for single kanji.
  ([screenshot](https://phxstick.github.io/acnicoy/img/screenshots/acnicoy-screenshot-kanji-overview.png))
* Separately add kanji to your vocabulary and review meanings and readings.

Installation
----

You can download the [latest releases for Windows and Linux](https://github.com/phxstick/acnicoy/releases/latest) from GitHub.

### Building from source
Acnicoy requires [Node.js] v12.x and uses the [npm package manager][npm].
The build process is simple:
```sh
$ git clone https://github.com/phxstick/acnicoy
$ npm install
$ npx gulp
```
You can then run the program using `npm start`.

### Generating language-specific data
If you would like to generate language data for Japanese yourself, you can find
all necessary files in my [Dropbox](https://www.dropbox.com/sh/rgb5cukj3vf9r10/AAB6tA7FTWBTPhFm2u_RMuyxa?dl=0).
The JMdict file in that folder could be a bit outdated, so you might want to
download the latest version from [here](http://www.edrdg.org/jmdict/edict_doc.html)
first. You can then set the variable `RESOURCE_PATH` to point to the folder
containing all the raw data files and run `make data`, which will generate all
data and put it the directory specified by the variable `OUTPUT_PATH`.

License
----

This work is licenced under the [GNU GPLv3][GNU GPL].

Credits
----

See the [list of resources](./data/resources.md).

Contact
----

I gladly accept feedback and suggestions. You can open a GitHub issue or contact
me at: Phxstick@gmail.com


   [SRS]: <https://en.wikipedia.org/wiki/Spaced_repetition>
   [Jisho]: <http://jisho.org/>
   [Houhou SRS]: <http://houhou-srs.com/>
   [Node.js]: <https://nodejs.org/>
   [npm]: <https://www.npmjs.com/>
   [GNU GPL]: <https://www.gnu.org/licenses/gpl-3.0.en.html>

