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
            main.appendChild(this.ccm.helper.html(this.html.taskArea, {title : "Meine Aufgaben"}));

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
            //show categories
            await this.showCategories();

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
                const newTask = await this.task.set({
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
                this.insertOpenTask(await this.task.get(newTask))
            });

            //cancel Task creation
            const cancelTaskButton = this.element.querySelector('#cancelTaskButton');
            cancelTaskButton.addEventListener("click", () => {
              newTaskBox.classList.add("hidden");
              newTaskButton.disabled = false;
              this.clearInputs();
            });

            //clear history Button
            const clearHistoryButton = this.element.querySelector("#clearHistoryButton");
            clearHistoryButton.addEventListener("click", async() =>  await this.deleteAllTasks("closed"));

        }
        this.showCategories = async() => {
            const cats = await this.cat.get({ownerId: userId});
            const categoryList = this.element.querySelector("#categoryList");

            for (const cat of cats) {
                const taskCount = (await this.task.get({categoryId : cat.title, status:"open"})).length;
                categoryList.append(this.ccm.helper.html(this.html.category, {title:cat.title, taskCount:taskCount }));
            }
        }
        /**
         * iterates through tasks list, shows open tasks and completed task
         * @returns {Promise<void>}
         */
        this.showTasks = async() => {
            const tasks = await this.task.get();
            if(tasks.length) {
                this.element.querySelector("#taskList").innerHTML = "";
                this.element.querySelector("#taskHistory").innerHTML = "";
                tasks.forEach((task) => {
                    if(task.status==="open") {
                        this.insertOpenTask(task);
                    } else {
                        this.insertCompletedTask(task);
                    }
                });
            }
            this.updateHistoryVisibility();
            this.updateNoTaskInfo();
        }
        /**
         * inserts completed task into taskList div
         * @param task task object
         */
        this.insertOpenTask = (task) => {
            const taskList = this.element.querySelector("#taskList");
            const taskDeadline = task.deadline ? new Date(task.deadline).toLocaleDateString("De-de") : "";
            const taskel = this.ccm.helper.html(this.html.task, {
                taskContent: task.content,
                taskPoints: task.points ?? "",
                taskDeadline: taskDeadline
            });
            taskel.setAttribute("id", task.key);
            //deleteTask Button
            taskel.querySelector(".deleteTaskButton").addEventListener("click", async (e) => {
                const taskDiv = e.target.closest("div[id]");
                taskDiv.remove();
                this.task.del(taskDiv.getAttribute("id"));
                this.updateNoTaskInfo();
                //TODO trigger tasklist refresh for other participants if needed
            });
            //completeTask Button
            taskel.querySelector(".completeTaskButton").addEventListener("click", async (e) => {
                const taskHistory = this.element.querySelector("#taskHistory");
                const taskDiv = e.target.closest("div[id]");
                taskDiv.remove();
                const taskKey = taskDiv.getAttribute("id");
                this.task.set({key : taskKey, status : 'closed' });
                this.insertCompletedTask(await this.task.get(taskKey));
                this.updateNoTaskInfo();
                this.updateHistoryVisibility();
                //TODO trigger tasklist refresh for other participants if needed
            })
            taskList.prepend(taskel);
            this.updateNoTaskInfo();
        }
        /**
         * inserts completed task as first Child of taskHistory div
         * @param task task object
         */
        this.insertCompletedTask = (task) => {
            const taskHistory = this.element.querySelector("#taskHistory");
            taskHistory.classList.toggle("hidden", false);
            const points = task.points ? "+" + task.points + " Punkte" : "";
            const taskel = this.ccm.helper.html(this.html.completedTask, {
                completedContent: task.content,
                points: points,
                completedDate:  new Date().toLocaleDateString("de-DE")
            });
            taskel.setAttribute("id", task.key);
            taskHistory.prepend(taskel);
        }

        this.updateNoTaskInfo = () => {
            const noTaskInfo = this.element.querySelector("#noTaskInfo");
            const taskList = this.element.querySelector("#taskList");
            noTaskInfo.classList.toggle("hidden", taskList.hasChildNodes());
        }

        this.updateHistoryVisibility = () => {
            const history = this.element.querySelector("#historyArea");
            const t = this.element.querySelectorAll("#taskHistory .taskHistory-row");
            if (!history) return;
            history.classList.toggle("hidden", t.length === 0);
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
        this.deleteAllTasks = async(status) => {
            const tasks = await this.task.get({status : status});
            tasks.forEach(element => {
                this.task.del(element.key);
                console.log("Task: " + element.key + " wurde ausradiert!");
            });
            if(status === "closed") {
                const t = this.element.querySelectorAll("#taskHistory .taskHistory-row");
                t.forEach((t) => t.remove());
                this.updateHistoryVisibility();
            }
        }
    }
}



