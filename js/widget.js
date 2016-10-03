"use strict";

class Widget extends Component {
    constructor(name, hasHtmlFile=false, fontAwesome=false) {
        super(name, fontAwesome);
        if (hasHtmlFile) {
            this.root.appendChild(
                    utility.parseHtmlFile(paths.html.widget(name)));
        }
    }
}

module.exports = Widget;
