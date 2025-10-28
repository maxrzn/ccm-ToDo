'use strict';

ccm.files['ccm.todo.js'] = {
    name: 'todo',
    ccm: '././libs/ccm/ccm.js',
    config: {   //NOTE this. ...
        data: {
            store: ['ccm.store', {
                local: {
                    notes: {
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
        html: ['ccm.load', '././resources/templates.html'],
    },


    Instance: function () {
        this.ready = async() => {
            console.log('Dependencies loaded:', this.html);
        }
        this.start = async()=> {
            const data = await this.data.store.get(this.data.key);   //NOTE get sucht nach value von key also 'notes' innerhalb von data
            console.log(data, 'items', data.items, 'key', data.key);
            this.element.innerHTML = '';
            this.element.appendChild(this.ccm.helper.html(this.html.main, {test: data.key}));
        }
    }
}



