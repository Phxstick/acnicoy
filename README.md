# Acnicoy

Acnicoy is a tool for learning Japanese (and other languages) which implements
a [Spaced Repetition System][SRS] (SRS) for memorizing Vocabulary.
While the basic features work for every language, the program offers a bunch of
additional features specifically for learning Japanese.

![Screenshot of Kanji Section](https://dl.dropbox.com/s/wg9a3p6c9n4p0wr/acnicoy-screenshot-kanji-section.png?dl=0)

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
* Many settings to customize design, kanji overview, SRS system, and more
* ... and other features (the [todo-list](./todo.md) is fairly large)

Installation
----

The program is still missing a bunch of core features and it's not fully
stable, so there's no release yet. You can build it from source instead, as
described below.

### Building from source
Acnicoy requires [Node.js] v5+ to run and uses the [npm package manager][npm].
To get started, run:
```sh
$ git clone https://github.com/phxstick/acnicoy
$ make install
$ make build
```
You can then run the program using `make start`.

**Note**: Additional data for the Japanese language and updates for it will be
available for download directly from the program. For now, you can download
the current version from [here](http://acnicoy.netne.net/Japanese-English.zip)
and manually place the unzipped data into the "Content" subfolder of your
"AcnicoyData" folder.

License
----

I'm not well versed with licensing. I'll just leave this empty for now.
So I guess it's copyrighted until I decide on a proper open-source license.

Credits
----

**TODO:** List all used resources here. Will also be listed in the program.

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

