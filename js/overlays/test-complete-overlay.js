"use strict";

class TestCompleteOverlay extends Overlay {
    constructor() {
        super("test-complete");
        this.opened = false;
        this.moreLanguagesReady = false;
        this.$("close-button").addEventListener("click", () => {
            this.resolve(false);
        });
        this.$("ok-button").addEventListener("click", () => {
            this.resolve(false);
        });
        this.$("mistakes").addEventListener("click", async (event) => {
            if (event.target === this.$("mistakes")) return;
            let node = event.target;
            while (node.parentNode !== this.$("mistakes")) {
                node = node.parentNode;
            }
            const mistakeNode = node;
            const solutionsNode = mistakeNode.querySelector(".solutions");
            if (solutionsNode.children.length === 0) {
                const { name, mode, part } = mistakeNode.dataset;
                const solutions =
                    await dataManager.test.getSolutions(name, mode, part);
                const type = solutions.length === 1 ? "none" : "square";
                let solutionsHTML = "";
                for (const solution of solutions) {
                    solutionsHTML += `<li type="${type}">${solution}</li>`;
                }
                solutionsNode.innerHTML = solutionsHTML;
            }
            if (solutionsNode.isHidden()) {
                Velocity(solutionsNode, "slideDown", { duration: "fast" });
                mistakeNode.classList.add("open");
            } else {
                Velocity(solutionsNode, "slideUp", { duration: "fast" });
                mistakeNode.classList.remove("open");
            }
        });
        this.$("languages-ready-for-testing").callback = async (language) => {
            await main.setLanguage(language);
            this.resolve(true);
        };
        // Choosing a language using Ctrl+Tab (like in the main-window class)
        let choosingNextLanguage = false;
        window.addEventListener("keydown", (event) => {
            if (!this.opened) return;
            if (!this.moreLanguagesReady) return;
            if (!choosingNextLanguage && event.key === "Tab" && event.ctrlKey) {
                choosingNextLanguage = true;
                this.$("languages-ready-for-testing").open();
            }
            if (choosingNextLanguage && event.key === "Tab") {
                event.stopPropagation();
                event.preventDefault();
                if (event.shiftKey) {
                    this.$("languages-ready-for-testing").selectPreviousItem();
                } else {
                    this.$("languages-ready-for-testing").selectNextItem();
                }
            }
        }, true);
        window.addEventListener("keyup", (event) => {
            if (!this.opened) return;
            if (choosingNextLanguage && !event.ctrlKey) {
                choosingNextLanguage = false;
                this.$("languages-ready-for-testing").invokeSelectedItem();
                this.$("languages-ready-for-testing").close();
            }
        }, true);
    }

    open(testInfo) {
        this.testInfo = testInfo;
        this.$("items-total").textContent = testInfo.numFinished;
        this.$("percentage-correct").textContent =
            `${(100 * testInfo.numCorrect / testInfo.numFinished).toFixed()}%`;
        if (testInfo.vocabListMode) {
            this.$("score-gained-frame").hide();
        } else {
            this.$("score-gained-frame").show("flex");
            const sign = parseInt(testInfo.score) >= 0 ? "+" : "-";
            this.$("score-gained").textContent =
                `${sign} ${Math.abs(testInfo.score.toFixed(1))}`;
        }
        this.classList.toggle("no-mistakes", testInfo.mistakes.length === 0);
        const modeToText = {
            [dataManager.test.mode.WORDS]: "word",
            [dataManager.test.mode.KANJI_MEANINGS]: "kanji meaning",
            [dataManager.test.mode.KANJI_ON_YOMI]: "kanji on yomi",
            [dataManager.test.mode.KANJI_KUN_YOMI]: "kanji kun yomi",
            [dataManager.test.mode.HANZI_MEANINGS]: "hanzi meaning",
            [dataManager.test.mode.HANZI_READINGS]: "hanzi reading"
        };
        const partToText = {
            "meanings": "meaning",
            "readings": "reading",
            "solutions": ""
        };
        let numTotalParts = 0;
        for (const mode of dataManager.test.modes) {
            numTotalParts += dataManager.test.modeToParts(mode).length;
        }
        let mistakesHTML = "";
        for (const { name, mode, part } of testInfo.mistakes) {
            // Don't display name of mode/part if there's only one of them
            const modeLabel = numTotalParts === 1 ? "" :
              `<div class="mode">${modeToText[mode]} ${partToText[part]}</div>`;
            mistakesHTML += `
             <div data-name="${name}" data-mode="${mode}" data-part="${part}">
               <div class="mistake-info">
                 <div class="name">${name}</div>
                 ${modeLabel}
                 <div class="flex-spacer"></div>
                 <i class="fa caret"></i>
               </div>
               <ul class="solutions" style="display:none"></ul>
             </div>
            `;
        }
        this.$("mistakes").innerHTML = mistakesHTML;
        // Offer to start a new test for another language
        this.$("languages-ready-for-testing").clear();
        const promises = [];
        for (const language of dataManager.languages.visible) {
            promises.push(dataManager.srs.getTotalAmountDueFor(language)
            .then((amount) => ({ language, amount })));
        }
        this.moreLanguagesReady = false;
        Promise.all(promises).then((languageAndAmount) => {
            // Display languages with large amount of due items first
            languageAndAmount.sort((lA1, lA2) => lA2.amount - lA1.amount);
            let numLanguagesLeft = 0;
            for (const { language, amount } of languageAndAmount) {
                if (amount === 0) break;
                if (dataManager.currentLanguage === language) break;
                this.$("languages-ready-for-testing").add(language);
                this.$("languages-ready-for-testing").setAmountDue(language,
                                                                   amount);
                ++numLanguagesLeft;
            }
            this.$("languages-ready-for-testing").set("Choose a language");
            // Hide this frame if there are no languages with due items
            this.moreLanguagesReady = numLanguagesLeft > 0;
            this.$("start-new-test-frame").toggleDisplay(numLanguagesLeft > 0);
        });
        this.opened = true;
    }

    close() {
        this.$("mistakes").innerHTML = "";
        this.opened = false;
    }
}

customElements.define("test-complete-overlay", TestCompleteOverlay);
module.exports = TestCompleteOverlay;
