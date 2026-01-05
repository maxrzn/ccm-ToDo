'use strict';

ccm.files['ccm.todo.js'] = {
    name: 'todo',
    ccm: '././libs/ccm/ccm.js',
    config: {   //NOTE this. ...
        cat: ['ccm.store', {
            name: "mziege2s_categories",
            url: "https://ccm2.inf.h-brs.de"
        }],
        task: ['ccm.store', {
            name: "mziege2s_tasks",
            url: "https://ccm2.inf.h-brs.de"
        }],
        /*key: 'notes',*/
        html: ['ccm.load', '././resources/templates.html'],
    },


    Instance: function () {
        /*this.ready = async() => {
            console.log('Dependencies loaded:', this.html);
        }*/
        this.start = async()=> {
            await this.cat.set({
                "key": "default",
                "title": "Bachelorarbeit"
            });
            const cats = await this.cat.get();
           /* await this.cat.del("default");*/
            cats.forEach((element) => {
                console.log(element);
            });
            await this.task.set({
                key: "1",
                content: "Komponente implementieren",
                deadline: "2026-01-20",
                points: 10,
                status: "open",
                categoryId: "default",
                userId: "mziege2s"
            })

            /*const data = await this.data.cat.get(this.data.key);   //NOTE get sucht nach value von key also 'notes' innerhalb von data
            console.log(data, 'items', data.items, 'key', data.key);
            this.element.innerHTML = '';
            this.element.appendChild(this.ccm.helper.html(this.html.main, {test: data.key}));*/
        }
    }
}



