"use strict";

class SrsStatusDiagram extends PinwallWidget {
    constructor() {
        super("srs-status-diagram", "SRS status diagram");
        this.srsTable = this.root.getElementById("srs-counts");
    }
    createSrsTable() {
        let innerHTML =
             "<tr><td><i id='reload-srs' class='fa fa-refresh'></i></td>";
        const modeNames = {
            "WORDS": "Words",
            "KANJI_MEANINGS": "Kanji<br>Meanings</br>",
            "KANJI_ON_YOMI": "Kanji<br>On Yomi</br>",
            "KANJI_KUN_YOMI": "Kanji<br>Kun Yomi</br>"
        };
        for (let mode of dataManager.test.modes)
            innerHTML += `<td>${modeNames[mode]}</td>`;
        this.srsTable.innerHTML = innerHTML + "</tr>";
        const numLevels =
            dataManager.languageSettings["SRS"]["spacing"].length - 1;
        for (let i = 1; i < numLevels + 1; ++i) {
            const row = document.createElement("tr");
            for (let j = 0; j < dataManager.test.modes.length + 1; ++j) {
                const data = document.createElement("td");
                if (j === 0) data.textContent = `Level ${i}`;
                row.appendChild(data);
            }
            this.srsTable.appendChild(row);
        }
        const reloadSrsButton = this.root.getElementById("reload-srs");
        reloadSrsButton.addEventListener("click", () => this.fillSrsTable());
    }
    fillSrsTable() {
        // TODO: Check if amount of levels changed and adapt accordingly
        const numLevels = dataManager.languageSettings["SRS"]["spacing"].length;
        const modes = dataManager.test.modes;
        dataManager.srs.getAmountsScheduled().then((counts) => {
            for (let level = 1; level < numLevels; ++level) {
                const columns = this.srsTable.children[level].children;
                for (let i = 0; i < modes.length; ++i) {
                    const count = counts[modes[i]][level].count;
                    const scheduled = counts[modes[i]][level].scheduled;
                    const label = columns[i + 1];
                    label.textContent = `${count} (+${scheduled})`;
                    if (count > 0) {
                        label.style.backgroundColor = "crimson";
                        label.style.color = "whitesmoke";
                    } else {
                        label.style.backgroundColor = "transparent";
                        label.style.color = "#303030";
                    }
                }
            }
        });
        main.updateTestButton();
    }
    open() {
        this.fillSrsTable();
    }
    adjustToLanguage(language, secondary) {
        this.createSrsTable();
        this.fillSrsTable();
    }
}

customElements.define("srs-status-diagram", SrsStatusDiagram);
module.exports = SrsStatusDiagram;
