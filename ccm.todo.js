'use strict';

ccm.files['ccm.todo.js'] = {
    name: 'todo',
    ccm: '././libs/ccm/ccm.js',
    config: {
        data: {
            store: ['ccm.store', {
                local: {
                    notes: {                                //NOTE this lvl is this.data.key
                        key: 'notes',
                        title: 'Notizensammlung',
                        items: [
                            {
                                topic: 'Einkaufsliste',
                                content: 'Dies ist eine Einkaufsliste'
                            },
                            {
                                topic: 'Schulnoten',
                                content: 'Meine Schulnoten...'
                            },
                        ],
                    },
                },
            }],
            key: 'notes',
        },
    },
    html: ['ccm.load', '././resources/templates.html'],

    Instance: function () {
        this.start = async()=> {
            const data = await this.data.store.get(this.data.key);   //NOTE sucht nach value von key also 'notes'
            console.log(data, 'items', data.items, 'key', data.key);
            this.element.appendChild(this.ccm.helper.html(this.html.main, {test: data.key}));  //TODO this.html.main undefined
        }
    }
}



