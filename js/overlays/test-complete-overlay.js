"use strict";

class TestCompleteOverlay extends Overlay {
    constructor() {
        super("test-complete");
        this.$("close-button").addEventListener("click", () => {
            this.resolve();
        });
        this.$("ok-button").addEventListener("click", () => {
            this.resolve();
        });
        this.$("mistakes").addEventListener("click", (event) => {
            if (event.target === this.$("mistakes")) return;
            let node = event.target;
            while (node.parentNode !== this.$("mistakes")) {
                node = node.parentNode;
            }
            const mistakeNode = node;
            const solutionsNode = mistakeNode.querySelector(".solutions");
            if (solutionsNode.children.length === 0) {
                const { name, mode, part } = mistakeNode.dataset;
                dataManager.test.getSolutions(name, mode, part)
                .then((solutions) => {
                    const type = solutions.length === 1 ? "none" : "square";
                    let solutionsHTML = "";
                    for (const solution of solutions) {
                        solutionsHTML += `<li type="${type}">${solution}</li>`;
                    }
                    solutionsNode.innerHTML = solutionsHTML;
                });
            }
            if (solutionsNode.isHidden()) {
                solutionsNode.show();
                mistakeNode.classList.add("open");
            } else {
                solutionsNode.hide();
                mistakeNode.classList.remove("open");
            }
        });
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
            [dataManager.test.mode.KANJI_KUN_YOMI]: "kanji kun yomi"
        };
        const partToText = {
            "meanings": "meaning",
            "readings": "reading",
            "solutions": ""
        };
        let mistakesHTML = "";
        for (const { name, mode, part } of testInfo.mistakes) {
            mistakesHTML += `
             <div data-name="${name}" data-mode="${mode}" data-part="${part}">
               <div class="mistake-info">
                 <div class="name">${name}</div>
                 <div class="mode">${modeToText[mode]} ${partToText[part]}</div>
                 <div class="flex-spacer"></div>
                 <i class="fa caret"></i>
               </div>
               <ul class="solutions" style="display:none"></ul>
             </div>
            `;
        }
        this.$("mistakes").innerHTML = mistakesHTML;
    }

    close() {
        this.$("mistakes").innerHTML = "";
    }
}

customElements.define("test-complete-overlay", TestCompleteOverlay);
module.exports = TestCompleteOverlay;
