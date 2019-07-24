"use strict";

class TestCompleteOverlay extends Overlay {
    constructor() {
        super("test-complete");
        this.opened = false;
        this.moreLanguagesReady = false;
        this.elementFocussedByDefault = this.$("ok-button");
        this.$("close-button").addEventListener("click", () => {
            this.resolve(null);
        });
        this.$("ok-button").addEventListener("click", () => {
            this.resolve(false);
        });
        this.$("languages-ready-for-testing").callback = async (language) => {
            await main.setLanguage(language);
            this.resolve(true);  // `true` signals that another test will start
        };

        // ==================================================================
        // Initialize view for displaying list of mistakes
        // ==================================================================
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
        const mistakeNodeTemplate = templates.get("test-complete-mistake");
        this.mistakesView = new View({
            viewElement: this.$("mistakes"),
            getData: () => this.mistakes,
            createViewItem: (mistake) => {
                const [name, mode, part] = mistake.split("\t");
                mistake = { name, mode, part };
                // Display name of mode/part if there's more than one of them
                if (this.numTotalParts > 1) mistake.modeLabel = 
                    `${modeToText[mode]} ${partToText[part]}`;
                return utility.fragmentFromString(mistakeNodeTemplate(mistake));
            },
            initialDisplayAmount: 15,
            displayAmount: 15,
            deterministic: false
        });

        // ==================================================================
        // Display solutions upon clicking a mistake
        // ==================================================================
        this.$("mistakes").addEventListener("click", async (event) => {
            if (event.target === this.$("mistakes")) return;
            let node = event.target;
            while (node.parentNode !== this.$("mistakes")) {
                node = node.parentNode;
            }

            // Load solutions if they're not loaded yet
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

            // Display or hide the list of solutions
            const list = this.$("mistakes");
            if (solutionsNode.isHidden()) {
                Velocity(solutionsNode, "slideDown", { duration: "fast",
                    // If solutions-container leaves viewPort, scroll list along
                    // NOTE: this requires container to be positioned non-static
                    progress: () => {
                        const nodeOffset = solutionsNode.offsetTop +
                                           solutionsNode.offsetHeight;
                        if (nodeOffset > list.scrollTop + list.offsetHeight) {
                            list.scrollTop = nodeOffset - list.offsetHeight;
                        }
                    }
                });
                mistakeNode.classList.add("open");
            } else {
                Velocity(solutionsNode, "slideUp", { duration: "fast" });
                mistakeNode.classList.remove("open");
            }
        });

        // ==================================================================
        // Choose a language using Ctrl+Tab (like in the main-window class)
        // ==================================================================
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
        this.opened = true;
        this.mistakes = Array.from(testInfo.mistakes);
        this.classList.toggle("no-mistakes", this.mistakes.length === 0);
        this.mistakesView.load();

        // Fill in statistics
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

        // Calculate total number of submodes for this language
        this.numTotalParts = 0;
        for (const mode of dataManager.test.modes) {
            this.numTotalParts += dataManager.test.modeToParts(mode).length;
        }
        
        if (testInfo.vocabListMode) {
            this.$("start-new-test-frame").hide();
            return;
        }

        // Display sorted list of languages that have items ready for review
        this.moreLanguagesReady = false;
        this.$("languages-ready-for-testing").clear();
        const languageAndAmount = Object.entries(main.srsItemAmountsDueTotal);
        languageAndAmount.sort(([,amount1], [,amount2]) => amount2 - amount1);
        for (const [ language, amount ] of languageAndAmount) {
            if (amount === 0) break;
            if (dataManager.currentLanguage === language) continue;
            this.$("languages-ready-for-testing").add(language);
            this.$("languages-ready-for-testing").setAmountDue(language,amount);
            this.moreLanguagesReady = true;
        }
        this.$("languages-ready-for-testing").set("Choose a language");
        this.$("start-new-test-frame").toggleDisplay(this.moreLanguagesReady);
    }

    close() {
        this.opened = false;
    }
}

customElements.define("test-complete-overlay", TestCompleteOverlay);
module.exports = TestCompleteOverlay;
