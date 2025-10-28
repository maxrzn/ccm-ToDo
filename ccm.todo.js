'use strict';

ccm.files['ccm.todo.js'] = {
    name: 'todo',
    ccm: '././libs/ccm/ccm.js',
    config: {},
    html: ['ccm.load', '././resources/templates.html'],


    Instance: function () {
        this.start = async() => {
            const data = 'Hallo';
            this.element.appendChild(this.ccm.helper.html(this.html.main, {test: data}));
        }
    }
}



