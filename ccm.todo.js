'use strict';

ccm.files['ccm.todo.js'] = {
    name: 'todo',
    ccm: '././libs/ccm/ccm.js',
    config: {
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
            //append main areas
            const main = this.ccm.helper.html(this.html.main);
            this.element.innerHTML = "";
            this.element.appendChild((this.ccm.helper.html(this.html.header, {userId: userId})));
            this.element.appendChild(main);
            main.appendChild(this.ccm.helper.html(this.html.catArea));
            main.appendChild(this.ccm.helper.html(this.html.taskArea));

            const userCats = await this.cat.get({ownerId: userId}); //check for existing categories
            if(!userCats.length) {
                await this.cat.set({    //create Default category
                    title: "default",
                    ownerId : userId,
                    members : []
                });
            } else {
                await this.showTasks();
            }

            //open new Task creation
            const newTaskButton = this.element.querySelector("#newTaskButton");
            const newTaskBox = this.element.querySelector('#newTaskBox');
            newTaskButton.addEventListener("click", () => {
                newTaskButton.disabled = true;
                newTaskBox.classList.remove("hidden");
                newTaskBox.querySelector("#taskContent").focus();
            });

            //create new Task
            const createTaskButton = this.element.querySelector("#createTaskButton");
            const inputFields = this.element.querySelectorAll("#newTaskBox input");
            inputFields.forEach((input) => {
                input.addEventListener("keypress", (e) => {
                    if (e.key==='Enter') createTaskButton.click();
                });
            });
            createTaskButton.addEventListener("click", async() => {
                await this.task.set({
                    content: this.element.querySelector("#taskContent").value,
                    deadline: this.element.querySelector("#taskDeadline").value,
                    points: this.element.querySelector("#taskPoints").value,
                    status: "open",
                    categoryId: "default", //TODO dynamically set category
                    userId: userId
                });
                newTaskBox.classList.add("hidden");
                newTaskButton.disabled = false;
                this.clearInputs();
                //show updated Tasklist
                await this.showTasks();
                const tasks = await this.task.get();
                console.log("TaskList");
                tasks.forEach((element) => {
                    console.log(element);
                })
            });

            //cancel Task creation
            const cancelTaskButton = this.element.querySelector('#cancelTaskButton');
            cancelTaskButton.addEventListener("click", () => {
              newTaskBox.classList.add("hidden");
              newTaskButton.disabled = false;
              this.clearInputs();
            });

        }
        /**
         * iterates through tasks list, shows open tasks and completed task
         * @returns {Promise<void>}
         */
        this.showTasks = async() => {
            const tasks = await this.task.get();
            const noTaskInfo = this.element.querySelector("#noTaskInfo");
            if(tasks.length) {
                if(noTaskInfo.classList.length === 0) {
                    noTaskInfo.classList.add("hidden");
                }
                const taskList = this.element.querySelector("#taskList");
                const taskHistory = this.element.querySelector("#taskHistory");
                taskList.innerHTML = "";
                tasks.forEach((task) => {
                    if(task.status==="open") {
                        const taskel = this.ccm.helper.html(this.html.task, {taskContent: task.content, taskPoints: task.points, taskDeadline: task.deadline });
                        taskel.setAttribute("id", task.key);
                        taskel.querySelector(".deleteTaskButton").addEventListener("click", async (e) => {
                            const taskDiv = e.target.closest("div[id]");
                            taskDiv.remove();
                            this.task.del(taskDiv.getAttribute("id"));
                        });
                        taskList.appendChild(taskel);
                    } else {
                        const taskel = this.ccm.helper.html(this.html.completedTask, {completedContent: task.content, points: task.points, completedDate:  new Date().toLocaleDateString("de-DE")});
                        //TODO hier weitermachen (append, eventuell task id zur div setzen)
                    }

                })
            } else {
                noTaskInfo.classList.remove("hidden");
            }
        }

        this.clearInputs = () => {
            const input = this.element.querySelectorAll("input");
            input.forEach((i) => {
                i.value = "";
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



