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
        html: ['ccm.load', '././resources/templates.html'],
        css: ['ccm.load', '././resources/styles.css']
    },


    Instance: function () {
        const userId = "testuser";

        this.start = async()=> {
            const userCats = await this.cat.get({ownerId: userId}); //check for existing categories
            if(!userCats.length) {
                await this.cat.set({    //create Default category
                    title: "default",
                    ownerId : userId,
                    members : []
                });
            }
            const cats = await this.cat.get();
            cats.forEach((element) => {
                console.log(element);
            });
            /*await this.task.set({
                key: "1",
                content: "Komponente implementieren",
                deadline: "2026-01-20",
                points: 10,
                status: "open",
                categoryId: "default",
                userId: userId
            })*/

            const main = this.ccm.helper.html(this.html.main);

            this.element.innerHTML = "";
            this.element.appendChild((this.ccm.helper.html(this.html.header, {userId: userId})));
            this.element.appendChild(main);

            main.appendChild(this.ccm.helper.html(this.html.catArea));
            main.appendChild(this.ccm.helper.html(this.html.taskArea));

            //open new Task creation
            const newTaskButton = this.element.querySelector("#newTaskButton");
            const newTaskBox = this.element.querySelector('#newTaskBox');
            newTaskButton.addEventListener("click", () => {
                newTaskButton.disabled = true;
                newTaskBox.classList.remove("hidden");
            });

            //create new Task


            //cancel Task creation
            const cancelTaskButton = this.element.querySelector('#cancelTask');
            cancelTaskButton.addEventListener("click", () => {
              newTaskBox.classList.add("hidden");
              newTaskButton.disabled = false;
            });

        }
        this.deleteAllCategories = async() => {
            const cats = await this.cat.get();
            cats.forEach((element) => {
                this.cat.del(element.key);
                console.log("Category: " + element.key + " wurde ausradiert!");
            });
        }
        this.deleteAllTasks = async() => {
            const tasks = await this.task.get();
            tasks.forEach(element => {
                this.task.del(element.key);
                console.log("Task: " + element.key + " wurde ausradiert!");
            });
        }
    }
}



